import { Router } from 'express'
import Admin from '../models/Admin.js'
import RefreshToken from '../models/RefreshToken.js'
import RevokedAccessToken from '../models/RevokedAccessToken.js'
import Teacher from '../models/Teacher.js'
import { requireAuth } from '../middleware/authMiddleware.js'
import {
  generateOpaqueToken,
  getRefreshTokenExpiryDate,
  getRefreshTokenTtlSeconds,
  hashOpaqueToken,
  signToken,
  verifyToken,
  verifyPassword,
} from '../utils/auth.js'
import { buildCollegeScope, getDefaultCollegeId } from '../utils/tenant.js'

const router = Router()
const loginLockMaxAttempts = Number(process.env.LOGIN_LOCK_MAX_ATTEMPTS || 5)
const loginLockMinutes = Number(process.env.LOGIN_LOCK_MINUTES || 15)
const effectiveLoginLockMaxAttempts = Number.isFinite(loginLockMaxAttempts) && loginLockMaxAttempts > 0
  ? loginLockMaxAttempts
  : 5
const effectiveLoginLockMinutes = Number.isFinite(loginLockMinutes) && loginLockMinutes > 0
  ? loginLockMinutes
  : 15

const refreshCookieName =
  (typeof process.env.REFRESH_TOKEN_COOKIE_NAME === 'string'
    ? process.env.REFRESH_TOKEN_COOKIE_NAME.trim()
    : '') || 'refreshToken'
const refreshCookiePath = '/api/auth'
const refreshCookieMaxAgeMs = getRefreshTokenTtlSeconds() * 1000
const nodeEnv = (process.env.NODE_ENV || 'development').trim().toLowerCase()
const isProduction = nodeEnv === 'production'

const asTrimmedString = (value) =>
  typeof value === 'string' ? value.trim() : ''

const normalizeLoginInput = (payload = {}) => {
  return {
    email: asTrimmedString(payload.email).toLowerCase(),
    password: asTrimmedString(payload.password),
  }
}

const parseCookieHeader = (cookieHeader) => {
  if (typeof cookieHeader !== 'string' || !cookieHeader.trim()) {
    return {}
  }

  return cookieHeader.split(';').reduce((acc, part) => {
    const [name = '', ...rest] = part.split('=')
    const key = name.trim()
    if (!key) {
      return acc
    }
    acc[key] = decodeURIComponent(rest.join('=').trim())
    return acc
  }, {})
}

const getRefreshTokenFromRequest = (req) => {
  const cookies = parseCookieHeader(req.headers.cookie)
  const fromCookie = asTrimmedString(cookies[refreshCookieName])
  if (fromCookie) {
    return fromCookie
  }
  return asTrimmedString(req.body?.refreshToken)
}

const getBearerToken = (authorizationHeader) => {
  if (typeof authorizationHeader !== 'string') return ''
  const [scheme, token] = authorizationHeader.split(' ')
  if (scheme !== 'Bearer' || !token) return ''
  return token.trim()
}

const sanitizeTeacher = (teacherDoc) => {
  return {
    _id: String(teacherDoc._id),
    collegeId: teacherDoc.collegeId || getDefaultCollegeId(),
    name: teacherDoc.name || '',
    email: teacherDoc.email || '',
    phone: teacherDoc.phone || '',
  }
}

const sanitizeAdmin = (adminDoc) => {
  return {
    _id: String(adminDoc._id),
    collegeId: adminDoc.collegeId || getDefaultCollegeId(),
    name: adminDoc.name || 'Administrator',
    email: adminDoc.email || '',
  }
}

const logSuccessfulLogin = (role, user) => {
  // eslint-disable-next-line no-console
  console.log(
    `[auth] login success role=${role} id=${user._id} email=${user.email} at=${new Date().toISOString()}`,
  )
}

const setRefreshTokenCookie = (res, refreshToken) => {
  res.cookie(refreshCookieName, refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    maxAge: refreshCookieMaxAgeMs,
    path: refreshCookiePath,
  })
}

const clearRefreshTokenCookie = (res) => {
  res.clearCookie(refreshCookieName, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    path: refreshCookiePath,
  })
}

const issueSessionTokens = async ({ role, user, req, res }) => {
  const payload = {
    id: user._id,
    role,
    name: user.name,
    email: user.email,
    collegeId: user.collegeId,
  }
  const accessToken = signToken(payload)
  const refreshToken = generateOpaqueToken()
  const refreshTokenHash = hashOpaqueToken(refreshToken)

  await RefreshToken.create({
    collegeId: user.collegeId,
    userId: user._id,
    userRole: role,
    tokenHash: refreshTokenHash,
    expiresAt: getRefreshTokenExpiryDate(),
    createdByIp: asTrimmedString(req.ip),
    createdByUserAgent: asTrimmedString(req.get('user-agent')),
  })

  setRefreshTokenCookie(res, refreshToken)

  return {
    token: accessToken,
    accessToken,
    user: {
      id: user._id,
      role,
      name: user.name,
      email: user.email,
      collegeId: user.collegeId,
    },
  }
}

