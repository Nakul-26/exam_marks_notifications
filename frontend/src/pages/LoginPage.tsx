import { useState } from 'react'
import type { FormEvent } from 'react'

type LoginUser = {
  id: string
  role: 'admin' | 'teacher'
  name: string
  email: string
}

type LoginPageProps = {
  onLoginSuccess: (payload: { token?: string; accessToken?: string; user: LoginUser }) => void
}

const authApiPath = '/api/auth/login'

const parseResponsePayload = async (response: Response) => {
  const contentType = (response.headers.get('content-type') || '').toLowerCase()

  if (contentType.includes('application/json')) {
    try {
      return await response.json()
    } catch {
      return {}
    }
  }

  const text = await response.text().catch(() => '')
  if (!text) {
    return {}
  }

  try {
    return JSON.parse(text)
  } catch {
    return { message: text }
  }
}

function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    try {
      setLoading(true)
      setError('')

      const response = await fetch(authApiPath, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: email.trim(), password }),
      })
      const payload = await parseResponsePayload(response)
      if (!response.ok) {
        throw new Error(payload?.message || 'Login failed')
      }

      if (!payload?.data?.user) {
        throw new Error('Invalid login response from server')
      }
      onLoginSuccess(payload.data)
    } catch (err) {
      const message =
        err instanceof TypeError
          ? 'Unable to reach server. Please confirm backend is running on port 5000.'
          : err instanceof Error
            ? err.message
            : 'Unexpected error'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="page">
      <section className="panel" style={{ maxWidth: 520, margin: '4rem auto 0' }}>
        <h2>Login</h2>
        {error ? <p className="error">{error}</p> : null}
        <form className="student-form" onSubmit={handleSubmit}>
          <label className="field field-full">
            <span>Email</span>
            <input
              type="email"
              placeholder="Enter email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label className="field field-full">
            <span>Password</span>
            <div className="password-field">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </label>
          <div className="actions">
            <button type="submit" className="primary" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </div>
        </form>
      </section>
    </main>
  )
} 

export default LoginPage
