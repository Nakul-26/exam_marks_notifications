import RevokedAccessToken from '../models/RevokedAccessToken.js'
import { hashOpaqueToken, verifyToken } from '../utils/auth.js'
import { getDefaultCollegeId } from '../utils/tenant.js'

const getBearerToken = (authorizationHeader) => {
  if (typeof authorizationHeader !== 'string') return ''
  const [scheme, token] = authorizationHeader.split(' ')
  if (scheme !== 'Bearer' || !token) return ''
  return token.trim()
}

export const requireAuth = async (req, res, next) => {
  try {
    const token = getBearerToken(req.headers.authorization)
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' })
    }

    const payload = verifyToken(token)
    const tokenHash = hashOpaqueToken(token)
    const revokedToken = await RevokedAccessToken.findOne({ tokenHash })
      .select({ _id: 1 })
      .lean()
    if (revokedToken) {
      return res.status(401).json({ message: 'Authentication failed' })
    }

    req.user = {
      id: String(payload.id || ''),
      role: String(payload.role || ''),
      name: String(payload.name || ''),
      email: String(payload.email || ''),
      collegeId: String(payload.collegeId || getDefaultCollegeId()),
    }

    if (!req.user.id || !req.user.role) {
      return res.status(401).json({ message: 'Authentication payload is invalid' })
    }

    return next()
  } catch (_error) {
    return res.status(401).json({ message: 'Authentication failed' })
  }
}

export const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user?.role || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' })
    }
    return next()
  }
}
