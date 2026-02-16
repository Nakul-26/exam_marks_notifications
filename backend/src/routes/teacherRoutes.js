import { Router } from 'express'
import Teacher from '../models/Teacher.js'
import TeacherSubject from '../models/TeacherSubject.js'
import { hashPassword } from '../utils/auth.js'

const router = Router()

const phoneRegex = /^\d{10,15}$/
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const asTrimmedString = (value) =>
  typeof value === 'string' ? value.trim() : ''

const normalizeTeacherInput = (payload = {}) => {
  return {
    name: asTrimmedString(payload.name),
    email: asTrimmedString(payload.email).toLowerCase(),
    phone: asTrimmedString(payload.phone),
    password: asTrimmedString(payload.password),
  }
}

const validateTeacherInput = (teacher, isUpdate = false) => {
  if (!teacher.name) return 'Name is required'
  if (!teacher.email) return 'Email is required'
  if (!emailRegex.test(teacher.email)) return 'Email is invalid'
  if (!teacher.phone) return 'Phone is required'
  if (!phoneRegex.test(teacher.phone)) return 'Phone must be 10 to 15 digits'
  if (!isUpdate && !teacher.password) return 'Password is required'
  if (teacher.password && teacher.password.length < 6) {
    return 'Password must be at least 6 characters'
  }
  return null
}

const sanitizeTeacher = (teacher) => {
  return {
    _id: String(teacher._id),
    name: teacher.name || '',
    email: teacher.email || '',
    phone: teacher.phone || '',
    createdAt: teacher.createdAt,
    updatedAt: teacher.updatedAt,
  }
}

router.get('/', async (_req, res) => {
  try {
    const teachers = await Teacher.find().sort({ createdAt: -1 }).lean()
    return res.json({ data: teachers.map(sanitizeTeacher) })
  } catch (_error) {
    return res.status(500).json({ message: 'Failed to fetch teachers' })
  }
})

router.post('/', async (req, res) => {
  try {
    const normalizedTeacher = normalizeTeacherInput(req.body)
    const validationError = validateTeacherInput(normalizedTeacher)
    if (validationError) {
      return res.status(400).json({ message: validationError })
    }

    const teacher = await Teacher.create({
      name: normalizedTeacher.name,
      email: normalizedTeacher.email,
      phone: normalizedTeacher.phone,
      passwordHash: hashPassword(normalizedTeacher.password),
    })
    return res.status(201).json({ data: sanitizeTeacher(teacher.toObject()) })
  } catch (error) {
    if (error.code === 11000) {
      if (error.keyPattern?.email) {
        return res.status(400).json({ message: 'Email already exists' })
      }
      if (error.keyPattern?.phone) {
        return res.status(400).json({ message: 'Phone already exists' })
      }
      return res.status(400).json({ message: 'Teacher already exists' })
    }
    return res.status(400).json({ message: 'Failed to create teacher' })
  }
})

router.put('/:id', async (req, res) => {
  try {
    const normalizedTeacher = normalizeTeacherInput(req.body)
    const validationError = validateTeacherInput(normalizedTeacher, true)
    if (validationError) {
      return res.status(400).json({ message: validationError })
    }

    const existingTeacher = await Teacher.findById(req.params.id)

    if (!existingTeacher) {
      return res.status(404).json({ message: 'Teacher not found' })
    }

    const previousName = existingTeacher.name
    existingTeacher.name = normalizedTeacher.name
    existingTeacher.email = normalizedTeacher.email
    existingTeacher.phone = normalizedTeacher.phone
    if (normalizedTeacher.password) {
      existingTeacher.passwordHash = hashPassword(normalizedTeacher.password)
    }
    const teacher = await existingTeacher.save()

    if (teacher.name !== previousName) {
      await TeacherSubject.updateMany(
        { teacher: teacher._id },
        { $set: { teacherName: teacher.name } },
      )
    }

    return res.json({ data: sanitizeTeacher(teacher.toObject()) })
  } catch (error) {
    if (error.code === 11000) {
      if (error.keyPattern?.email) {
        return res.status(400).json({ message: 'Email already exists' })
      }
      if (error.keyPattern?.phone) {
        return res.status(400).json({ message: 'Phone already exists' })
      }
      return res.status(400).json({ message: 'Teacher already exists' })
    }
    return res.status(400).json({ message: 'Failed to update teacher' })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const teacher = await Teacher.findByIdAndDelete(req.params.id)
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' })
    }
    await TeacherSubject.deleteMany({ teacher: teacher._id })
    return res.json({ message: 'Teacher deleted' })
  } catch (_error) {
    return res.status(400).json({ message: 'Failed to delete teacher' })
  }
})

export default router
