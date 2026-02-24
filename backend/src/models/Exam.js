import mongoose from 'mongoose'

const examSchema = new mongoose.Schema(
  {
    collegeId: { type: String, required: true, trim: true, default: 'default', index: true },
    examName: { type: String, required: true, trim: true },
    examClasses: [
      {
        classId: { type: String, required: true, trim: true },
        sectionId: { type: String, required: true, trim: true },
        _id: false,
      },
    ],
    classId: { type: String, required: true, trim: true },
    sectionId: { type: String, required: true, trim: true },
    academicYear: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
    status: {
      type: String,
      enum: ['draft', 'published', 'completed'],
      default: 'draft',
      required: true,
    },
  },
  { timestamps: true },
)

examSchema.index({ collegeId: 1, classId: 1, sectionId: 1, academicYear: 1 })
examSchema.index({ collegeId: 1, 'examClasses.classId': 1, 'examClasses.sectionId': 1, academicYear: 1 })
examSchema.index({ collegeId: 1, examName: 1, classId: 1, sectionId: 1, academicYear: 1 }, { unique: true })

const Exam = mongoose.model('Exam', examSchema)

export default Exam
