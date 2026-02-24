import mongoose from 'mongoose'

const subjectSchema = new mongoose.Schema(
  {
    collegeId: { type: String, required: true, trim: true, default: 'default', index: true },
    name: { type: String, required: true, trim: true },
  },
  { timestamps: true },
)

subjectSchema.index({ collegeId: 1, name: 1 }, { unique: true })

const Subject = mongoose.model('Subject', subjectSchema)

export default Subject
