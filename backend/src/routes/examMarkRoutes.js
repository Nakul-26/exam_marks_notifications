import { Router } from 'express'
import ClassStudent from '../models/ClassStudent.js'
import Exam from '../models/Exam.js'
import ExamMark from '../models/ExamMark.js'
import ExamSubject from '../models/ExamSubject.js'
import Student from '../models/Student.js'
import TeacherSubject from '../models/TeacherSubject.js'
import { authorizeRoles, requireAuth } from '../middleware/authMiddleware.js'

const router = Router()
router.use(requireAuth)
router.use(authorizeRoles('admin', 'teacher'))

const asTrimmedString = (value) =>
  typeof value === 'string' ? value.trim() : ''

const normalizeExamMarkInput = (payload = {}) => {
  return {
    examId: asTrimmedString(payload.examId),
    examSubjectId: asTrimmedString(payload.examSubjectId),
    studentId: asTrimmedString(payload.studentId),
    marksObtained: Number(payload.marksObtained),
    remarks: asTrimmedString(payload.remarks),
  }
}

const normalizeExamMarkOutput = (examMark) => {
  const student = examMark.studentId
  const examSubject = examMark.examSubjectId
  return {
    _id: examMark._id,
    examId:
      typeof examMark.examId === 'string' ? examMark.examId : String(examMark.examId),
    examSubjectId:
      typeof examSubject === 'string' ? examSubject : String(examSubject?._id || ''),
    studentId: typeof student === 'string' ? student : String(student?._id || ''),
    studentName: typeof student === 'string' ? '' : student?.name || '',
    studentRollNo: typeof student === 'string' ? '' : student?.rollNo || '',
    subjectId: typeof examSubject === 'string' ? '' : examSubject?.subjectId || '',
    totalMarks:
      typeof examSubject === 'string' ? null : Number(examSubject?.totalMarks || 0),
    passingMarks:
      typeof examSubject === 'string' ? null : Number(examSubject?.passingMarks || 0),
    marksObtained: examMark.marksObtained,
    remarks: examMark.remarks || '',
    createdAt: examMark.createdAt,
    updatedAt: examMark.updatedAt,
  }
}

const validateExamMarkInput = (examMark) => {
  if (!examMark.examId) return 'Exam is required'
  if (!examMark.examSubjectId) return 'Exam subject is required'
  if (!examMark.studentId) return 'Student is required'
  if (!Number.isFinite(examMark.marksObtained)) return 'Marks obtained must be a number'
  if (!Number.isInteger(examMark.marksObtained) || examMark.marksObtained < 0) {
    return 'Marks obtained must be a whole number 0 or greater'
  }
  return null
}

const validateReferences = async (examMark) => {
  const [exam, examSubject, student] = await Promise.all([
    Exam.findById(examMark.examId).lean(),
    ExamSubject.findById(examMark.examSubjectId).lean(),
    Student.findById(examMark.studentId).lean(),
  ])

  if (!exam) return 'Selected exam does not exist'
  if (!examSubject) return 'Selected exam subject does not exist'
  if (!student) return 'Selected student does not exist'

  if (String(examSubject.examId) !== String(exam._id)) {
    return 'Selected exam subject does not belong to the selected exam'
  }

  if (examMark.marksObtained > examSubject.totalMarks) {
    return `Marks obtained cannot be greater than maximum marks (${examSubject.totalMarks})`
  }

  const examClasses = Array.isArray(exam.examClasses) && exam.examClasses.length
    ? exam.examClasses
    : exam.classId && exam.sectionId
      ? [{ classId: exam.classId, sectionId: exam.sectionId }]
      : []

  if (!examClasses.length) {
    return 'Selected exam does not have any class-section mapping'
  }

  const classStudent = await ClassStudent.findOne({
    student: examMark.studentId,
    $or: examClasses.map((examClass) => ({
      className: examClass.classId,
      section: examClass.sectionId,
    })),
  }).lean()

  if (!classStudent) {
    const classLabel = examClasses.map((examClass) => `${examClass.classId}-${examClass.sectionId}`).join(', ')
    return `Selected student is not mapped to any of the exam classes (${classLabel})`
  }

  return {
    exam,
    examSubject,
    classStudent,
  }
}

const validateTeacherAuthorization = async ({ teacherId, classStudent, examSubject }) => {
  const teacherSubject = await TeacherSubject.findOne({
    teacher: teacherId,
    className: classStudent.className,
    section: classStudent.section,
    subject: examSubject.subjectId,
  }).lean()

  if (!teacherSubject) {
    return 'You are not allowed to manage marks for this class and subject'
  }

  return null
}

const filterMarksForTeacher = async (teacherId, marks) => {
  if (!marks.length) return marks

  const teacherMappings = await TeacherSubject.find({ teacher: teacherId }).lean()
  const allowedMap = new Set(
    teacherMappings.map(
      (mapping) => `${mapping.className}__${mapping.section}__${mapping.subject}`,
    ),
  )
  if (!allowedMap.size) return []

  const studentIds = Array.from(
    new Set(
      marks.map((mark) =>
        typeof mark.studentId === 'string' ? mark.studentId : String(mark.studentId?._id || ''),
      ),
    ),
  ).filter(Boolean)
  if (!studentIds.length) return []

  const classStudents = await ClassStudent.find({
    student: { $in: studentIds },
  }).lean()
  const classKeysByStudentId = new Map()
  for (const classStudent of classStudents) {
    const studentId = String(classStudent.student)
    const classKey = `${classStudent.className}__${classStudent.section}`
    const existing = classKeysByStudentId.get(studentId) || []
    existing.push(classKey)
    classKeysByStudentId.set(studentId, existing)
  }

  return marks.filter((mark) => {
    const studentId =
      typeof mark.studentId === 'string'
        ? mark.studentId
        : String(mark.studentId?._id || '')
    const subjectId =
      typeof mark.examSubjectId === 'string' ? '' : mark.examSubjectId?.subjectId || ''
    if (!studentId || !subjectId) return false

    const classKeys = classKeysByStudentId.get(studentId) || []
    return classKeys.some((classKey) => allowedMap.has(`${classKey}__${subjectId}`))
  })
}

