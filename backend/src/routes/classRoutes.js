import { Router } from 'express'
import ClassSubject from '../models/ClassSubject.js'
import ClassStudent from '../models/ClassStudent.js'
import ClassModel from '../models/Class.js'
import TeacherSubject from '../models/TeacherSubject.js'

const router = Router()

const asTrimmedString = (value) =>
  typeof value === 'string' ? value.trim() : ''

const normalizeClassInput = (payload = {}) => {
  return {
    className: asTrimmedString(payload.className),
    section: asTrimmedString(payload.section),
  }
}

const validateClassInput = (classRecord) => {
  if (!classRecord.className) return 'Class is required'
  if (!classRecord.section) return 'Section is required'
  return null
}

router.get('/', async (_req, res) => {
  try {
    const classes = await ClassModel.find()
      .sort({ className: 1, section: 1, createdAt: -1 })
      .lean()
    return res.json({ data: classes })
  } catch (_error) {
    return res.status(500).json({ message: 'Failed to fetch classes' })
  }
})

router.post('/', async (req, res) => {
  try {
    const normalizedClass = normalizeClassInput(req.body)
    const validationError = validateClassInput(normalizedClass)
    if (validationError) {
      return res.status(400).json({ message: validationError })
    }

    const classRecord = await ClassModel.create(normalizedClass)
    return res.status(201).json({ data: classRecord })
  } catch (error) {
    if (error.code === 11000) {
      return res
        .status(400)
        .json({ message: 'Class already exists for this section' })
    }
    return res.status(400).json({ message: 'Failed to create class' })
  }
})

router.put('/:id', async (req, res) => {
  try {
    const normalizedClass = normalizeClassInput(req.body)
    const validationError = validateClassInput(normalizedClass)
    if (validationError) {
      return res.status(400).json({ message: validationError })
    }

    const classRecord = await ClassModel.findByIdAndUpdate(
      req.params.id,
      normalizedClass,
      {
        new: true,
        runValidators: true,
      },
    )

    if (!classRecord) {
      return res.status(404).json({ message: 'Class not found' })
    }

    return res.json({ data: classRecord })
  } catch (error) {
    if (error.code === 11000) {
      return res
        .status(400)
        .json({ message: 'Class already exists for this section' })
    }
    return res.status(400).json({ message: 'Failed to update class' })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const classRecord = await ClassModel.findByIdAndDelete(req.params.id)

    if (!classRecord) {
      return res.status(404).json({ message: 'Class not found' })
    }

    await Promise.all([
      ClassSubject.deleteMany({
        className: classRecord.className,
        section: classRecord.section,
      }),
      ClassStudent.deleteMany({
        className: classRecord.className,
        section: classRecord.section,
      }),
      TeacherSubject.deleteMany({
        className: classRecord.className,
        section: classRecord.section,
      }),
    ])

    return res.json({ message: 'Class deleted' })
  } catch (_error) {
    return res.status(400).json({ message: 'Failed to delete class' })
  }
})

export default router
