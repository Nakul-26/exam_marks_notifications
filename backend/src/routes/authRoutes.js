import { Router } from 'express'
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

const isAdminLogin = (email, password) => {
  const adminEmail = asTrimmedString(process.env.ADMIN_EMAIL).toLowerCase()
  const adminPassword = asTrimmedString(process.env.ADMIN_PASSWORD)
  if (!adminEmail || !adminPassword) {
    return false
  }
  return email === adminEmail && password === adminPassword
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

    if (isAdminLogin(credentials.email, credentials.password)) {
      const adminEmail = asTrimmedString(process.env.ADMIN_EMAIL).toLowerCase()
      const token = signToken({
        id: 'admin',
        role: 'admin',
        name: 'Administrator',
        email: adminEmail,
      })
      return res.json({
        data: {
          token,
          user: {
            id: 'admin',
            role: 'admin',
            name: 'Administrator',
            email: adminEmail,
          },
        },
      })
    }

    const teacher = await Teacher.findOne({ email: credentials.email })
      .select('+passwordHash')
      .lean()
    if (!teacher || !teacher.passwordHash) {
      return res.status(401).json({ message: 'Invalid email or password' })
    }

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
  } catch (_error) {
    return res.status(500).json({ message: 'Failed to login' })
  }
})

router.get('/me', requireAuth, async (req, res) => {
  if (req.user.role === 'admin') {
    return res.json({
      data: {
        id: req.user.id,
        role: 'admin',
        name: req.user.name || 'Administrator',
        email: req.user.email || '',
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
