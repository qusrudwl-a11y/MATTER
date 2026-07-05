import { Hono } from 'hono'
import type { AppEnv } from '../types'
import { authMiddleware } from '../middleware/auth'

const auth = new Hono<AppEnv>()

function generateToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
}

function normalizePhone(phone: string): string {
  return phone.replace(/[^0-9]/g, '')
}

// 회원가입: 회사 / 이름 / 직급 / 연락처만 입력 (민감정보 없음)
auth.post('/register', async (c) => {
  const body = await c.req.json<{ company?: string; name?: string; position?: string; phone?: string }>()
  const company = body.company?.trim()
  const name = body.name?.trim()
  const position = body.position?.trim()
  const phone = body.phone ? normalizePhone(body.phone) : ''

  if (!company || !name || !position || !phone) {
    return c.json({ error: '회사, 이름, 직급, 연락처를 모두 입력해주세요.' }, 400)
  }
  if (phone.length < 9) {
    return c.json({ error: '올바른 연락처를 입력해주세요.' }, 400)
  }

  const existing = await c.env.DB.prepare('SELECT id FROM users WHERE phone = ?').bind(phone).first<{ id: number }>()
  if (existing) {
    return c.json({ error: '이미 등록된 연락처입니다. 로그인을 이용해주세요.' }, 409)
  }

  const result = await c.env.DB.prepare(
    'INSERT INTO users (company, name, position, phone) VALUES (?, ?, ?, ?)'
  ).bind(company, name, position, phone).run()

  const userId = result.meta.last_row_id as number
  const token = generateToken()
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 365).toISOString() // 1년

  await c.env.DB.prepare(
    'INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)'
  ).bind(token, userId, expiresAt).run()

  await c.env.DB.prepare(
    "INSERT INTO activity_logs (user_id, action, detail) VALUES (?, 'register', ?)"
  ).bind(userId, `${company}/${name}/${position}`).run()

  return c.json({
    token,
    user: { id: userId, company, name, position, phone },
  })
})

// 로그인: 연락처로 식별 (비밀번호 없음)
auth.post('/login', async (c) => {
  const body = await c.req.json<{ phone?: string }>()
  const phone = body.phone ? normalizePhone(body.phone) : ''
  if (!phone) {
    return c.json({ error: '연락처를 입력해주세요.' }, 400)
  }

  const user = await c.env.DB.prepare(
    'SELECT id, company, name, position, phone FROM users WHERE phone = ?'
  ).bind(phone).first<{ id: number; company: string; name: string; position: string; phone: string }>()

  if (!user) {
    return c.json({ error: '등록되지 않은 연락처입니다. 계정을 먼저 생성해주세요.' }, 404)
  }

  const token = generateToken()
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 365).toISOString()

  await c.env.DB.prepare(
    'INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)'
  ).bind(token, user.id, expiresAt).run()

  await c.env.DB.prepare('UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?').bind(user.id).run()
  await c.env.DB.prepare(
    "INSERT INTO activity_logs (user_id, action, detail) VALUES (?, 'login', NULL)"
  ).bind(user.id).run()

  return c.json({ token, user })
})

// 로그아웃
auth.post('/logout', authMiddleware, async (c) => {
  const authHeader = c.req.header('Authorization')
  const token = authHeader?.slice(7)
  if (token) {
    await c.env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run()
  }
  return c.json({ success: true })
})

// 내 정보 조회
auth.get('/me', authMiddleware, async (c) => {
  return c.json({
    id: c.get('userId'),
    company: c.get('userCompany'),
    name: c.get('userName'),
    position: c.get('userPosition'),
    phone: c.get('userPhone'),
  })
})

export default auth
