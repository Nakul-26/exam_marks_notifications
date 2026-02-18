import { Router } from 'express'
import ClassModel from '../models/Class.js'
import Exam from '../models/Exam.js'
import ExamMark from '../models/ExamMark.js'
import ExamSubject from '../models/ExamSubject.js'
import TeacherSubject from '../models/TeacherSubject.js'
import { authorizeRoles, requireAuth } from '../middleware/authMiddleware.js'

const router = Router()
router.use(requireAuth)
router.use(authorizeRoles('admin', 'teacher'))

const asTrimmedString = (value) =>
  typeof value === 'string' ? value.trim() : ''

const normalizeStatus = (value) => {
  const normalizedValue = asTrimmedString(value).toLowerCase()
  return ['draft', 'published', 'completed'].includes(normalizedValue)
    ? normalizedValue
    : ''
}

const normalizeExamClasses = (payload = {}) => {
  const rawExamClasses = Array.isArray(payload.examClasses) ? payload.examClasses : []
  const normalizedExamClasses = rawExamClasses
    .map((examClass) => ({
      classId: asTrimmedString(examClass?.classId),
      sectionId: asTrimmedString(examClass?.sectionId),
    }))
    .filter((examClass) => examClass.classId && examClass.sectionId)

  if (!normalizedExamClasses.length) {
    const classId = asTrimmedString(payload.classId)
    const sectionId = asTrimmedString(payload.sectionId)
    if (classId && sectionId) {
      normalizedExamClasses.push({ classId, sectionId })
    }
  }

  const seen = new Set()
  return normalizedExamClasses.filter((examClass) => {
    const key = `${examClass.classId}__${examClass.sectionId}`
    if (seen.has(key)) {
      return false
    }
    seen.add(key)
    return true
  })
}

const normalizeExamOutput = (exam = {}) => {
  const examClasses = Array.isArray(exam.examClasses)
    ? exam.examClasses
        .map((examClass) => ({
          classId: asTrimmedString(examClass?.classId),
          sectionId: asTrimmedString(examClass?.sectionId),
        }))
        .filter((examClass) => examClass.classId && examClass.sectionId)
    : []

  const fallbackClassId = asTrimmedString(exam.classId)
  const fallbackSectionId = asTrimmedString(exam.sectionId)
  const effectiveExamClasses = examClasses.length
    ? examClasses
    : fallbackClassId && fallbackSectionId
      ? [{ classId: fallbackClassId, sectionId: fallbackSectionId }]
      : []

  const [primaryClass] = effectiveExamClasses

  return {
    ...exam,
    examClasses: effectiveExamClasses,
    classId: primaryClass?.classId || '',
    sectionId: primaryClass?.sectionId || '',
  }
}

const normalizeExamInput = (payload = {}) => {
  const examClasses = normalizeExamClasses(payload)
  const [primaryClass] = examClasses
  const status = normalizeStatus(payload.status) || 'draft'
  return {
    examName: asTrimmedString(payload.examName),
    examClasses,
    classId: primaryClass?.classId || '',
    sectionId: primaryClass?.sectionId || '',
    academicYear: asTrimmedString(payload.academicYear),
    description: asTrimmedString(payload.description),
    status,
  }
}

const validateExamInput = (exam) => {
  if (!exam.examName) return 'Exam name is required'
  if (!Array.isArray(exam.examClasses) || !exam.examClasses.length) {
    return 'At least one class-section is required'
  }
  if (!exam.academicYear) return 'Academic year is required'
  if (!['draft', 'published', 'completed'].includes(exam.status)) {
    return 'Status is invalid'
  }
  return null
}

const validateClassExists = async (exam) => {
  const classRecords = await ClassModel.find({
    $or: exam.examClasses.map((examClass) => ({
      className: examClass.classId,
      section: examClass.sectionId,
    })),
  })
    .select({ className: 1, section: 1 })
    .lean()

  const classKeys = new Set(classRecords.map((record) => `${record.className}__${record.section}`))
  const missingClass = exam.examClasses.find(
    (examClass) => !classKeys.has(`${examClass.classId}__${examClass.sectionId}`),
  )

  if (missingClass) {
    return `Selected class and section does not exist: ${missingClass.classId}-${missingClass.sectionId}`
  }

  return null
}

