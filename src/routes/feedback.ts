import { Hono } from 'hono'
import type { AppEnv } from '../types'
import { authMiddleware } from '../middleware/auth'

const feedback = new Hono<AppEnv>()
feedback.use('/*', authMiddleware)

// 서비스 불만사항/수정요청 제출 (개발자만 열람 가능한 채널)
feedback.post('/', async (c) => {
  const userId = c.get('userId')
  const body = await c.req.json<{ content?: string; category?: string }>()
  const content = body.content?.trim()
  if (!content) return c.json({ error: '내용을 입력해주세요.' }, 400)

  const result = await c.env.DB.prepare(
    'INSERT INTO user_feedback (user_id, content, category) VALUES (?, ?, ?)'
  ).bind(userId, content, body.category || 'general').run()

  await c.env.DB.prepare(
    "INSERT INTO activity_logs (user_id, action, detail) VALUES (?, 'feedback_submit', ?)"
  ).bind(userId, content.slice(0, 100)).run()

  return c.json({ id: result.meta.last_row_id, success: true })
})

// 내가 보낸 피드백과 개발자 답변만 확인 (본인 것만 조회 가능, 타 사용자 것은 볼 수 없음)
feedback.get('/my', async (c) => {
  const userId = c.get('userId')
  const { results } = await c.env.DB.prepare(
    'SELECT id, content, category, status, admin_reply, created_at FROM user_feedback WHERE user_id = ? ORDER BY id DESC'
  ).bind(userId).all()
  return c.json({ feedback: results })
})

export default feedback
