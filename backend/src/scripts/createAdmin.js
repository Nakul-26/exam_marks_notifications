import dotenv from 'dotenv'
import mongoose from 'mongoose'
import Admin from '../models/Admin.js'
import { hashPassword } from '../utils/auth.js'

dotenv.config()

const asTrimmedString = (value) =>
  typeof value === 'string' ? value.trim() : ''

const readArgValue = (name) => {
  const index = process.argv.indexOf(name)
  if (index === -1) return ''
  return asTrimmedString(process.argv[index + 1] || '')
}

const printUsage = () => {
  // eslint-disable-next-line no-console
  console.log(
    'Usage: npm run users:create-admin -- --name "Admin Name" --email admin@example.com --password NewPass123',
  )
}

const start = async () => {
  const mongoUri = asTrimmedString(process.env.MONGO_URI)
  if (!mongoUri) {
    throw new Error('MONGO_URI is required')
  }

  const name = readArgValue('--name')
  const email = readArgValue('--email').toLowerCase()
  const password = readArgValue('--password')

  if (!name || !email || !password) {
    printUsage()
    process.exitCode = 1
    return
  }

  await mongoose.connect(mongoUri)

  const existing = await Admin.findOne({ email }).lean()
  if (existing) {
    throw new Error('Admin with this email already exists')
  }

  const admin = await Admin.create({
    name,
    email,
    passwordHash: hashPassword(password),
  })

  // eslint-disable-next-line no-console
  console.log(`Admin created: ${admin.email} (${admin._id})`)
}

start()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error('Failed to create admin:', error.message)
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
