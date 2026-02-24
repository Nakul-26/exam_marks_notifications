import { useEffect, useMemo, useState } from 'react'

type AuditLogRow = {
  _id: string
  actorId: string
  actorRole: string
  actorName: string
  actorEmail: string
  action: string
  status: 'success' | 'failure'
  statusCode: number
  method: string
  path: string
  ip: string
  userAgent: string
  createdAt: string
}

type AuditLogsResponse = {
  data?: AuditLogRow[]
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  message?: string
}

type AuditLogsPageProps = {
  authToken: string
}

const auditLogsApiPath = '/api/audit-logs'

function AuditLogsPage({ authToken }: AuditLogsPageProps) {
  const [rows, setRows] = useState<AuditLogRow[]>([])
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(50)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [actorRole, setActorRole] = useState('')
  const [status, setStatus] = useState('')
  const [action, setAction] = useState('')
  const [path, setPath] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const authHeader = useMemo(
    () => ({ Authorization: `Bearer ${authToken}` }),
    [authToken],
  )

  useEffect(() => {
    const controller = new AbortController()

    const loadAuditLogs = async () => {
      try {
        setLoading(true)
        setError('')

        const params = new URLSearchParams()
        params.set('page', String(page))
        params.set('limit', String(limit))
        if (actorRole) params.set('actorRole', actorRole)
        if (status) params.set('status', status)
        if (action.trim()) params.set('action', action.trim())
        if (path.trim()) params.set('path', path.trim())
        if (from) params.set('from', from)
        if (to) params.set('to', to)

        const response = await fetch(`${auditLogsApiPath}?${params.toString()}`, {
          headers: authHeader,
          signal: controller.signal,
        })
        const payload = (await response.json()) as AuditLogsResponse

        if (!response.ok) {
          throw new Error(payload.message || 'Failed to load audit logs')
        }

        const nextRows = Array.isArray(payload.data) ? payload.data : []
        const pagination = payload.pagination
        setRows(nextRows)
        setTotal(pagination?.total || 0)
        setTotalPages(Math.max(1, pagination?.totalPages || 1))
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          return
        }
        const message = err instanceof Error ? err.message : 'Unexpected error'
        setError(message)
        setRows([])
        setTotal(0)
        setTotalPages(1)
      } finally {
        setLoading(false)
      }
    }

    void loadAuditLogs()
    return () => controller.abort()
  }, [action, actorRole, authHeader, from, limit, page, path, status, to])

  const handleExportCsv = async () => {
    const params = new URLSearchParams()
    params.set('limit', String(Math.min(limit * 20, 5000)))
    if (actorRole) params.set('actorRole', actorRole)
    if (status) params.set('status', status)
    if (action.trim()) params.set('action', action.trim())
    if (path.trim()) params.set('path', path.trim())
    if (from) params.set('from', from)
    if (to) params.set('to', to)

    try {
      setError('')
      const response = await fetch(`${auditLogsApiPath}/export?${params.toString()}`, {
        headers: authHeader,
      })
      if (!response.ok) {
        throw new Error('Failed to export audit logs')
      }

      const blob = await response.blob()
      const downloadUrl = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = downloadUrl
      anchor.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(anchor)
      anchor.click()
      document.body.removeChild(anchor)
      URL.revokeObjectURL(downloadUrl)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unexpected error'
      setError(message)
    }
  }

  return (
    <>
      {error ? <p className="error">{error}</p> : null}

      <section className="panel panel-compact">
        <div className="stats-row">
          <div className="stat-card">
            <span>Total Logs</span>
            <strong>{total}</strong>
          </div>
          <label className="filter-field">
            <span>Role</span>
            <select
              value={actorRole}
              onChange={(event) => {
                setActorRole(event.target.value)
                setPage(1)
              }}
            >
              <option value="">All Roles</option>
              <option value="admin">Admin</option>
              <option value="teacher">Teacher</option>
            </select>
          </label>
          <label className="filter-field">
            <span>Status</span>
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value)
                setPage(1)
              }}
            >
              <option value="">All</option>
              <option value="success">Success</option>
              <option value="failure">Failure</option>
            </select>
          </label>
          <label className="filter-field">
            <span>Page Size</span>
            <select
              value={String(limit)}
              onChange={(event) => {
                setLimit(Number(event.target.value))
                setPage(1)
              }}
            >
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
              <option value="200">200</option>
            </select>
          </label>
        </div>

        <div className="stats-row" style={{ marginTop: '0.75rem' }}>
          <label className="filter-field">
            <span>From</span>
            <input
              type="date"
              value={from}
              onChange={(event) => {
                setFrom(event.target.value)
                setPage(1)
              }}
            />
          </label>
          <label className="filter-field">
            <span>To</span>
            <input
              type="date"
              value={to}
              onChange={(event) => {
                setTo(event.target.value)
                setPage(1)
              }}
            />
          </label>
          <div className="search-wrap">
            <label htmlFor="search-audit-action">Search action</label>
            <input
              id="search-audit-action"
              placeholder="e.g. POST /api/students"
              value={action}
              onChange={(event) => {
                setAction(event.target.value)
                setPage(1)
              }}
            />
          </div>
          <div className="search-wrap">
            <label htmlFor="search-audit-path">Search path</label>
            <input
              id="search-audit-path"
              placeholder="e.g. /api/notifications"
              value={path}
              onChange={(event) => {
                setPath(event.target.value)
                setPage(1)
              }}
            />
          </div>
        </div>
      </section>

      <section className="panel">
        <h2>Audit Entries</h2>
        {loading ? <p>Loading...</p> : null}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Actor</th>
                <th>Role</th>
                <th>Action</th>
                <th>Status</th>
                <th>Path</th>
                <th>IP</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row._id}>
                  <td>{new Date(row.createdAt).toLocaleString()}</td>
                  <td>{row.actorName || row.actorEmail || row.actorId || '-'}</td>
                  <td>{row.actorRole || '-'}</td>
                  <td>{row.action || `${row.method} ${row.path}`}</td>
                  <td>{row.status === 'success' ? 'Success' : `Failure (${row.statusCode})`}</td>
                  <td>{row.path}</td>
                  <td>{row.ip || '-'}</td>
                </tr>
              ))}
              {!rows.length && !loading ? (
                <tr>
                  <td colSpan={7}>No audit logs found for selected filters.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="actions" style={{ marginTop: '0.75rem' }}>
          <button
            type="button"
            className="secondary"
            onClick={() => setPage((value) => Math.max(1, value - 1))}
            disabled={page <= 1 || loading}
          >
            Previous
          </button>
          <button
            type="button"
            className="secondary"
            onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
            disabled={page >= totalPages || loading}
          >
            Next
          </button>
          <p style={{ margin: 0 }}>
            Page {page} of {totalPages}
          </p>
          <button
            type="button"
            className="primary"
            onClick={() => void handleExportCsv()}
            disabled={loading}
          >
            Export CSV
          </button>
        </div>
      </section>
    </>
  )
}

export default AuditLogsPage
