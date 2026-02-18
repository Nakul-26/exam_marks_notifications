import { Router } from 'express'
import ClassModel from '../models/Class.js'
import ClassStudent from '../models/ClassStudent.js'
import Student from '../models/Student.js'
import TeacherSubject from '../models/TeacherSubject.js'
import { authorizeRoles, requireAuth } from '../middleware/authMiddleware.js'

const router = Router()
router.use(requireAuth)
router.use(authorizeRoles('admin', 'teacher'))

const asTrimmedString = (value) =>
  typeof value === 'string' ? value.trim() : ''

const normalizeClassStudentInput = (payload = {}) => {
  return {
    className: asTrimmedString(payload.className),
    section: asTrimmedString(payload.section),
    student: asTrimmedString(payload.student),
  }
}

const validateClassStudentInput = (classStudent) => {
  if (!classStudent.className) return 'Class is required'
  if (!classStudent.section) return 'Section is required'
  if (!classStudent.student) return 'Student is required'
  return null
}

const validateClassAndStudentExist = async (classStudent) => {
  const [classRecord, studentRecord] = await Promise.all([
    ClassModel.findOne({
      className: classStudent.className,
      section: classStudent.section,
    }).lean(),
    Student.findById(classStudent.student).lean(),
  ])

  if (!classRecord) {
    return 'Selected class and section does not exist'
  }

  if (!studentRecord) {
    return 'Selected student does not exist'
  }

  return null
}

const normalizeClassStudentOutput = (classStudent) => {
  const studentRecord = classStudent.student
  return {
    _id: classStudent._id,
    className: classStudent.className,
    section: classStudent.section,
    student: studentRecord?._id || '',
    studentName: studentRecord?.name || '',
    studentRollNo: studentRecord?.rollNo || '',
  }
}

const getTeacherClassQuery = async (teacherId) => {
  const teacherMappings = await TeacherSubject.find({ teacher: teacherId })
    .select({ className: 1, section: 1 })
    .lean()
  const uniqueClassKeys = Array.from(
    new Set(teacherMappings.map((mapping) => `${mapping.className}__${mapping.section}`)),
  )
  return uniqueClassKeys.map((classKey) => {
    const [className, section] = classKey.split('__')
    return { className, section }
  })
}

router.get('/', async (req, res) => {
  try {
    let classStudents = []

    if (req.user.role === 'teacher') {
      const classQuery = await getTeacherClassQuery(req.user.id)
      classStudents = classQuery.length
        ? await ClassStudent.find({ $or: classQuery })
          .populate('student', 'name rollNo')
          .sort({ className: 1, section: 1, createdAt: -1 })
          .lean()
        : []
    } else {
      classStudents = await ClassStudent.find()
      .populate('student', 'name rollNo')
      .sort({ className: 1, section: 1, createdAt: -1 })
      .lean()
    }

    return res.json({ data: classStudents.map(normalizeClassStudentOutput) })
  } catch (_error) {
    return res.status(500).json({ message: 'Failed to fetch class-student mappings' })
  }
})

router.post('/', async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied' })
  }

  try {
    const normalizedClassStudent = normalizeClassStudentInput(req.body)
    const validationError = validateClassStudentInput(normalizedClassStudent)
    if (validationError) {
      return res.status(400).json({ message: validationError })
    }

    const lookupValidationError =
      await validateClassAndStudentExist(normalizedClassStudent)
    if (lookupValidationError) {
      return res.status(400).json({ message: lookupValidationError })
    }

    const classStudent = await ClassStudent.create(normalizedClassStudent)
    return res.status(201).json({ data: classStudent })
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Mapping already exists' })
    }
    return res.status(400).json({ message: 'Failed to create mapping' })
  }
})

router.put('/:id', async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied' })
  }

  try {
    const normalizedClassStudent = normalizeClassStudentInput(req.body)
    const validationError = validateClassStudentInput(normalizedClassStudent)
    if (validationError) {
      return res.status(400).json({ message: validationError })
    }

    const lookupValidationError =
      await validateClassAndStudentExist(normalizedClassStudent)
    if (lookupValidationError) {
      return res.status(400).json({ message: lookupValidationError })
    }

    const classStudent = await ClassStudent.findByIdAndUpdate(
      req.params.id,
      normalizedClassStudent,
      {
        new: true,
        runValidators: true,
      },
    )

    if (!classStudent) {
      return res.status(404).json({ message: 'Mapping not found' })
    }

    return res.json({ data: classStudent })
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Mapping already exists' })
    }
    return res.status(400).json({ message: 'Failed to update mapping' })
  }
})

router.delete('/:id', async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied' })
  }

  try {
    const classStudent = await ClassStudent.findByIdAndDelete(req.params.id)

    if (!classStudent) {
      return res.status(404).json({ message: 'Mapping not found' })
    }

    return res.json({ message: 'Mapping deleted' })
  } catch (_error) {
    return res.status(400).json({ message: 'Failed to delete mapping' })
  }
})

export default router
