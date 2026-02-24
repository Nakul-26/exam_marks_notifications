import AuditLog from '../models/AuditLog.js'
import { resolveCollegeIdFromUser } from './tenant.js'

const writeMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

const asTrimmedString = (value) =>
  typeof value === 'string' ? value.trim() : ''

const getResourceIdFromPath = (path) => {
  const cleanPath = asTrimmedString(path).split('?')[0]
  if (!cleanPath) return ''
  const parts = cleanPath.split('/').filter(Boolean)
  if (!parts.length) return ''
  const candidate = parts[parts.length - 1]
  if (candidate.startsWith(':')) return ''
  if (candidate === 'api') return ''
  return candidate
}

export const shouldAuditRequest = (req) => {
  if (!req?.user?.id) return false
  const method = asTrimmedString(req.method).toUpperCase()
  if (!writeMethods.has(method)) return false
  const path = asTrimmedString(req.originalUrl || req.path)
  if (!path.startsWith('/api/')) return false
  if (path.startsWith('/api/auth/')) return false
  if (path === '/api/health') return false
  return true
}

export const logAuditForRequest = async (req, res) => {
  try {
    if (!shouldAuditRequest(req)) return

    const statusCode = Number(res?.statusCode || 0)
    const method = asTrimmedString(req.method).toUpperCase()
    const path = asTrimmedString(req.originalUrl || req.path)
    const actor = req.user || {}
    const resourceId = getResourceIdFromPath(path)

    await AuditLog.create({
      collegeId: resolveCollegeIdFromUser(actor),
      actorId: asTrimmedString(actor.id),
      actorRole: asTrimmedString(actor.role),
      actorName: asTrimmedString(actor.name),
      actorEmail: asTrimmedString(actor.email),
      action: `${method} ${path.split('?')[0]}`,
      resourceType: 'api',
      resourceId,
      status: statusCode >= 400 ? 'failure' : 'success',
      statusCode,
      method,
      path,
      ip: asTrimmedString(req.ip),
      userAgent: asTrimmedString(req.get('user-agent')),
      message: statusCode >= 400 ? 'Request failed' : 'Request completed',
    })
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to write audit log', error)
  }
}
