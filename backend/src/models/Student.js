import mongoose from 'mongoose'

const studentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    rollNo: { type: String, required: true, trim: true, unique: true },
    fatherName: { type: String, required: true, trim: true },
    studentPhone: { type: String, required: true, trim: true },
    fatherPhone: { type: String, required: true, trim: true },
  },
  { timestamps: true },
)

const Student = mongoose.model('Student', studentSchema)

export default Student
