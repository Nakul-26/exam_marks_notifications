import mongoose from 'mongoose'

const studentSchema = new mongoose.Schema(
  {
    collegeId: { type: String, required: true, trim: true, default: 'default', index: true },
    name: { type: String, required: true, trim: true },
    rollNo: { type: String, required: true, trim: true },
    fatherName: { type: String, required: true, trim: true },
    studentPhone: { type: String, required: true, trim: true },
    fatherPhone: { type: String, required: true, trim: true },
  },
  { timestamps: true },
)

studentSchema.index({ collegeId: 1, rollNo: 1 }, { unique: true })

const Student = mongoose.model('Student', studentSchema)

export default Student
