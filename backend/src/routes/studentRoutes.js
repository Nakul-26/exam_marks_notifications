import { Router } from 'express'
import Student from '../models/Student.js'

const router = Router()

const normalizeStudentInput = (payload = {}) => {
  return {
    ...payload,
    fatherName: payload.fatherName || payload.parentDetails || '',
    fatherPhone: payload.fatherPhone || payload.parentPhone || '',
  }
}

const normalizeStudentOutput = (student) => {
  return {
    ...student,
    fatherName: student.fatherName || student.parentDetails || '',
    fatherPhone: student.fatherPhone || student.parentPhone || '',
  }
}

router.get('/', async (_req, res) => {
  try {
    const students = await Student.find().sort({ createdAt: -1 }).lean()
    return res.json({ data: students.map(normalizeStudentOutput) })
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch students' })
  }
})

router.post('/', async (req, res) => {
  try {
    const student = await Student.create(normalizeStudentInput(req.body))
    return res.status(201).json({ data: student })
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Roll No already exists' })
    }
    return res.status(400).json({ message: 'Failed to create student' })
  }
})

router.put('/:id', async (req, res) => {
  try {
    const student = await Student.findByIdAndUpdate(
      req.params.id,
      normalizeStudentInput(req.body),
      {
        new: true,
        runValidators: true,
      },
    )

    if (!student) {
      return res.status(404).json({ message: 'Student not found' })
    }

    return res.json({ data: student })
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Roll No already exists' })
    }
    return res.status(400).json({ message: 'Failed to update student' })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const student = await Student.findByIdAndDelete(req.params.id)

    if (!student) {
      return res.status(404).json({ message: 'Student not found' })
    }

    return res.json({ message: 'Student deleted' })
  } catch (error) {
    return res.status(400).json({ message: 'Failed to delete student' })
  }
})

export default router