const rotateRefreshToken = async ({ existingRefreshToken, req, res }) => {
  const userModel = existingRefreshToken.userRole === 'admin' ? Admin : Teacher
  const user = await userModel.findOne({
    _id: existingRefreshToken.userId,
    ...buildCollegeScope(existingRefreshToken.collegeId),
  }).lean()

  if (!user) {
    await RefreshToken.updateOne(
      { _id: existingRefreshToken._id },
      { $set: { revokedAt: new Date(), revokeReason: 'user_not_found' } },
    )
    return null
  }

  const safeUser = existingRefreshToken.userRole === 'admin' ? sanitizeAdmin(user) : sanitizeTeacher(user)

  const newRefreshToken = generateOpaqueToken()
  const newRefreshTokenHash = hashOpaqueToken(newRefreshToken)

  await RefreshToken.create({
    collegeId: safeUser.collegeId,
    userId: safeUser._id,
    userRole: existingRefreshToken.userRole,
    tokenHash: newRefreshTokenHash,
    expiresAt: getRefreshTokenExpiryDate(),
    createdByIp: asTrimmedString(req.ip),
    createdByUserAgent: asTrimmedString(req.get('user-agent')),
  })

  const revokeResult = await RefreshToken.updateOne(
    { _id: existingRefreshToken._id, revokedAt: null },
    {
      $set: {
        revokedAt: new Date(),
        revokeReason: 'rotated',
        replacedByTokenHash: newRefreshTokenHash,
      },
    },
  )

  if (!revokeResult.modifiedCount) {
    await RefreshToken.deleteOne({ tokenHash: newRefreshTokenHash })
    return null
  }

  setRefreshTokenCookie(res, newRefreshToken)

  const accessToken = signToken({
    id: safeUser._id,
    role: existingRefreshToken.userRole,
    name: safeUser.name,
    email: safeUser.email,
    collegeId: safeUser.collegeId,
  })

  return {
    token: accessToken,
    accessToken,
    user: {
      id: safeUser._id,
      role: existingRefreshToken.userRole,
      name: safeUser.name,
      email: safeUser.email,
      collegeId: safeUser.collegeId,
    },
  }
}

const isAccountLocked = (user) => {
  if (!user?.lockUntil) {
    return false
  }
  return new Date(user.lockUntil).getTime() > Date.now()
}

const clearLoginProtectionState = async (Model, user) => {
  if (!user?._id) {
    return
  }
  if (!user.failedLoginAttempts && !user.lockUntil) {
    return
  }
  await Model.updateOne(
    { _id: user._id },
    { $set: { failedLoginAttempts: 0, lockUntil: null } },
  )
}

const recordFailedLoginAttempt = async (Model, user) => {
  const nextAttemptCount = Number(user?.failedLoginAttempts || 0) + 1
  if (nextAttemptCount >= effectiveLoginLockMaxAttempts) {
    await Model.updateOne(
      { _id: user._id },
      {
        $set: {
          failedLoginAttempts: 0,
          lockUntil: new Date(Date.now() + effectiveLoginLockMinutes * 60 * 1000),
        },
      },
    )
    return { locked: true }
  }

  await Model.updateOne(
    { _id: user._id },
    {
      $set: {
        failedLoginAttempts: nextAttemptCount,
        lockUntil: null,
      },
    },
  )

  return { locked: false }
}

const ensureExpiredLockCleared = async (Model, user) => {
  if (!user?.lockUntil) {
    return
  }
  if (new Date(user.lockUntil).getTime() > Date.now()) {
    return
  }
  await clearLoginProtectionState(Model, user)
}

router.post('/login', async (req, res) => {
  try {
    const credentials = normalizeLoginInput(req.body)
    const collegeId = asTrimmedString(req.body?.collegeId) || getDefaultCollegeId()
    if (!credentials.email) {
      return res.status(400).json({ message: 'Email is required' })
    }
    if (!credentials.password) {
      return res.status(400).json({ message: 'Password is required' })
    }

    const admin = await Admin.findOne({
      email: credentials.email,
      ...buildCollegeScope(collegeId),
    })
      .select('+passwordHash')
      .lean()
    if (admin?.passwordHash) {
      await ensureExpiredLockCleared(Admin, admin)
      if (isAccountLocked(admin)) {
        return res.status(423).json({ message: 'Account is locked. Try again later.' })
      }

      const passwordMatches = verifyPassword(credentials.password, admin.passwordHash)
      if (!passwordMatches) {
        const failedAttemptResult = await recordFailedLoginAttempt(Admin, admin)
        if (failedAttemptResult.locked) {
          return res.status(423).json({ message: 'Account is locked. Try again later.' })
        }
        return res.status(401).json({ message: 'Invalid email or password' })
      }

      await clearLoginProtectionState(Admin, admin)
      const safeAdmin = sanitizeAdmin(admin)
      const session = await issueSessionTokens({ role: 'admin', user: safeAdmin, req, res })
      logSuccessfulLogin('admin', safeAdmin)

      return res.json({ data: session })
    }

    const teacher = await Teacher.findOne({
      email: credentials.email,
      ...buildCollegeScope(collegeId),
    })
      .select('+passwordHash')
      .lean()
    if (teacher?.passwordHash) {
      await ensureExpiredLockCleared(Teacher, teacher)
      if (isAccountLocked(teacher)) {
        return res.status(423).json({ message: 'Account is locked. Try again later.' })
      }

      const passwordMatches = verifyPassword(credentials.password, teacher.passwordHash)
      if (!passwordMatches) {
        const failedAttemptResult = await recordFailedLoginAttempt(Teacher, teacher)
        if (failedAttemptResult.locked) {
          return res.status(423).json({ message: 'Account is locked. Try again later.' })
        }
        return res.status(401).json({ message: 'Invalid email or password' })
      }

      await clearLoginProtectionState(Teacher, teacher)
      const safeTeacher = sanitizeTeacher(teacher)
      const session = await issueSessionTokens({ role: 'teacher', user: safeTeacher, req, res })
      logSuccessfulLogin('teacher', safeTeacher)

      return res.json({ data: session })
    }

    return res.status(401).json({ message: 'Invalid email or password' })
  } catch (_error) {
    return res.status(500).json({ message: 'Failed to login' })
  }
})

