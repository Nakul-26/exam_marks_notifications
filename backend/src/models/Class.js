import mongoose from 'mongoose'

const classSchema = new mongoose.Schema(
  {
    collegeId: { type: String, required: true, trim: true, default: 'default', index: true },
    className: { type: String, required: true, trim: true },
    section: { type: String, required: true, trim: true },
  },
  { timestamps: true },
)

classSchema.index({ collegeId: 1, className: 1, section: 1 }, { unique: true })

const ClassModel = mongoose.model('Class', classSchema)

export default ClassModel
