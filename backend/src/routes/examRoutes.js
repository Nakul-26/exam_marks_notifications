import { Router } from 'express'
import Exam from '../models/Exam.js'

const router = Router()

const asTrimmedString = (value) =>
  typeof value === 'string' ? value.trim() : ''

const normalizeExamInput = (payload = {}) => {
  return {
    name: asTrimmedString(payload.name),
    className: asTrimmedString(payload.className),
    section: asTrimmedString(payload.section),
    subject: asTrimmedString(payload.subject),
    examDate: payload.examDate,
    totalMarks: Number(payload.totalMarks),
  }
}

const validateExamInput = (exam) => {
  if (!exam.name) return 'Exam Name is required'
  if (!exam.className) return 'Class is required'
  if (!exam.section) return 'Section is required'
  if (!exam.subject) return 'Subject is required'
  if (!exam.examDate) return 'Exam Date is required'

  const examDate = new Date(exam.examDate)
  if (Number.isNaN(examDate.getTime())) return 'Exam Date is invalid'

  if (!Number.isFinite(exam.totalMarks)) return 'Total Marks must be a number'
  if (!Number.isInteger(exam.totalMarks) || exam.totalMarks < 1) {
    return 'Total Marks must be a whole number greater than 0'
  }

  return null
}

router.get('/', async (_req, res) => {
  try {
    const exams = await Exam.find().sort({ examDate: -1, createdAt: -1 }).lean()
    return res.json({ data: exams })
  } catch (_error) {
    return res.status(500).json({ message: 'Failed to fetch exams' })
  }
})

router.post('/', async (req, res) => {
  try {
    const normalizedExam = normalizeExamInput(req.body)
    const validationError = validateExamInput(normalizedExam)
    if (validationError) {
      return res.status(400).json({ message: validationError })
    }

    const exam = await Exam.create(normalizedExam)
    return res.status(201).json({ data: exam })
  } catch (_error) {
    return res.status(400).json({ message: 'Failed to create exam' })
  }
})

router.put('/:id', async (req, res) => {
  try {
    const normalizedExam = normalizeExamInput(req.body)
    const validationError = validateExamInput(normalizedExam)
    if (validationError) {
      return res.status(400).json({ message: validationError })
    }

    const exam = await Exam.findByIdAndUpdate(req.params.id, normalizedExam, {
      new: true,
      runValidators: true,
    })

    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' })
    }

    return res.json({ data: exam })
  } catch (_error) {
    return res.status(400).json({ message: 'Failed to update exam' })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const exam = await Exam.findByIdAndDelete(req.params.id)

    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' })
    }

    return res.json({ message: 'Exam deleted' })
  } catch (_error) {
    return res.status(400).json({ message: 'Failed to delete exam' })
  }
})

export default router
