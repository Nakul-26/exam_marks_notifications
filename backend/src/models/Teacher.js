import mongoose from 'mongoose'

const teacherSchema = new mongoose.Schema(
  {
    collegeId: { type: String, required: true, trim: true, default: 'default', index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, required: true, trim: true },
    passwordHash: { type: String, required: false, trim: true, select: false },
    failedLoginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date, default: null },
  },
  { timestamps: true },
)

teacherSchema.index({ collegeId: 1, email: 1 }, { unique: true })
teacherSchema.index({ collegeId: 1, phone: 1 }, { unique: true })

const Teacher = mongoose.model('Teacher', teacherSchema)

export default Teacher
