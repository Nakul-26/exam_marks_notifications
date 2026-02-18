import { Router } from 'express'
import ClassStudent from '../models/ClassStudent.js'
import ExamMark from '../models/ExamMark.js'
import Student from '../models/Student.js'
import TeacherSubject from '../models/TeacherSubject.js'
import { authorizeRoles, requireAuth } from '../middleware/authMiddleware.js'

const router = Router()
router.use(requireAuth)
router.use(authorizeRoles('admin', 'teacher'))

const phoneRegex = /^\d{10,15}$/
const asTrimmedString = (value) =>
  typeof value === 'string' ? value.trim() : ''

const normalizeStudentInput = (payload = {}) => {
  return {
    name: asTrimmedString(payload.name),
    rollNo: asTrimmedString(payload.rollNo),
    fatherName: asTrimmedString(payload.fatherName || payload.parentDetails),
    studentPhone: asTrimmedString(payload.studentPhone),
    fatherPhone: asTrimmedString(payload.fatherPhone || payload.parentPhone),
  }
}

const normalizeStudentOutput = (student) => {
  return {
    ...student,
    fatherName: student.fatherName || student.parentDetails || '',
    fatherPhone: student.fatherPhone || student.parentPhone || '',
  }
}

const validateStudentInput = (student) => {
  if (!student.name) return 'Name is required'
  if (!student.rollNo) return 'Roll No is required'
  if (!student.fatherName) return 'Father Name is required'
  if (!student.studentPhone) return 'Student Phone is required'
  if (!student.fatherPhone) return 'Father Phone is required'
  if (!phoneRegex.test(student.studentPhone)) {
    return 'Student Phone must be 10 to 15 digits'
  }
  if (!phoneRegex.test(student.fatherPhone)) {
    return 'Father Phone must be 10 to 15 digits'
  }
  return null
}

const getAllowedStudentIdsForTeacher = async (teacherId) => {
  const teacherMappings = await TeacherSubject.find({ teacher: teacherId })
    .select({ className: 1, section: 1 })
    .lean()
  if (!teacherMappings.length) {
    return []
  }

  const classKeys = Array.from(
    new Set(teacherMappings.map((mapping) => `${mapping.className}__${mapping.section}`)),
  )
  const classOrQuery = classKeys.map((classKey) => {
    const [className, section] = classKey.split('__')
    return { className, section }
  })
  const classStudents = await ClassStudent.find({
    $or: classOrQuery,
  })
    .select({ student: 1 })
    .lean()

  return Array.from(new Set(classStudents.map((classStudent) => String(classStudent.student))))
}

router.get('/', async (req, res) => {
  try {
    let students = []

    if (req.user.role === 'teacher') {
      const allowedStudentIds = await getAllowedStudentIdsForTeacher(req.user.id)
      students = allowedStudentIds.length
        ? await Student.find({ _id: { $in: allowedStudentIds } })
          .sort({ createdAt: -1 })
          .lean()
        : []
    } else {
      students = await Student.find().sort({ createdAt: -1 }).lean()
    }

    return res.json({ data: students.map(normalizeStudentOutput) })
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch students' })
  }
})

router.post('/', async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied' })
  }

  try {
    const normalizedStudent = normalizeStudentInput(req.body)
    const validationError = validateStudentInput(normalizedStudent)
    if (validationError) {
      return res.status(400).json({ message: validationError })
    }

    const student = await Student.create(normalizedStudent)
    return res.status(201).json({ data: student })
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Roll No already exists' })
    }
    return res.status(400).json({ message: 'Failed to create student' })
  }
})

router.put('/:id', async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied' })
  }

  try {
    const normalizedStudent = normalizeStudentInput(req.body)
    const validationError = validateStudentInput(normalizedStudent)
    if (validationError) {
      return res.status(400).json({ message: validationError })
    }

    const student = await Student.findByIdAndUpdate(
      req.params.id,
      normalizedStudent,
      {
        new: true,
        runValidators: true,
      },
    )

    if (!student) {
      return res.status(404).json({ message: 'Student not found' })
    }

    return res.json({ data: student })
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Roll No already exists' })
    }
    return res.status(400).json({ message: 'Failed to update student' })
  }
})

router.delete('/:id', async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied' })
  }

  try {
    const student = await Student.findByIdAndDelete(req.params.id)

    if (!student) {
      return res.status(404).json({ message: 'Student not found' })
    }

    await ClassStudent.deleteMany({ student: student._id })
    await ExamMark.deleteMany({ studentId: student._id })

    return res.json({ message: 'Student deleted' })
  } catch (error) {
    return res.status(400).json({ message: 'Failed to delete student' })
  }
})

export default router
