import mongoose from 'mongoose'

const whatsAppUsageSchema = new mongoose.Schema(
  {
    collegeId: { type: String, required: true, trim: true, default: 'default', index: true },
    monthKey: { type: String, required: true, trim: true, index: true },
    attemptedCount: { type: Number, required: true, default: 0, min: 0 },
  },
  { timestamps: true },
)

whatsAppUsageSchema.index({ collegeId: 1, monthKey: 1 }, { unique: true })

const WhatsAppUsage = mongoose.model('WhatsAppUsage', whatsAppUsageSchema)

export default WhatsAppUsage
