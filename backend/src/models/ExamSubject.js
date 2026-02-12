import mongoose from 'mongoose'

const examSubjectSchema = new mongoose.Schema(
  {
    examId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Exam',
      required: true,
      index: true,
    },
    subjectId: { type: String, required: true, trim: true },
    examDate: { type: Date, required: true },
    totalMarks: { type: Number, required: true, min: 1 },
    passingMarks: { type: Number, required: true, min: 0 },
    instructions: { type: String, trim: true, default: '' },
  },
  { timestamps: true },
)

examSubjectSchema.index({ examId: 1, subjectId: 1 }, { unique: true })

const ExamSubject = mongoose.model('ExamSubject', examSubjectSchema)

export default ExamSubject
