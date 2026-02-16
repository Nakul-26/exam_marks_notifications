import mongoose from 'mongoose'

const teacherSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true },
    phone: { type: String, required: true, trim: true, unique: true },
    passwordHash: { type: String, required: false, trim: true, select: false },
  },
  { timestamps: true },
)

const Teacher = mongoose.model('Teacher', teacherSchema)

export default Teacher
