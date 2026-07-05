import { createMiddleware } from 'hono/factory'
import type { AppEnv } from '../types'

// 토큰 기반 인증 (비밀번호 없음 - 연락처로 식별한 세션 토큰 검증)
export const authMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  const authHeader = c.req.header('Authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (!token) {
    return c.json({ error: '로그인이 필요합니다.' }, 401)
  }

  const session = await c.env.DB.prepare(
    `SELECT s.user_id, u.company, u.name, u.position, u.phone
     FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token = ? AND s.expires_at > datetime('now')`
  ).bind(token).first<{ user_id: number; company: string; name: string; position: string; phone: string }>()

  if (!session) {
    return c.json({ error: '세션이 만료되었습니다. 다시 로그인해주세요.' }, 401)
  }

  c.set('userId', session.user_id)
  c.set('userCompany', session.company)
  c.set('userName', session.name)
  c.set('userPosition', session.position)
  c.set('userPhone', session.phone)

  await next()
})
