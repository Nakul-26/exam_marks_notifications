import { Router } from 'express'
import ClassSubject from '../models/ClassSubject.js'
import ClassStudent from '../models/ClassStudent.js'
import ClassModel from '../models/Class.js'
import { authorizeRoles, requireAuth } from '../middleware/authMiddleware.js'
import TeacherSubject from '../models/TeacherSubject.js'
import { injectCollegeId, withCollegeScope } from '../utils/tenant.js'

const router = Router()
router.use(requireAuth)
router.use(authorizeRoles('admin', 'teacher'))

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

router.get('/', async (req, res) => {
  try {
    const classes = await ClassModel.find(withCollegeScope(req.user.collegeId))
      .sort({ className: 1, section: 1, createdAt: -1 })
      .lean()
    return res.json({ data: classes })
  } catch (_error) {
    return res.status(500).json({ message: 'Failed to fetch classes' })
  }
})

router.post('/', async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied' })
  }

  try {
    const normalizedClass = normalizeClassInput(req.body)
    const validationError = validateClassInput(normalizedClass)
    if (validationError) {
      return res.status(400).json({ message: validationError })
    }

    const classRecord = await ClassModel.create(
      injectCollegeId(req.user.collegeId, normalizedClass),
    )
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
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied' })
  }

  try {
    const normalizedClass = normalizeClassInput(req.body)
    const validationError = validateClassInput(normalizedClass)
    if (validationError) {
      return res.status(400).json({ message: validationError })
    }

    const classRecord = await ClassModel.findOneAndUpdate(
      withCollegeScope(req.user.collegeId, { _id: req.params.id }),
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
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied' })
  }

  try {
    const classRecord = await ClassModel.findOneAndDelete(
      withCollegeScope(req.user.collegeId, { _id: req.params.id }),
    )

    if (!classRecord) {
      return res.status(404).json({ message: 'Class not found' })
    }

    await Promise.all([
      ClassSubject.deleteMany({
        className: classRecord.className,
        section: classRecord.section,
        ...withCollegeScope(req.user.collegeId),
      }),
      ClassStudent.deleteMany({
        className: classRecord.className,
        section: classRecord.section,
        ...withCollegeScope(req.user.collegeId),
      }),
      TeacherSubject.deleteMany({
        className: classRecord.className,
        section: classRecord.section,
        ...withCollegeScope(req.user.collegeId),
      }),
    ])

    return res.json({ message: 'Class deleted' })
  } catch (_error) {
    return res.status(400).json({ message: 'Failed to delete class' })
  }
})

export default router