router.get('/exam/:examId', async (req, res) => {
  try {
    const marks = await ExamMark.find({ examId: req.params.examId })
      .populate('studentId', 'name rollNo')
      .populate('examSubjectId', 'subjectId totalMarks passingMarks')
      .sort({ updatedAt: -1, createdAt: -1 })
      .lean()

    const authorizedMarks =
      req.user.role === 'teacher'
        ? await filterMarksForTeacher(req.user.id, marks)
        : marks

    return res.json({ data: authorizedMarks.map(normalizeExamMarkOutput) })
  } catch (_error) {
    return res.status(500).json({ message: 'Failed to fetch marks' })
  }
})

router.get('/exam-subject/:examSubjectId', async (req, res) => {
  try {
    const marks = await ExamMark.find({ examSubjectId: req.params.examSubjectId })
      .populate('studentId', 'name rollNo')
      .populate('examSubjectId', 'subjectId totalMarks passingMarks')
      .sort({ updatedAt: -1, createdAt: -1 })
      .lean()

    const authorizedMarks =
      req.user.role === 'teacher'
        ? await filterMarksForTeacher(req.user.id, marks)
        : marks

    return res.json({ data: authorizedMarks.map(normalizeExamMarkOutput) })
  } catch (_error) {
    return res.status(500).json({ message: 'Failed to fetch marks' })
  }
})

router.post('/', async (req, res) => {
  try {
    if (!req.user?.id || !req.user?.role) {
      return res.status(401).json({ message: 'Authentication required' })
    }

    const normalizedExamMark = normalizeExamMarkInput(req.body)
    const validationError = validateExamMarkInput(normalizedExamMark)
    if (validationError) {
      return res.status(400).json({ message: validationError })
    }

    const referenceResult = await validateReferences(normalizedExamMark)
    if (typeof referenceResult === 'string') {
      return res.status(400).json({ message: referenceResult })
    }

    if (req.user.role === 'teacher') {
      const authError = await validateTeacherAuthorization({
        teacherId: req.user.id,
        classStudent: referenceResult.classStudent,
        examSubject: referenceResult.examSubject,
      })
      if (authError) {
        return res.status(403).json({ message: authError })
      }
    }

    const examMark = await ExamMark.create(normalizedExamMark)
    return res.status(201).json({ data: examMark })
  } catch (error) {
    if (error.code === 11000) {
      return res
        .status(400)
        .json({ message: 'Marks already exist for this student and exam subject' })
    }
    return res.status(400).json({ message: 'Failed to create marks' })
  }
})

router.put('/:id', async (req, res) => {
  try {
    if (!req.user?.id || !req.user?.role) {
      return res.status(401).json({ message: 'Authentication required' })
    }

    const normalizedExamMark = normalizeExamMarkInput(req.body)
    const validationError = validateExamMarkInput(normalizedExamMark)
    if (validationError) {
      return res.status(400).json({ message: validationError })
    }

    const referenceResult = await validateReferences(normalizedExamMark)
    if (typeof referenceResult === 'string') {
      return res.status(400).json({ message: referenceResult })
    }

    if (req.user.role === 'teacher') {
      const authError = await validateTeacherAuthorization({
        teacherId: req.user.id,
        classStudent: referenceResult.classStudent,
        examSubject: referenceResult.examSubject,
      })
      if (authError) {
        return res.status(403).json({ message: authError })
      }
    }

    const examMark = await ExamMark.findByIdAndUpdate(
      req.params.id,
      normalizedExamMark,
      {
        new: true,
        runValidators: true,
      },
    )

    if (!examMark) {
      return res.status(404).json({ message: 'Marks record not found' })
    }

    return res.json({ data: examMark })
  } catch (error) {
    if (error.code === 11000) {
      return res
        .status(400)
        .json({ message: 'Marks already exist for this student and exam subject' })
    }
    return res.status(400).json({ message: 'Failed to update marks' })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    if (!req.user?.id || !req.user?.role) {
      return res.status(401).json({ message: 'Authentication required' })
    }

    const examMark = await ExamMark.findById(req.params.id).lean()

    if (!examMark) {
      return res.status(404).json({ message: 'Marks record not found' })
    }

    const referenceResult = await validateReferences({
      examId: String(examMark.examId),
      examSubjectId: String(examMark.examSubjectId),
      studentId: String(examMark.studentId),
      marksObtained: Number(examMark.marksObtained),
      remarks: examMark.remarks || '',
    })
    if (typeof referenceResult === 'string') {
      return res.status(400).json({ message: referenceResult })
    }

    if (req.user.role === 'teacher') {
      const authError = await validateTeacherAuthorization({
        teacherId: req.user.id,
        classStudent: referenceResult.classStudent,
        examSubject: referenceResult.examSubject,
      })
      if (authError) {
        return res.status(403).json({ message: authError })
      }
    }

    await ExamMark.findByIdAndDelete(req.params.id)

    return res.json({ message: 'Marks deleted' })
  } catch (_error) {
    return res.status(400).json({ message: 'Failed to delete marks' })
  }
})

export default router
