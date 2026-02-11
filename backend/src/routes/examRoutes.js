import { Router } from 'express'
import ClassSubject from '../models/ClassSubject.js'
import Exam from '../models/Exam.js'

const router = Router()

const asTrimmedString = (value) =>
  typeof value === 'string' ? value.trim() : ''

const normalizeExamInput = (payload = {}) => {
  const normalizedTargets = Array.isArray(payload.targets)
    ? payload.targets
        .map((target) => ({
          className: asTrimmedString(target?.className),
          section: asTrimmedString(target?.section),
          subjects: Array.isArray(target?.subjects)
            ? target.subjects.map((subject) => asTrimmedString(subject)).filter(Boolean)
            : [],
        }))
        .filter((target) => target.className && target.section)
    : []

  const dedupedTargets = []
  const targetKeySet = new Set()
  for (const target of normalizedTargets) {
    const subjectSet = new Set(target.subjects)
    const normalizedSubjects = Array.from(subjectSet).sort((a, b) =>
      a.localeCompare(b),
    )
    const key = `${target.className.toLowerCase()}__${target.section.toLowerCase()}`
    if (targetKeySet.has(key)) {
      continue
    }
    targetKeySet.add(key)
    dedupedTargets.push({
      className: target.className,
      section: target.section,
      subjects: normalizedSubjects,
    })
  }

  return {
    name: asTrimmedString(payload.name),
    examDate: payload.examDate,
    totalMarks: Number(payload.totalMarks),
    targets: dedupedTargets,
  }
}

const validateExamInput = (exam) => {
  if (!exam.name) return 'Exam Name is required'
  if (!exam.examDate) return 'Exam Date is required'
  if (!Array.isArray(exam.targets) || !exam.targets.length) {
    return 'At least one class and subject mapping is required'
  }

  for (const target of exam.targets) {
    if (!target.className) return 'Class is required for each mapping'
    if (!target.section) return 'Section is required for each mapping'
    if (!Array.isArray(target.subjects) || !target.subjects.length) {
      return 'At least one subject is required for each mapping'
    }
  }

  const examDate = new Date(exam.examDate)
  if (Number.isNaN(examDate.getTime())) return 'Exam Date is invalid'

  if (!Number.isFinite(exam.totalMarks)) return 'Total Marks must be a number'
  if (!Number.isInteger(exam.totalMarks) || exam.totalMarks < 1) {
    return 'Total Marks must be a whole number greater than 0'
  }

  return null
}

const validateTargetsAgainstClassSubjects = async (targets) => {
  for (const target of targets) {
    const allowedSubjects = await ClassSubject.find({
      className: target.className,
      section: target.section,
    })
      .select('subject -_id')
      .lean()

    const allowedSet = new Set(
      allowedSubjects.map((mapping) => asTrimmedString(mapping.subject)),
    )
    if (!allowedSet.size) {
      return `No subjects mapped for Class ${target.className} Section ${target.section}`
    }

    for (const subject of target.subjects) {
      if (!allowedSet.has(subject)) {
        return `Subject "${subject}" is not mapped for Class ${target.className} Section ${target.section}`
      }
    }
  }

  return null
}

const normalizeExamOutput = (exam) => {
  if (Array.isArray(exam.targets) && exam.targets.length) {
    return exam
  }

  const className = asTrimmedString(exam.className)
  const section = asTrimmedString(exam.section)
  const subject = asTrimmedString(exam.subject)
  const targets =
    className && section && subject
      ? [{ className, section, subjects: [subject] }]
      : []

  return {
    ...exam,
    targets,
  }
}

router.get('/', async (_req, res) => {
  try {
    const exams = await Exam.find().sort({ examDate: -1, createdAt: -1 }).lean()
    return res.json({ data: exams.map(normalizeExamOutput) })
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

    const targetValidationError = await validateTargetsAgainstClassSubjects(
      normalizedExam.targets,
    )
    if (targetValidationError) {
      return res.status(400).json({ message: targetValidationError })
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

    const targetValidationError = await validateTargetsAgainstClassSubjects(
      normalizedExam.targets,
    )
    if (targetValidationError) {
      return res.status(400).json({ message: targetValidationError })
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
