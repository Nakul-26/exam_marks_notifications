import { Router } from 'express'
import ClassModel from '../models/Class.js'
import ClassSubject from '../models/ClassSubject.js'
import Subject from '../models/Subject.js'

const router = Router()

const asTrimmedString = (value) =>
  typeof value === 'string' ? value.trim() : ''

const normalizeClassSubjectInput = (payload = {}) => {
  return {
    className: asTrimmedString(payload.className),
    section: asTrimmedString(payload.section),
    subject: asTrimmedString(payload.subject),
  }
}

const validateClassSubjectInput = (classSubject) => {
  if (!classSubject.className) return 'Class is required'
  if (!classSubject.section) return 'Section is required'
  if (!classSubject.subject) return 'Subject is required'
  return null
}

const validateClassAndSubjectExist = async (classSubject) => {
  const [classRecord, subjectRecord] = await Promise.all([
    ClassModel.findOne({
      className: classSubject.className,
      section: classSubject.section,
    }).lean(),
    Subject.findOne({ name: classSubject.subject }).lean(),
  ])

  if (!classRecord) {
    return 'Selected class and section does not exist'
  }

  if (!subjectRecord) {
    return 'Selected subject does not exist'
  }

  return null
}

router.get('/', async (_req, res) => {
  try {
    const classSubjects = await ClassSubject.find()
      .sort({ className: 1, section: 1, subject: 1, createdAt: -1 })
      .lean()
    return res.json({ data: classSubjects })
  } catch (_error) {
    return res.status(500).json({ message: 'Failed to fetch class-subject mappings' })
  }
})

router.post('/', async (req, res) => {
  try {
    const normalizedClassSubject = normalizeClassSubjectInput(req.body)
    const validationError = validateClassSubjectInput(normalizedClassSubject)
    if (validationError) {
      return res.status(400).json({ message: validationError })
    }

    const lookupValidationError =
      await validateClassAndSubjectExist(normalizedClassSubject)
    if (lookupValidationError) {
      return res.status(400).json({ message: lookupValidationError })
    }

    const classSubject = await ClassSubject.create(normalizedClassSubject)
    return res.status(201).json({ data: classSubject })
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Mapping already exists' })
    }
    return res.status(400).json({ message: 'Failed to create mapping' })
  }
})

router.put('/:id', async (req, res) => {
  try {
    const normalizedClassSubject = normalizeClassSubjectInput(req.body)
    const validationError = validateClassSubjectInput(normalizedClassSubject)
    if (validationError) {
      return res.status(400).json({ message: validationError })
    }

    const lookupValidationError =
      await validateClassAndSubjectExist(normalizedClassSubject)
    if (lookupValidationError) {
      return res.status(400).json({ message: lookupValidationError })
    }

    const classSubject = await ClassSubject.findByIdAndUpdate(
      req.params.id,
      normalizedClassSubject,
      {
        new: true,
        runValidators: true,
      },
    )

    if (!classSubject) {
      return res.status(404).json({ message: 'Mapping not found' })
    }

    return res.json({ data: classSubject })
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Mapping already exists' })
    }
    return res.status(400).json({ message: 'Failed to update mapping' })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const classSubject = await ClassSubject.findByIdAndDelete(req.params.id)

    if (!classSubject) {
      return res.status(404).json({ message: 'Mapping not found' })
    }

    return res.json({ message: 'Mapping deleted' })
  } catch (_error) {
    return res.status(400).json({ message: 'Failed to delete mapping' })
  }
})

export default router
