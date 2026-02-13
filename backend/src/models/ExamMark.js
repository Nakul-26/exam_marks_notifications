import mongoose from 'mongoose'

const examMarkSchema = new mongoose.Schema(
  {
    examId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Exam',
      required: true,
      index: true,
    },
    examSubjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ExamSubject',
      required: true,
      index: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
      index: true,
    },
    marksObtained: {
      type: Number,
      required: true,
      min: 0,
    },
    remarks: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { timestamps: true },
)

examMarkSchema.index({ examSubjectId: 1, studentId: 1 }, { unique: true })

const ExamMark = mongoose.model('ExamMark', examMarkSchema)

export default ExamMark