const buildTeacherExamScopeQuery = async (teacherId) => {
  const teacherMappings = await TeacherSubject.find({ teacher: teacherId })
    .select({ className: 1, section: 1 })
    .lean()
  const uniqueClassKeys = Array.from(
    new Set(teacherMappings.map((mapping) => `${mapping.className}__${mapping.section}`)),
  )
  if (!uniqueClassKeys.length) {
    return null
  }

  return uniqueClassKeys.map((classKey) => {
    const [classId, sectionId] = classKey.split('__')
    return {
      $or: [
        {
          examClasses: {
            $elemMatch: { classId, sectionId },
          },
        },
        { classId, sectionId },
      ],
    }
  })
}

router.get('/', async (req, res) => {
  try {
    const query = {}
    const classId = asTrimmedString(req.query.classId)
    const sectionId = asTrimmedString(req.query.sectionId)
    const academicYear = asTrimmedString(req.query.academicYear)
    const status = normalizeStatus(req.query.status)
    const search = asTrimmedString(req.query.search)

    if (classId && sectionId) {
      query.$or = [
        {
          examClasses: {
            $elemMatch: { classId, sectionId },
          },
        },
        { classId, sectionId },
      ]
    } else if (classId) {
      query.$or = [
        { 'examClasses.classId': classId },
        { classId },
      ]
    } else if (sectionId) {
      query.$or = [
        { 'examClasses.sectionId': sectionId },
        { sectionId },
      ]
    }
    if (academicYear) query.academicYear = academicYear
    if (status) query.status = status
    if (search) {
      query.examName = { $regex: search, $options: 'i' }
    }

    if (req.user.role === 'teacher') {
      const teacherScopeOr = await buildTeacherExamScopeQuery(req.user.id)
      if (!teacherScopeOr) {
        return res.json({ data: [] })
      }

      if (query.$and) {
        query.$and.push({ $or: teacherScopeOr })
      } else {
        query.$and = [{ $or: teacherScopeOr }]
      }
    }

    const exams = await Exam.find(query).sort({ createdAt: -1 }).lean()
    return res.json({ data: exams.map(normalizeExamOutput) })
  } catch (_error) {
    return res.status(500).json({ message: 'Failed to fetch exams' })
  }
})

router.post('/', async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied' })
  }

  try {
    const normalizedExam = normalizeExamInput(req.body)
    const validationError = validateExamInput(normalizedExam)
    if (validationError) {
      return res.status(400).json({ message: validationError })
    }

    const classValidationError = await validateClassExists(normalizedExam)
    if (classValidationError) {
      return res.status(400).json({ message: classValidationError })
    }

    const exam = await Exam.create(normalizedExam)
    return res.status(201).json({ data: normalizeExamOutput(exam.toObject()) })
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Exam already exists for this class and year' })
    }
    return res.status(400).json({ message: 'Failed to create exam' })
  }
})

router.put('/:id', async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied' })
  }

  try {
    const normalizedExam = normalizeExamInput(req.body)
    const validationError = validateExamInput(normalizedExam)
    if (validationError) {
      return res.status(400).json({ message: validationError })
    }

    const classValidationError = await validateClassExists(normalizedExam)
    if (classValidationError) {
      return res.status(400).json({ message: classValidationError })
    }

    const exam = await Exam.findByIdAndUpdate(req.params.id, normalizedExam, {
      new: true,
      runValidators: true,
    })

    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' })
    }

    return res.json({ data: normalizeExamOutput(exam.toObject()) })
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Exam already exists for this class and year' })
    }
    return res.status(400).json({ message: 'Failed to update exam' })
  }
})

router.delete('/:id', async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied' })
  }

  try {
    const exam = await Exam.findByIdAndDelete(req.params.id)

    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' })
    }

    const examSubjects = await ExamSubject.find({ examId: req.params.id }).lean()
    await Promise.all([
      ExamSubject.deleteMany({ examId: req.params.id }),
      ExamMark.deleteMany({ examId: req.params.id }),
      ExamMark.deleteMany({
        examSubjectId: { $in: examSubjects.map((examSubject) => examSubject._id) },
      }),
    ])
    return res.json({ message: 'Exam deleted' })
  } catch (_error) {
    return res.status(400).json({ message: 'Failed to delete exam' })
  }
})

export default router
