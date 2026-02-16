import { useState } from 'react'
import type { FormEvent } from 'react'

type LoginUser = {
  id: string
  role: 'admin' | 'teacher'
  name: string
  email: string
}

type LoginPageProps = {
  onLoginSuccess: (payload: { token: string; user: LoginUser }) => void
}

const authApiPath = '/api/auth/login'

function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
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
        body: JSON.stringify({ email: email.trim(), password }),
      })
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload.message || 'Login failed')
      }

      onLoginSuccess(payload.data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unexpected error'
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
            <input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
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
