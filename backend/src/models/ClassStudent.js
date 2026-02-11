import mongoose from 'mongoose'

const classStudentSchema = new mongoose.Schema(
  {
    className: { type: String, required: true, trim: true },
    section: { type: String, required: true, trim: true },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
  },
  { timestamps: true },
)

classStudentSchema.index({ className: 1, section: 1, student: 1 }, { unique: true })

const ClassStudent = mongoose.model('ClassStudent', classStudentSchema)

export default ClassStudent
