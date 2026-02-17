import dotenv from 'dotenv'
import mongoose from 'mongoose'
import Admin from '../models/Admin.js'
import Teacher from '../models/Teacher.js'
import { hashPassword } from '../utils/auth.js'

dotenv.config()

const asTrimmedString = (value) =>
  typeof value === 'string' ? value.trim() : ''

const readArgValue = (name) => {
  const index = process.argv.indexOf(name)
  if (index === -1) return ''
  return asTrimmedString(process.argv[index + 1] || '')
}

const normalizeType = (value) => {
  if (value === 'admin') return 'admin'
  if (value === 'teacher') return 'teacher'
  return ''
}

const printUsage = () => {
  // eslint-disable-next-line no-console
  console.log(
    'Usage: npm run users:password -- --email <user@email.com> --password <newPassword>',
  )
  // eslint-disable-next-line no-console
  console.log('   or: npm run users:password -- --id <userId> --password <newPassword>')
  // eslint-disable-next-line no-console
  console.log('Optional: add --type <admin|teacher> to select collection explicitly')
}

const start = async () => {
  const id = readArgValue('--id')
  const email = readArgValue('--email').toLowerCase()
  const password = readArgValue('--password')
  const userType = normalizeType(readArgValue('--type').toLowerCase())

  if (!password) {
    printUsage()
    process.exitCode = 1
    return
  }

  if (readArgValue('--type') && !userType) {
    throw new Error('Type must be either admin or teacher')
  }

  if (!id && !email) {
    printUsage()
    process.exitCode = 1
    return
  }

  const mongoUri = asTrimmedString(process.env.MONGO_URI)
  if (!mongoUri) {
    throw new Error('MONGO_URI is required')
  }

  await mongoose.connect(mongoUri)

  const filter = id ? { _id: id } : { email }
  const findUser = async () => {
    if (userType === 'admin') {
      const admin = await Admin.findOne(filter)
      return admin ? { doc: admin, type: 'admin' } : null
    }
    if (userType === 'teacher') {
      const teacher = await Teacher.findOne(filter)
      return teacher ? { doc: teacher, type: 'teacher' } : null
    }

    const [admin, teacher] = await Promise.all([
      Admin.findOne(filter),
      Teacher.findOne(filter),
    ])
    if (admin) return { doc: admin, type: 'admin' }
    if (teacher) return { doc: teacher, type: 'teacher' }
    return null
  }

  const found = await findUser()
  if (!found) {
    throw new Error('User not found')
  }

  found.doc.passwordHash = hashPassword(password)
  await found.doc.save()

  // eslint-disable-next-line no-console
  console.log(
    `Password updated for ${found.doc.email} (${found.doc._id}) [${found.type}]`,
  )
}

start()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error('Failed to change password:', error.message)
    process.exitCode = 1
  })
  .finally(async () => {
    try {
      if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect()
      }
    } catch {
      // ignore disconnect errors
    }
  })
