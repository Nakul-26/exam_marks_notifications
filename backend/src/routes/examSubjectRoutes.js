import { Router } from 'express'
import ClassSubject from '../models/ClassSubject.js'
import Exam from '../models/Exam.js'
import ExamMark from '../models/ExamMark.js'
import ExamSubject from '../models/ExamSubject.js'

const router = Router()

const asTrimmedString = (value) =>
  typeof value === 'string' ? value.trim() : ''

const normalizeExamSubjectInput = (payload = {}) => {
  return {
    examId: asTrimmedString(payload.examId),
    subjectId: asTrimmedString(payload.subjectId),
    examDate: payload.examDate,
    totalMarks: Number(payload.totalMarks),
    passingMarks: Number(payload.passingMarks),
    instructions: asTrimmedString(payload.instructions),
  }
}

const validateExamSubjectInput = (examSubject) => {
  if (!examSubject.examId) return 'Exam is required'
  if (!examSubject.subjectId) return 'Subject is required'
  if (!examSubject.examDate) return 'Exam date is required'

  const examDate = new Date(examSubject.examDate)
  if (Number.isNaN(examDate.getTime())) return 'Exam date is invalid'

  if (!Number.isInteger(examSubject.totalMarks) || examSubject.totalMarks < 1) {
    return 'Maximum marks must be a whole number greater than 0'
  }
  if (!Number.isInteger(examSubject.passingMarks) || examSubject.passingMarks < 0) {
    return 'Passing marks must be a whole number 0 or greater'
  }
  if (examSubject.passingMarks > examSubject.totalMarks) {
    return 'Passing marks cannot be greater than maximum marks'
  }
  return null
}

const validateExamAndSubjectMapping = async (examSubject) => {
  const exam = await Exam.findById(examSubject.examId).lean()
  if (!exam) {
    return { message: 'Exam not found' }
  }

  const classSubject = await ClassSubject.findOne({
    className: exam.classId,
    section: exam.sectionId,
    subject: examSubject.subjectId,
  }).lean()

  if (!classSubject) {
    return {
      message: `Subject "${examSubject.subjectId}" is not mapped for Class ${exam.classId} Section ${exam.sectionId}`,
    }
  }

  return { exam }
}

router.get('/exam/:examId', async (req, res) => {
  try {
    const examSubjects = await ExamSubject.find({ examId: req.params.examId })
      .sort({ examDate: 1, createdAt: -1 })
      .lean()

    return res.json({ data: examSubjects })
  } catch (_error) {
    return res.status(500).json({ message: 'Failed to fetch exam subjects' })
  }
})

router.post('/', async (req, res) => {
  try {
    const normalizedExamSubject = normalizeExamSubjectInput(req.body)
    const validationError = validateExamSubjectInput(normalizedExamSubject)
    if (validationError) {
      return res.status(400).json({ message: validationError })
    }

    const mappingValidation = await validateExamAndSubjectMapping(normalizedExamSubject)
    if (mappingValidation.message) {
      return res.status(400).json({ message: mappingValidation.message })
    }

    const examSubject = await ExamSubject.create(normalizedExamSubject)
    return res.status(201).json({ data: examSubject })
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Subject already exists in this exam' })
    }
    return res.status(400).json({ message: 'Failed to create exam subject' })
  }
})

router.put('/:id', async (req, res) => {
  try {
    const normalizedExamSubject = normalizeExamSubjectInput(req.body)
    const validationError = validateExamSubjectInput(normalizedExamSubject)
    if (validationError) {
      return res.status(400).json({ message: validationError })
    }

    const mappingValidation = await validateExamAndSubjectMapping(normalizedExamSubject)
    if (mappingValidation.message) {
      return res.status(400).json({ message: mappingValidation.message })
    }

    const examSubject = await ExamSubject.findByIdAndUpdate(
      req.params.id,
      normalizedExamSubject,
      {
        new: true,
        runValidators: true,
      },
    )

    if (!examSubject) {
      return res.status(404).json({ message: 'Exam subject not found' })
    }

    return res.json({ data: examSubject })
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Subject already exists in this exam' })
    }
    return res.status(400).json({ message: 'Failed to update exam subject' })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const examSubject = await ExamSubject.findByIdAndDelete(req.params.id)

    if (!examSubject) {
      return res.status(404).json({ message: 'Exam subject not found' })
    }

    await ExamMark.deleteMany({ examSubjectId: examSubject._id })

    return res.json({ message: 'Exam subject deleted' })
  } catch (_error) {
    return res.status(400).json({ message: 'Failed to delete exam subject' })
  }
})

export default router
