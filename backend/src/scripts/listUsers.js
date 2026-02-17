import dotenv from 'dotenv'
import mongoose from 'mongoose'
import Admin from '../models/Admin.js'
import Teacher from '../models/Teacher.js'

dotenv.config()

const asTrimmedString = (value) =>
  typeof value === 'string' ? value.trim() : ''

const start = async () => {
  const mongoUri = asTrimmedString(process.env.MONGO_URI)
  if (!mongoUri) {
    throw new Error('MONGO_URI is required')
  }

  await mongoose.connect(mongoUri)

  const [teachers, admins] = await Promise.all([
    Teacher.find()
      .sort({ createdAt: -1 })
      .select('_id name email phone createdAt updatedAt')
      .lean(),
    Admin.find()
      .sort({ createdAt: -1 })
      .select('_id name email createdAt updatedAt')
      .lean(),
  ])

  const teacherRows = teachers.map((teacher) => ({
    id: String(teacher._id),
    role: 'teacher',
    name: teacher.name || '',
    email: teacher.email || '',
    phone: teacher.phone || '',
    createdAt: teacher.createdAt ? new Date(teacher.createdAt).toISOString() : '',
    updatedAt: teacher.updatedAt ? new Date(teacher.updatedAt).toISOString() : '',
  }))

  const adminRows = admins.map((admin) => ({
    id: String(admin._id),
    role: 'admin',
    name: admin.name || 'Administrator',
    email: admin.email || '',
    phone: '',
    createdAt: admin.createdAt ? new Date(admin.createdAt).toISOString() : '',
    updatedAt: admin.updatedAt ? new Date(admin.updatedAt).toISOString() : '',
  }))

  const rows = [...adminRows, ...teacherRows]

  if (!rows.length) {
    // eslint-disable-next-line no-console
    console.log('No users found.')
    return
  }

  // eslint-disable-next-line no-console
  console.table(rows)
}

start()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error('Failed to list users:', error.message)
    process.exitCode = 1
  })
  .finally(async () => {
    try {
      await mongoose.disconnect()
    } catch {
      // ignore disconnect errors
    }
  })
