import dotenv from 'dotenv'
import mongoose from 'mongoose'
import Admin from '../models/Admin.js'
import { hashPassword } from '../utils/auth.js'
import { getMongoConnectionConfig } from '../utils/db.js'
import { getDefaultCollegeId } from '../utils/tenant.js'

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
    'Usage: npm run users:admin-password -- --email admin@example.com --password NewPass123',
  )
  // eslint-disable-next-line no-console
  console.log('   or: npm run users:admin-password -- --id <adminId> --password NewPass123')
}

const start = async () => {
  const id = readArgValue('--id')
  const email = readArgValue('--email').toLowerCase()
  const password = readArgValue('--password')
  const collegeId = readArgValue('--collegeId') || getDefaultCollegeId()

  if (!password || (!id && !email)) {
    printUsage()
    process.exitCode = 1
    return
  }

  const { mongoUri, mongoOptions } = getMongoConnectionConfig()
  await mongoose.connect(mongoUri, mongoOptions)

  const filter = id ? { _id: id, collegeId } : { email, collegeId }
  const admin = await Admin.findOne(filter)
  if (!admin) {
    throw new Error('Admin not found')
  }

  admin.passwordHash = hashPassword(password)
  await admin.save()

  // eslint-disable-next-line no-console
  console.log(`Admin password updated for ${admin.email} (${admin._id})`)
}

start()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error('Failed to change admin password:', error.message)
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
