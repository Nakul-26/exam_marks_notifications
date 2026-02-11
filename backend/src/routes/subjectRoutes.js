import { Router } from 'express'
import ClassSubject from '../models/ClassSubject.js'
import Subject from '../models/Subject.js'

const router = Router()

const asTrimmedString = (value) =>
  typeof value === 'string' ? value.trim() : ''

const normalizeSubjectInput = (payload = {}) => {
  return {
    name: asTrimmedString(payload.name),
  }
}

const validateSubjectInput = (subject) => {
  if (!subject.name) return 'Subject Name is required'
  return null
}

router.get('/', async (_req, res) => {
  try {
    const subjects = await Subject.find().sort({ name: 1, createdAt: -1 }).lean()
    return res.json({ data: subjects })
  } catch (_error) {
    return res.status(500).json({ message: 'Failed to fetch subjects' })
  }
})

router.post('/', async (req, res) => {
  try {
    const normalizedSubject = normalizeSubjectInput(req.body)
    const validationError = validateSubjectInput(normalizedSubject)
    if (validationError) {
      return res.status(400).json({ message: validationError })
    }

    const subject = await Subject.create(normalizedSubject)
    return res.status(201).json({ data: subject })
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Subject already exists' })
    }
    return res.status(400).json({ message: 'Failed to create subject' })
  }
})

router.put('/:id', async (req, res) => {
  try {
    const normalizedSubject = normalizeSubjectInput(req.body)
    const validationError = validateSubjectInput(normalizedSubject)
    if (validationError) {
      return res.status(400).json({ message: validationError })
    }

    const existingSubject = await Subject.findById(req.params.id)

    if (!existingSubject) {
      return res.status(404).json({ message: 'Subject not found' })
    }

    const previousName = existingSubject.name
    existingSubject.name = normalizedSubject.name
    const subject = await existingSubject.save()

    if (previousName !== subject.name) {
      await ClassSubject.updateMany(
        { subject: previousName },
        { $set: { subject: subject.name } },
      )
    }

    return res.json({ data: subject })
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Subject already exists' })
    }
    return res.status(400).json({ message: 'Failed to update subject' })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const subject = await Subject.findByIdAndDelete(req.params.id)

    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' })
    }

    await ClassSubject.deleteMany({ subject: subject.name })

    return res.json({ message: 'Subject deleted' })
  } catch (_error) {
    return res.status(400).json({ message: 'Failed to delete subject' })
  }
})

export default router
