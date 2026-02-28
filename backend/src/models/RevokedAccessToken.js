import mongoose from 'mongoose'

const revokedAccessTokenSchema = new mongoose.Schema(
  {
    tokenHash: { type: String, required: true, trim: true, unique: true, index: true },
    expiresAt: { type: Date, required: true },
    reason: { type: String, trim: true, default: '' },
  },
  { timestamps: true },
)

revokedAccessTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

const RevokedAccessToken = mongoose.model('RevokedAccessToken', revokedAccessTokenSchema)

export default RevokedAccessToken
