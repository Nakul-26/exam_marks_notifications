import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import mongoose from 'mongoose'
import classRoutes from './routes/classRoutes.js'
import classStudentRoutes from './routes/classStudentRoutes.js'
import classSubjectRoutes from './routes/classSubjectRoutes.js'
import examRoutes from './routes/examRoutes.js'
import studentRoutes from './routes/studentRoutes.js'
import subjectRoutes from './routes/subjectRoutes.js'

dotenv.config()

const app = express()
const port = process.env.PORT || 5000
const mongoUri = process.env.MONGO_URI

app.use(cors())
app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.use('/api/students', studentRoutes)
app.use('/api/exams', examRoutes)
app.use('/api/subjects', subjectRoutes)
app.use('/api/classes', classRoutes)
app.use('/api/class-subjects', classSubjectRoutes)
app.use('/api/class-students', classStudentRoutes)

const start = async () => {
  if (!mongoUri) {
    throw new Error('MONGO_URI is required')
  }

  await mongoose.connect(mongoUri)
  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`Server running on http://localhost:${port}`)
  })
}

start().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start server', error)
  process.exit(1)
})
