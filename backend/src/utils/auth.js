import crypto from 'crypto'

const parseDurationSeconds = (rawValue, fallbackSeconds) => {
  const value = typeof rawValue === 'string' ? rawValue.trim() : ''
  if (!value) return fallbackSeconds

  if (/^\d+$/.test(value)) {
    return Number(value)
  }

  const match = value.match(/^(\d+)([smhd])$/i)
  if (!match) return fallbackSeconds

  const amount = Number(match[1])
  const unit = match[2].toLowerCase()
  if (unit === 's') return amount
  if (unit === 'm') return amount * 60
  if (unit === 'h') return amount * 60 * 60
  if (unit === 'd') return amount * 60 * 60 * 24
  return fallbackSeconds
}

const encodeBase64Url = (value) => {
  return Buffer.from(value).toString('base64url')
}

const decodeBase64Url = (value) => {
  return Buffer.from(value, 'base64url').toString('utf8')
}

const getSecret = () => {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET is required')
  }
  return secret
}

const getTokenTtlSeconds = () => {
  return parseDurationSeconds(process.env.JWT_EXPIRES_IN || '', 8 * 60 * 60)
}

export const hashPassword = (password) => {
  const trimmedPassword = typeof password === 'string' ? password.trim() : ''
  if (trimmedPassword.length < 6) {
    throw new Error('Password must be at least 6 characters')
  }

  const salt = crypto.randomBytes(16)
  const derived = crypto.scryptSync(trimmedPassword, salt, 64)
  return `scrypt$${salt.toString('hex')}$${derived.toString('hex')}`
}

export const verifyPassword = (password, storedHash) => {
  const trimmedPassword = typeof password === 'string' ? password.trim() : ''
  if (!trimmedPassword || typeof storedHash !== 'string') return false

  const [algorithm, saltHex, hashHex] = storedHash.split('$')
  if (algorithm !== 'scrypt' || !saltHex || !hashHex) return false

  const salt = Buffer.from(saltHex, 'hex')
  const expected = Buffer.from(hashHex, 'hex')
  const actual = crypto.scryptSync(trimmedPassword, salt, expected.length)
  if (actual.length !== expected.length) return false
  return crypto.timingSafeEqual(actual, expected)
}

export const signToken = (payload) => {
  const secret = getSecret()
  const now = Math.floor(Date.now() / 1000)
  const exp = now + getTokenTtlSeconds()

  const header = { alg: 'HS256', typ: 'JWT' }
  const fullPayload = { ...payload, iat: now, exp }

  const encodedHeader = encodeBase64Url(JSON.stringify(header))
  const encodedPayload = encodeBase64Url(JSON.stringify(fullPayload))
  const signingInput = `${encodedHeader}.${encodedPayload}`
  const signature = crypto
    .createHmac('sha256', secret)
    .update(signingInput)
    .digest('base64url')

  return `${signingInput}.${signature}`
}

export const verifyToken = (token) => {
  if (!token || typeof token !== 'string') {
    throw new Error('Token missing')
  }

  const [encodedHeader, encodedPayload, signature] = token.split('.')
  if (!encodedHeader || !encodedPayload || !signature) {
    throw new Error('Token format is invalid')
  }

  const secret = getSecret()
  const signingInput = `${encodedHeader}.${encodedPayload}`
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(signingInput)
    .digest('base64url')

  const signatureBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expectedSignature)
  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    throw new Error('Token signature is invalid')
  }

  const header = JSON.parse(decodeBase64Url(encodedHeader))
  if (header.alg !== 'HS256') {
    throw new Error('Token algorithm is invalid')
  }

  const payload = JSON.parse(decodeBase64Url(encodedPayload))
  const now = Math.floor(Date.now() / 1000)
  if (!payload.exp || now >= payload.exp) {
    throw new Error('Token expired')
  }

  return payload
}
