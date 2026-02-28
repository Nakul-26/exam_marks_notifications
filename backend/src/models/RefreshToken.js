import mongoose from 'mongoose'

const refreshTokenSchema = new mongoose.Schema(
  {
    collegeId: { type: String, required: true, trim: true, default: 'default', index: true },
    userId: { type: String, required: true, trim: true, index: true },
    userRole: { type: String, required: true, trim: true, enum: ['admin', 'teacher'], index: true },
    tokenHash: { type: String, required: true, trim: true, unique: true, index: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null, index: true },
    revokeReason: { type: String, trim: true, default: '' },
    replacedByTokenHash: { type: String, trim: true, default: '' },
    createdByIp: { type: String, trim: true, default: '' },
    createdByUserAgent: { type: String, trim: true, default: '' },
  },
  { timestamps: true },
)

refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })
refreshTokenSchema.index({ collegeId: 1, userId: 1, userRole: 1, revokedAt: 1 })

const RefreshToken = mongoose.model('RefreshToken', refreshTokenSchema)

export default RefreshToken
