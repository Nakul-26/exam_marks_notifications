import mongoose from 'mongoose'

const teacherSubjectSchema = new mongoose.Schema(
  {
    className: { type: String, required: true, trim: true },
    section: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Teacher',
      required: true,
      index: true,
    },
    teacherName: { type: String, required: true, trim: true },
  },
  { timestamps: true },
)

teacherSubjectSchema.index({ className: 1, section: 1, subject: 1 }, { unique: true })

const TeacherSubject = mongoose.model('TeacherSubject', teacherSubjectSchema)

export default TeacherSubject
