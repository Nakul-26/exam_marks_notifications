import { Router } from 'express'
import AuditLog from '../models/AuditLog.js'
import { authorizeRoles, requireAuth } from '../middleware/authMiddleware.js'
import { withCollegeScope } from '../utils/tenant.js'

const router = Router()
router.use(requireAuth)
router.use(authorizeRoles('admin'))

const asTrimmedString = (value) =>
  typeof value === 'string' ? value.trim() : ''

const asPositiveInt = (value, fallback) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 1) return fallback
  return Math.floor(parsed)
}

const escapeCsvValue = (value) => {
  const text = value === undefined || value === null ? '' : String(value)
  const escaped = text.replace(/"/g, '""')
  return `"${escaped}"`
}

const buildAuditQuery = (req) => {
  const actorRole = asTrimmedString(req.query.actorRole)
  const action = asTrimmedString(req.query.action)
  const status = asTrimmedString(req.query.status)
  const path = asTrimmedString(req.query.path)
  const from = asTrimmedString(req.query.from)
  const to = asTrimmedString(req.query.to)

  const query = withCollegeScope(req.user.collegeId, {})
  if (actorRole) {
    query.actorRole = actorRole
  }
  if (action) {
    query.action = { $regex: action, $options: 'i' }
  }
  if (status && ['success', 'failure'].includes(status)) {
    query.status = status
  }
  if (path) {
    query.path = { $regex: path, $options: 'i' }
  }

  const createdAt = {}
  if (from) {
    const fromDate = new Date(from)
    if (!Number.isNaN(fromDate.getTime())) {
      createdAt.$gte = fromDate
    }
  }
  if (to) {
    const toDate = new Date(to)
    if (!Number.isNaN(toDate.getTime())) {
      toDate.setHours(23, 59, 59, 999)
      createdAt.$lte = toDate
    }
  }
  if (createdAt.$gte || createdAt.$lte) {
    query.createdAt = createdAt
  }

  return query
}

router.get('/', async (req, res) => {
  try {
    const page = asPositiveInt(req.query.page, 1)
    const limit = Math.min(asPositiveInt(req.query.limit, 50), 200)
    const query = buildAuditQuery(req)

    const skip = (page - 1) * limit
    const [rows, total] = await Promise.all([
      AuditLog.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments(query),
    ])

    return res.json({
      data: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (_error) {
    return res.status(500).json({ message: 'Failed to fetch audit logs' })
  }
})

router.get('/export', async (req, res) => {
  try {
    const limit = Math.min(asPositiveInt(req.query.limit, 1000), 5000)
    const query = buildAuditQuery(req)
    const rows = await AuditLog.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()

    const headers = [
      'createdAt',
      'actorRole',
      'actorName',
      'actorEmail',
      'action',
      'status',
      'statusCode',
      'method',
      'path',
      'ip',
      'message',
    ]
    const lines = [headers.join(',')]

    for (const row of rows) {
      lines.push(
        [
          row.createdAt ? new Date(row.createdAt).toISOString() : '',
          row.actorRole || '',
          row.actorName || '',
          row.actorEmail || '',
          row.action || '',
          row.status || '',
          row.statusCode ?? '',
          row.method || '',
          row.path || '',
          row.ip || '',
          row.message || '',
        ]
          .map(escapeCsvValue)
          .join(','),
      )
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="audit-logs-${new Date().toISOString().slice(0, 10)}.csv"`,
    )
    return res.send(lines.join('\n'))
  } catch (_error) {
    return res.status(500).json({ message: 'Failed to export audit logs' })
  }
})

export default router
