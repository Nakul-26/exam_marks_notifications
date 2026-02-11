import mongoose from 'mongoose'

const subjectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
  },
  { timestamps: true },
)

subjectSchema.index({ name: 1 }, { unique: true })

const Subject = mongoose.model('Subject', subjectSchema)

export default Subject
