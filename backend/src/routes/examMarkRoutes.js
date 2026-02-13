import { Router } from 'express'
import ClassStudent from '../models/ClassStudent.js'
import Exam from '../models/Exam.js'
import ExamMark from '../models/ExamMark.js'
import ExamSubject from '../models/ExamSubject.js'
import Student from '../models/Student.js'

const router = Router()

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

  const classStudent = await ClassStudent.findOne({
    className: exam.classId,
    section: exam.sectionId,
    student: examMark.studentId,
  }).lean()

  if (!classStudent) {
    return `Selected student is not mapped to Class ${exam.classId} Section ${exam.sectionId}`
  }

  return null
}

router.get('/exam/:examId', async (req, res) => {
  try {
    const marks = await ExamMark.find({ examId: req.params.examId })
      .populate('studentId', 'name rollNo')
      .populate('examSubjectId', 'subjectId totalMarks passingMarks')
      .sort({ updatedAt: -1, createdAt: -1 })
      .lean()

    return res.json({ data: marks.map(normalizeExamMarkOutput) })
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

    return res.json({ data: marks.map(normalizeExamMarkOutput) })
  } catch (_error) {
    return res.status(500).json({ message: 'Failed to fetch marks' })
  }
})

router.post('/', async (req, res) => {
  try {
    const normalizedExamMark = normalizeExamMarkInput(req.body)
    const validationError = validateExamMarkInput(normalizedExamMark)
    if (validationError) {
      return res.status(400).json({ message: validationError })
    }

    const referenceError = await validateReferences(normalizedExamMark)
    if (referenceError) {
      return res.status(400).json({ message: referenceError })
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
    const normalizedExamMark = normalizeExamMarkInput(req.body)
    const validationError = validateExamMarkInput(normalizedExamMark)
    if (validationError) {
      return res.status(400).json({ message: validationError })
    }

    const referenceError = await validateReferences(normalizedExamMark)
    if (referenceError) {
      return res.status(400).json({ message: referenceError })
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
    const examMark = await ExamMark.findByIdAndDelete(req.params.id)

    if (!examMark) {
      return res.status(404).json({ message: 'Marks record not found' })
    }

    return res.json({ message: 'Marks deleted' })
  } catch (_error) {
    return res.status(400).json({ message: 'Failed to delete marks' })
  }
})

export default router
