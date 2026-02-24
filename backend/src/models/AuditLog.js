import mongoose from 'mongoose'

const auditLogSchema = new mongoose.Schema(
  {
    collegeId: { type: String, required: true, trim: true, default: 'default', index: true },
    actorId: { type: String, trim: true, default: '' },
    actorRole: { type: String, trim: true, default: '' },
    actorName: { type: String, trim: true, default: '' },
    actorEmail: { type: String, trim: true, default: '' },
    action: { type: String, required: true, trim: true },
    resourceType: { type: String, required: true, trim: true, default: 'api' },
    resourceId: { type: String, trim: true, default: '' },
    status: {
      type: String,
      enum: ['success', 'failure'],
      required: true,
      default: 'success',
    },
    statusCode: { type: Number, required: true },
    method: { type: String, required: true, trim: true },
    path: { type: String, required: true, trim: true },
    ip: { type: String, trim: true, default: '' },
    userAgent: { type: String, trim: true, default: '' },
    message: { type: String, trim: true, default: '' },
  },
  { timestamps: true },
)

auditLogSchema.index({ createdAt: -1 })
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 180 })
auditLogSchema.index({ collegeId: 1, createdAt: -1 })
auditLogSchema.index({ actorId: 1, createdAt: -1 })
auditLogSchema.index({ action: 1, createdAt: -1 })
auditLogSchema.index({ path: 1, createdAt: -1 })

const AuditLog = mongoose.model('AuditLog', auditLogSchema)

export default AuditLog
