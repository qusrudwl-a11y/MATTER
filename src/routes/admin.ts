import { Hono } from 'hono'
import type { AppEnv } from '../types'
import { authMiddleware } from '../middleware/auth'
import { adminMiddleware } from '../middleware/admin'

const admin = new Hono<AppEnv>()

function generateToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
}

// 관리자(개발자) 로그인 - 일반 회원가입 경로와 완전히 분리됨. 비밀 패스코드로만 접근 가능.
// 사용자 계정 체계와 절대 섞이지 않도록 별도 토큰/별도 프론트 화면(#/admin)에서 사용.
admin.post('/login', async (c) => {
  const body = await c.req.json<{ passcode?: string }>()
  const passcode = body.passcode?.trim()
  const expected = c.env.ADMIN_PASSCODE
  if (!expected || !passcode || passcode !== expected) {
    return c.json({ error: '관리자 인증에 실패했습니다.' }, 401)
  }

  const ADMIN_PHONE = '__ADMIN__'
  let adminUser = await c.env.DB.prepare('SELECT id FROM users WHERE phone = ?').bind(ADMIN_PHONE).first<{ id: number }>()
  let adminId: number
  if (!adminUser) {
    const result = await c.env.DB.prepare(
      "INSERT INTO users (company, name, position, phone, is_admin) VALUES ('MATTER', '개발자', 'Admin', ?, 1)"
    ).bind(ADMIN_PHONE).run()
    adminId = result.meta.last_row_id as number
  } else {
    adminId = adminUser.id
    await c.env.DB.prepare('UPDATE users SET is_admin = 1 WHERE id = ?').bind(adminId).run()
  }

  const token = generateToken()
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString()
  await c.env.DB.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)').bind(token, adminId, expiresAt).run()

  return c.json({ token, user: { id: adminId, name: '개발자', is_admin: true } })
})

admin.use('/*', authMiddleware, adminMiddleware)

// 대시보드 요약 통계
admin.get('/stats', async (c) => {
  const q = (sql: string) => c.env.DB.prepare(sql).first<{ cnt: number }>()
  const [users, materials, projects, feedback, suppliersCnt, posts] = await Promise.all([
    q("SELECT COUNT(*) as cnt FROM users WHERE is_admin = 0"),
    q('SELECT COUNT(*) as cnt FROM materials'),
    q('SELECT COUNT(*) as cnt FROM projects'),
    q("SELECT COUNT(*) as cnt FROM user_feedback WHERE status = 'new'"),
    q('SELECT COUNT(*) as cnt FROM suppliers'),
    q('SELECT COUNT(*) as cnt FROM community_posts'),
  ])
  return c.json({
    users: users?.cnt || 0,
    materials: materials?.cnt || 0,
    projects: projects?.cnt || 0,
    new_feedback: feedback?.cnt || 0,
    suppliers: suppliersCnt?.cnt || 0,
    posts: posts?.cnt || 0,
  })
})

// 사용자 목록 (개발자 전용 모니터링)
admin.get('/users', async (c) => {
  const { results } = await c.env.DB.prepare(`
    SELECT id, company, name, position, phone, created_at, last_login_at,
      (SELECT COUNT(*) FROM projects p WHERE p.user_id = users.id) as project_count,
      (SELECT COUNT(*) FROM activity_logs a WHERE a.user_id = users.id) as activity_count
    FROM users WHERE is_admin = 0 ORDER BY created_at DESC
  `).all()
  return c.json({ users: results })
})

// 전체 사용 내역(활동 로그) - 사용자는 볼 수 없고 개발자만 확인 가능
admin.get('/activity', async (c) => {
  const limit = Number(c.req.query('limit') || 300)
  const { results } = await c.env.DB.prepare(`
    SELECT a.id, a.action, a.detail, a.created_at, u.name, u.company, u.phone
    FROM activity_logs a LEFT JOIN users u ON u.id = a.user_id
    ORDER BY a.id DESC LIMIT ?
  `).bind(limit).all()
  return c.json({ logs: results })
})

// 사용자 불만/피드백 전체 목록 (개발자 전용)
admin.get('/feedback', async (c) => {
  const { results } = await c.env.DB.prepare(`
    SELECT f.id, f.content, f.category, f.status, f.admin_reply, f.created_at, u.name, u.company, u.phone
    FROM user_feedback f JOIN users u ON u.id = f.user_id
    ORDER BY f.id DESC
  `).all()
  return c.json({ feedback: results })
})

// 피드백 상태 변경 및 답변 등록
admin.put('/feedback/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const body = await c.req.json<{ status?: string; admin_reply?: string }>()
  await c.env.DB.prepare(
    'UPDATE user_feedback SET status = COALESCE(?, status), admin_reply = COALESCE(?, admin_reply) WHERE id = ?'
  ).bind(body.status || null, body.admin_reply || null, id).run()
  return c.json({ success: true })
})

// 커뮤니티 게시글 전체 관리 (비밀글 포함 강제 열람)
admin.get('/community/posts/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const post = await c.env.DB.prepare(`
    SELECT cp.*, u.name, u.company FROM community_posts cp JOIN users u ON u.id = cp.user_id WHERE cp.id = ?
  `).bind(id).first()
  if (!post) return c.json({ error: '게시글을 찾을 수 없습니다.' }, 404)
  return c.json({ post })
})

export default admin
