import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import mongoSanitize from 'express-mongo-sanitize'
import rateLimit from 'express-rate-limit'
import helmet from 'helmet'
import mongoose from 'mongoose'
import morgan from 'morgan'
import authRoutes from './routes/authRoutes.js'
import auditLogRoutes from './routes/auditLogRoutes.js'
import classRoutes from './routes/classRoutes.js'
import classStudentRoutes from './routes/classStudentRoutes.js'
import classSubjectRoutes from './routes/classSubjectRoutes.js'
import examRoutes from './routes/examRoutes.js'
import examMarkRoutes from './routes/examMarkRoutes.js'
import examSubjectRoutes from './routes/examSubjectRoutes.js'
import notificationRoutes from './routes/notificationRoutes.js'
import studentRoutes from './routes/studentRoutes.js'
import subjectRoutes from './routes/subjectRoutes.js'
import teacherRoutes from './routes/teacherRoutes.js'
import teacherSubjectRoutes from './routes/teacherSubjectRoutes.js'
import { logAuditForRequest, shouldAuditRequest } from './utils/auditLog.js'

dotenv.config()

const app = express()
const port = process.env.PORT || 5000
const mongoUri = process.env.MONGO_URI
const jwtSecret = process.env.JWT_SECRET
const nodeEnv = (process.env.NODE_ENV || 'development').trim().toLowerCase()
const isProduction = nodeEnv === 'production'
const rateLimitWindowMs = Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000)
const rateLimitMax = Number(process.env.RATE_LIMIT_MAX || 100)
const authRateLimitMax = Number(process.env.AUTH_RATE_LIMIT_MAX || 20)
const corsOriginRaw = process.env.CORS_ORIGINS || ''
const allowedCorsOrigins = corsOriginRaw
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

if (!allowedCorsOrigins.length && !isProduction) {
  allowedCorsOrigins.push(
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
  )
}

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) {
      callback(null, true)
      return
    }

    if (allowedCorsOrigins.includes(origin)) {
      callback(null, true)
      return
    }

    callback(new Error('CORS origin not allowed'))
  },
  credentials: true,
}

const apiLimiter = rateLimit({
  windowMs: Number.isFinite(rateLimitWindowMs) ? rateLimitWindowMs : 15 * 60 * 1000,
  max: Number.isFinite(rateLimitMax) ? rateLimitMax : 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later.' },
})

const authLimiter = rateLimit({
  windowMs: Number.isFinite(rateLimitWindowMs) ? rateLimitWindowMs : 15 * 60 * 1000,
  max: Number.isFinite(authRateLimitMax) ? authRateLimitMax : 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many authentication attempts, please try again later.' },
})

if (isProduction) {
  app.set('trust proxy', 1)
}

app.use(helmet())
app.use(cors(corsOptions))
app.use(express.json({ limit: '1mb' }))
app.use(mongoSanitize())

if (!isProduction) {
  app.use(morgan('dev'))
}

app.use('/api', apiLimiter)
app.use((req, res, next) => {
  if (shouldAuditRequest(req)) {
    res.on('finish', () => {
      void logAuditForRequest(req, res)
    })
  }
  next()
})

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.use('/api/auth', authLimiter, authRoutes)
app.use('/api/audit-logs', auditLogRoutes)
app.use('/api/students', studentRoutes)
app.use('/api/exams', examRoutes)
app.use('/api/exam-marks', examMarkRoutes)
app.use('/api/exam-subjects', examSubjectRoutes)
app.use('/api/subjects', subjectRoutes)
app.use('/api/teachers', teacherRoutes)
app.use('/api/teacher-subjects', teacherSubjectRoutes)
app.use('/api/classes', classRoutes)
app.use('/api/class-subjects', classSubjectRoutes)
app.use('/api/class-students', classStudentRoutes)
app.use('/api/notifications', notificationRoutes)

app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' })
})

app.use((error, _req, res, _next) => {
  const statusCode = Number(error?.status) || 500
  // eslint-disable-next-line no-console
  console.error(error)
  res.status(statusCode).json({
    message: isProduction ? 'Something went wrong' : error?.message || 'Something went wrong',
  })
})

const start = async () => {
  if (!mongoUri) {
    throw new Error('MONGO_URI is required')
  }
  if (!jwtSecret) {
    throw new Error('JWT_SECRET is required')
  }
  if (isProduction && !allowedCorsOrigins.length) {
    throw new Error('CORS_ORIGINS is required in production')
  }

  await mongoose.connect(mongoUri)
  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`Server running on http://localhost:${port}`)
    console.log('Connected to MongoDB')
  })
}

start().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start server', error)
  process.exit(1)
})
