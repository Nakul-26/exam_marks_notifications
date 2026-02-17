import { Router } from 'express'
import Admin from '../models/Admin.js'
import Teacher from '../models/Teacher.js'
import { requireAuth } from '../middleware/authMiddleware.js'
import { signToken, verifyPassword } from '../utils/auth.js'

const router = Router()

const asTrimmedString = (value) =>
  typeof value === 'string' ? value.trim() : ''

const normalizeLoginInput = (payload = {}) => {
  return {
    email: asTrimmedString(payload.email).toLowerCase(),
    password: asTrimmedString(payload.password),
  }
}

const sanitizeTeacher = (teacherDoc) => {
  return {
    _id: String(teacherDoc._id),
    name: teacherDoc.name || '',
    email: teacherDoc.email || '',
    phone: teacherDoc.phone || '',
  }
}

const sanitizeAdmin = (adminDoc) => {
  return {
    _id: String(adminDoc._id),
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

router.post('/login', async (req, res) => {
  try {
    const credentials = normalizeLoginInput(req.body)
    if (!credentials.email) {
      return res.status(400).json({ message: 'Email is required' })
    }
    if (!credentials.password) {
      return res.status(400).json({ message: 'Password is required' })
    }

    const admin = await Admin.findOne({ email: credentials.email })
      .select('+passwordHash')
      .lean()
    if (admin?.passwordHash) {
      const passwordMatches = verifyPassword(credentials.password, admin.passwordHash)
      if (!passwordMatches) {
        return res.status(401).json({ message: 'Invalid email or password' })
      }

      const safeAdmin = sanitizeAdmin(admin)
      const token = signToken({
        id: safeAdmin._id,
        role: 'admin',
        name: safeAdmin.name,
        email: safeAdmin.email,
      })
      logSuccessfulLogin('admin', safeAdmin)

      return res.json({
        data: {
          token,
          user: {
            id: safeAdmin._id,
            role: 'admin',
            name: safeAdmin.name,
            email: safeAdmin.email,
          },
        },
      })
    }

    const teacher = await Teacher.findOne({ email: credentials.email })
      .select('+passwordHash')
      .lean()
    if (teacher?.passwordHash) {
      const passwordMatches = verifyPassword(credentials.password, teacher.passwordHash)
      if (!passwordMatches) {
        return res.status(401).json({ message: 'Invalid email or password' })
      }

      const safeTeacher = sanitizeTeacher(teacher)
      const token = signToken({
        id: safeTeacher._id,
        role: 'teacher',
        name: safeTeacher.name,
        email: safeTeacher.email,
      })
      logSuccessfulLogin('teacher', safeTeacher)

      return res.json({
        data: {
          token,
          user: {
            id: safeTeacher._id,
            role: 'teacher',
            name: safeTeacher.name,
            email: safeTeacher.email,
          },
        },
      })
    }

    return res.status(401).json({ message: 'Invalid email or password' })
  } catch (_error) {
    return res.status(500).json({ message: 'Failed to login' })
  }
})

router.get('/me', requireAuth, async (req, res) => {
  if (req.user.role === 'admin') {
    const admin = await Admin.findById(req.user.id).lean()
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
      },
    })
  }

  const teacher = await Teacher.findById(req.user.id).lean()
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
    },
  })
})

export default router
