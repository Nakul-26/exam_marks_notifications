import mongoose from 'mongoose'

const examMarkSchema = new mongoose.Schema(
  {
    collegeId: { type: String, required: true, trim: true, default: 'default', index: true },
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

examMarkSchema.index({ collegeId: 1, examSubjectId: 1, studentId: 1 }, { unique: true })

const ExamMark = mongoose.model('ExamMark', examMarkSchema)

export default ExamMark
