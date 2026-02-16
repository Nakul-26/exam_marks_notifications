import { Router } from 'express'
import ClassModel from '../models/Class.js'
import Subject from '../models/Subject.js'
import Teacher from '../models/Teacher.js'
import TeacherSubject from '../models/TeacherSubject.js'

const router = Router()

const asTrimmedString = (value) =>
  typeof value === 'string' ? value.trim() : ''

const normalizeTeacherSubjectInput = (payload = {}) => {
  return {
    className: asTrimmedString(payload.className),
    section: asTrimmedString(payload.section),
    subject: asTrimmedString(payload.subject),
    teacher: asTrimmedString(payload.teacher),
  }
}

const validateTeacherSubjectInput = (teacherSubject) => {
  if (!teacherSubject.className) return 'Class is required'
  if (!teacherSubject.section) return 'Section is required'
  if (!teacherSubject.subject) return 'Subject is required'
  if (!teacherSubject.teacher) return 'Teacher is required'
  return null
}

const validateLookupAndBuildPayload = async (teacherSubject) => {
  const [classRecord, subjectRecord, teacherRecord] = await Promise.all([
    ClassModel.findOne({
      className: teacherSubject.className,
      section: teacherSubject.section,
    }).lean(),
    Subject.findOne({ name: teacherSubject.subject }).lean(),
    Teacher.findById(teacherSubject.teacher).lean(),
  ])

  if (!classRecord) {
    return { error: 'Selected class and section does not exist' }
  }

  if (!subjectRecord) {
    return { error: 'Selected subject does not exist' }
  }

  if (!teacherRecord) {
    return { error: 'Selected teacher does not exist' }
  }

  return {
    payload: {
      ...teacherSubject,
      teacherName: teacherRecord.name,
    },
  }
}

router.get('/', async (_req, res) => {
  try {
    const teacherSubjects = await TeacherSubject.find()
      .sort({ className: 1, section: 1, subject: 1, createdAt: -1 })
      .lean()
    return res.json({ data: teacherSubjects })
  } catch (_error) {
    return res.status(500).json({ message: 'Failed to fetch teacher-subject mappings' })
  }
})

router.post('/', async (req, res) => {
  try {
    const normalizedTeacherSubject = normalizeTeacherSubjectInput(req.body)
    const validationError = validateTeacherSubjectInput(normalizedTeacherSubject)
    if (validationError) {
      return res.status(400).json({ message: validationError })
    }

    const { error, payload } =
      await validateLookupAndBuildPayload(normalizedTeacherSubject)
    if (error) {
      return res.status(400).json({ message: error })
    }

    const teacherSubject = await TeacherSubject.create(payload)
    return res.status(201).json({ data: teacherSubject })
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Mapping already exists for this class and subject' })
    }
    return res.status(400).json({ message: 'Failed to create mapping' })
  }
})

router.put('/:id', async (req, res) => {
  try {
    const normalizedTeacherSubject = normalizeTeacherSubjectInput(req.body)
    const validationError = validateTeacherSubjectInput(normalizedTeacherSubject)
    if (validationError) {
      return res.status(400).json({ message: validationError })
    }

    const { error, payload } =
      await validateLookupAndBuildPayload(normalizedTeacherSubject)
    if (error) {
      return res.status(400).json({ message: error })
    }

    const teacherSubject = await TeacherSubject.findByIdAndUpdate(
      req.params.id,
      payload,
      {
        new: true,
        runValidators: true,
      },
    )

    if (!teacherSubject) {
      return res.status(404).json({ message: 'Mapping not found' })
    }

    return res.json({ data: teacherSubject })
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Mapping already exists for this class and subject' })
    }
    return res.status(400).json({ message: 'Failed to update mapping' })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const teacherSubject = await TeacherSubject.findByIdAndDelete(req.params.id)

    if (!teacherSubject) {
      return res.status(404).json({ message: 'Mapping not found' })
    }

    return res.json({ message: 'Mapping deleted' })
  } catch (_error) {
    return res.status(400).json({ message: 'Failed to delete mapping' })
  }
})

export default router
