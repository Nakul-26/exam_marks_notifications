import mongoose from 'mongoose'

const adminSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true },
    passwordHash: { type: String, required: false, trim: true, select: false },
  },
  { timestamps: true },
)

const Admin = mongoose.model('Admin', adminSchema)

export default Admin
