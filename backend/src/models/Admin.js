import mongoose from 'mongoose'

const adminSchema = new mongoose.Schema(
  {
    collegeId: { type: String, required: true, trim: true, default: 'default', index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    passwordHash: { type: String, required: false, trim: true, select: false },
    failedLoginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date, default: null },
  },
  { timestamps: true },
)

adminSchema.index({ collegeId: 1, email: 1 }, { unique: true })

const Admin = mongoose.model('Admin', adminSchema)

export default Admin
