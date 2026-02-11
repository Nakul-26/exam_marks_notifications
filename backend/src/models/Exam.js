import mongoose from 'mongoose'

const examSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    examDate: { type: Date, required: true },
    totalMarks: { type: Number, required: true, min: 1 },
    targets: [
      {
        className: { type: String, required: true, trim: true },
        section: { type: String, required: true, trim: true },
        subjects: [{ type: String, required: true, trim: true }],
      },
    ],
  },
  { timestamps: true },
)

const Exam = mongoose.model('Exam', examSchema)

export default Exam
