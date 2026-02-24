import { Router } from 'express'
import ClassModel from '../models/Class.js'
import { authorizeRoles, requireAuth } from '../middleware/authMiddleware.js'
import Subject from '../models/Subject.js'
import Teacher from '../models/Teacher.js'
import TeacherSubject from '../models/TeacherSubject.js'
import { injectCollegeId, withCollegeScope } from '../utils/tenant.js'

const router = Router()
router.use(requireAuth)
router.use(authorizeRoles('admin', 'teacher'))

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
    ClassModel.findOne(withCollegeScope(teacherSubject.collegeId, {
      className: teacherSubject.className,
      section: teacherSubject.section,
    })).lean(),
    Subject.findOne(withCollegeScope(teacherSubject.collegeId, { name: teacherSubject.subject })).lean(),
    Teacher.findOne(
      withCollegeScope(teacherSubject.collegeId, { _id: teacherSubject.teacher }),
    ).lean(),
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

router.get('/', async (req, res) => {
  try {
    const teacherSubjects = await TeacherSubject.find(withCollegeScope(req.user.collegeId))
      .sort({ className: 1, section: 1, subject: 1, createdAt: -1 })
      .lean()
    return res.json({ data: teacherSubjects })
  } catch (_error) {
    return res.status(500).json({ message: 'Failed to fetch teacher-subject mappings' })
  }
})

router.post('/', async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied' })
  }

  try {
    const normalizedTeacherSubject = injectCollegeId(
      req.user.collegeId,
      normalizeTeacherSubjectInput(req.body),
    )
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
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied' })
  }

  try {
    const normalizedTeacherSubject = injectCollegeId(
      req.user.collegeId,
      normalizeTeacherSubjectInput(req.body),
    )
    const validationError = validateTeacherSubjectInput(normalizedTeacherSubject)
    if (validationError) {
      return res.status(400).json({ message: validationError })
    }

    const { error, payload } =
      await validateLookupAndBuildPayload(normalizedTeacherSubject)
    if (error) {
      return res.status(400).json({ message: error })
    }

    const teacherSubject = await TeacherSubject.findOneAndUpdate(
      withCollegeScope(req.user.collegeId, { _id: req.params.id }),
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
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied' })
  }

  try {
    const teacherSubject = await TeacherSubject.findOneAndDelete(
      withCollegeScope(req.user.collegeId, { _id: req.params.id }),
    )

    if (!teacherSubject) {
      return res.status(404).json({ message: 'Mapping not found' })
    }

    return res.json({ message: 'Mapping deleted' })
  } catch (_error) {
    return res.status(400).json({ message: 'Failed to delete mapping' })
  }
})

export default router
