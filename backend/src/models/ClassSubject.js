import mongoose from 'mongoose'

const classSubjectSchema = new mongoose.Schema(
  {
    className: { type: String, required: true, trim: true },
    section: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },
  },
  { timestamps: true },
)

classSubjectSchema.index({ className: 1, section: 1, subject: 1 }, { unique: true })

const ClassSubject = mongoose.model('ClassSubject', classSubjectSchema)

export default ClassSubject