router.post('/refresh', async (req, res) => {
  try {
    const refreshToken = getRefreshTokenFromRequest(req)
    if (!refreshToken) {
      return res.status(401).json({ message: 'Refresh token is required' })
    }

    const refreshTokenHash = hashOpaqueToken(refreshToken)
    const existingRefreshToken = await RefreshToken.findOne({ tokenHash: refreshTokenHash }).lean()

    if (!existingRefreshToken) {
      clearRefreshTokenCookie(res)
      return res.status(401).json({ message: 'Invalid refresh token' })
    }

    const hasExpired = new Date(existingRefreshToken.expiresAt).getTime() <= Date.now()
    const isRevoked = Boolean(existingRefreshToken.revokedAt)
    if (hasExpired || isRevoked) {
      await RefreshToken.updateMany(
        {
          collegeId: existingRefreshToken.collegeId,
          userId: existingRefreshToken.userId,
          userRole: existingRefreshToken.userRole,
          revokedAt: null,
        },
        {
          $set: {
            revokedAt: new Date(),
            revokeReason: 'refresh_reuse_or_expired',
          },
        },
      )
      clearRefreshTokenCookie(res)
      return res.status(401).json({ message: 'Refresh token is invalid' })
    }

    const session = await rotateRefreshToken({ existingRefreshToken, req, res })
    if (!session) {
      clearRefreshTokenCookie(res)
      return res.status(401).json({ message: 'Session refresh failed' })
    }

    return res.json({ data: session })
  } catch (_error) {
    return res.status(500).json({ message: 'Failed to refresh session' })
  }
})

router.post('/logout', async (req, res) => {
  try {
    const refreshToken = getRefreshTokenFromRequest(req)
    if (refreshToken) {
      await RefreshToken.updateOne(
        { tokenHash: hashOpaqueToken(refreshToken), revokedAt: null },
        { $set: { revokedAt: new Date(), revokeReason: 'logout' } },
      )
    }

    const bearerToken = getBearerToken(req.headers.authorization)
    if (bearerToken) {
      try {
        const payload = verifyToken(bearerToken)
        const expiresAt = new Date(Number(payload.exp || 0) * 1000)
        if (Number.isFinite(expiresAt.getTime()) && expiresAt.getTime() > Date.now()) {
          await RevokedAccessToken.updateOne(
            { tokenHash: hashOpaqueToken(bearerToken) },
            {
              $set: {
                expiresAt,
                reason: 'logout',
              },
            },
            { upsert: true },
          )
        }
      } catch (_error) {
        // Ignore invalid/expired access token on logout.
      }
    }

    clearRefreshTokenCookie(res)
    return res.json({ message: 'Logged out successfully' })
  } catch (_error) {
    return res.status(500).json({ message: 'Failed to logout' })
  }
})

router.get('/me', requireAuth, async (req, res) => {
  if (req.user.role === 'admin') {
    const admin = await Admin.findOne({
      _id: req.user.id,
      ...buildCollegeScope(req.user.collegeId),
    }).lean()
    if (!admin) {
      return res.status(401).json({ message: 'User not found' })
    }

    const safeAdmin = sanitizeAdmin(admin)
    return res.json({
      data: {
        id: safeAdmin._id,
        role: 'admin',
        name: safeAdmin.name,
        email: safeAdmin.email,
        collegeId: safeAdmin.collegeId,
      },
    })
  }

  const teacher = await Teacher.findOne({
    _id: req.user.id,
    ...buildCollegeScope(req.user.collegeId),
  }).lean()
  if (!teacher) {
    return res.status(401).json({ message: 'User not found' })
  }

  const safeTeacher = sanitizeTeacher(teacher)
  return res.json({
    data: {
      id: safeTeacher._id,
      role: 'teacher',
      name: safeTeacher.name,
      email: safeTeacher.email,
      collegeId: safeTeacher.collegeId,
    },
  })
})

export default router
