import { Router } from 'express'
import ClassModel from '../models/Class.js'
import ClassSubject from '../models/ClassSubject.js'
import { authorizeRoles, requireAuth } from '../middleware/authMiddleware.js'
import Subject from '../models/Subject.js'
import { injectCollegeId, withCollegeScope } from '../utils/tenant.js'

const router = Router()
router.use(requireAuth)
router.use(authorizeRoles('admin', 'teacher'))

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
    ClassModel.findOne(withCollegeScope(classSubject.collegeId, {
      className: classSubject.className,
      section: classSubject.section,
    })).lean(),
    Subject.findOne(withCollegeScope(classSubject.collegeId, { name: classSubject.subject })).lean(),
  ])

  if (!classRecord) {
    return 'Selected class and section does not exist'
  }

  if (!subjectRecord) {
    return 'Selected subject does not exist'
  }

  return null
}

router.get('/', async (req, res) => {
  try {
    const classSubjects = await ClassSubject.find(withCollegeScope(req.user.collegeId))
      .sort({ className: 1, section: 1, subject: 1, createdAt: -1 })
      .lean()
    return res.json({ data: classSubjects })
  } catch (_error) {
    return res.status(500).json({ message: 'Failed to fetch class-subject mappings' })
  }
})

router.post('/', async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied' })
  }

  try {
    const normalizedClassSubject = injectCollegeId(
      req.user.collegeId,
      normalizeClassSubjectInput(req.body),
    )
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
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied' })
  }

  try {
    const normalizedClassSubject = injectCollegeId(
      req.user.collegeId,
      normalizeClassSubjectInput(req.body),
    )
    const validationError = validateClassSubjectInput(normalizedClassSubject)
    if (validationError) {
      return res.status(400).json({ message: validationError })
    }

    const lookupValidationError =
      await validateClassAndSubjectExist(normalizedClassSubject)
    if (lookupValidationError) {
      return res.status(400).json({ message: lookupValidationError })
    }

    const classSubject = await ClassSubject.findOneAndUpdate(
      withCollegeScope(req.user.collegeId, { _id: req.params.id }),
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
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied' })
  }

  try {
    const classSubject = await ClassSubject.findOneAndDelete(
      withCollegeScope(req.user.collegeId, { _id: req.params.id }),
    )

    if (!classSubject) {
      return res.status(404).json({ message: 'Mapping not found' })
    }

    return res.json({ message: 'Mapping deleted' })
  } catch (_error) {
    return res.status(400).json({ message: 'Failed to delete mapping' })
  }
})

export default router
