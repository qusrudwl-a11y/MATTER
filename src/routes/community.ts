import { Hono } from 'hono'
import type { AppEnv } from '../types'
import { authMiddleware } from '../middleware/auth'

const community = new Hono<AppEnv>()
community.use('/*', authMiddleware)

// 게시글 목록 (비밀글은 잠금 표시만, 내용은 상세에서 PIN 검증)
community.get('/posts', async (c) => {
  const { results } = await c.env.DB.prepare(`
    SELECT cp.id, cp.title, cp.is_private, cp.view_count, cp.created_at, u.name, u.company,
      (SELECT COUNT(*) FROM community_comments cc WHERE cc.post_id = cp.id) as comment_count
    FROM community_posts cp JOIN users u ON u.id = cp.user_id
    ORDER BY cp.id DESC
  `).all()
  return c.json({ posts: results })
})

// 게시글 작성 (비밀글 설정 가능 - PIN 4자리 이상)
community.post('/posts', async (c) => {
  const userId = c.get('userId')
  const body = await c.req.json<{ title?: string; content?: string; is_private?: boolean; pin?: string }>()
  if (!body.title?.trim() || !body.content?.trim()) {
    return c.json({ error: '제목과 내용을 입력해주세요.' }, 400)
  }
  if (body.is_private && (!body.pin || body.pin.trim().length < 4)) {
    return c.json({ error: '비밀글은 4자리 이상 PIN이 필요합니다.' }, 400)
  }

  const result = await c.env.DB.prepare(
    'INSERT INTO community_posts (user_id, title, content, is_private, private_pin) VALUES (?, ?, ?, ?, ?)'
  ).bind(userId, body.title.trim(), body.content.trim(), body.is_private ? 1 : 0, body.is_private ? body.pin!.trim() : null).run()

  await c.env.DB.prepare(
    "INSERT INTO activity_logs (user_id, action, detail) VALUES (?, 'community_post', ?)"
  ).bind(userId, body.title.trim()).run()

  return c.json({ id: result.meta.last_row_id, success: true })
})

// 게시글 상세 (비밀글이면 PIN 필요, 작성자/관리자는 예외)
community.get('/posts/:id', async (c) => {
  const userId = c.get('userId')
  const id = Number(c.req.param('id'))
  const pin = c.req.query('pin')
  const post = await c.env.DB.prepare(`
    SELECT cp.*, u.name, u.company FROM community_posts cp JOIN users u ON u.id = cp.user_id WHERE cp.id = ?
  `).bind(id).first<any>()
  if (!post) return c.json({ error: '게시글을 찾을 수 없습니다.' }, 404)

  const isOwner = post.user_id === userId
  if (post.is_private && !isOwner && !c.get('isAdmin')) {
    if (!pin || pin !== post.private_pin) {
      return c.json({ error: '비밀글입니다. PIN을 입력해주세요.', locked: true }, 403)
    }
  }

  await c.env.DB.prepare('UPDATE community_posts SET view_count = view_count + 1 WHERE id = ?').bind(id).run()

  const { results: comments } = await c.env.DB.prepare(`
    SELECT cc.id, cc.content, cc.created_at, u.name, u.company
    FROM community_comments cc JOIN users u ON u.id = cc.user_id
    WHERE cc.post_id = ? ORDER BY cc.id ASC
  `).bind(id).all()

  delete post.private_pin
  return c.json({ post, comments, is_owner: isOwner })
})

// 댓글 작성
community.post('/posts/:id/comments', async (c) => {
  const userId = c.get('userId')
  const id = Number(c.req.param('id'))
  const body = await c.req.json<{ content?: string; pin?: string }>()
  if (!body.content?.trim()) return c.json({ error: '댓글 내용을 입력해주세요.' }, 400)

  const post = await c.env.DB.prepare('SELECT user_id, is_private, private_pin FROM community_posts WHERE id = ?').bind(id).first<any>()
  if (!post) return c.json({ error: '게시글을 찾을 수 없습니다.' }, 404)
  if (post.is_private && post.user_id !== userId && post.private_pin !== body.pin && !c.get('isAdmin')) {
    return c.json({ error: '비밀글 PIN이 필요합니다.' }, 403)
  }

  await c.env.DB.prepare('INSERT INTO community_comments (post_id, user_id, content) VALUES (?, ?, ?)').bind(id, userId, body.content.trim()).run()
  return c.json({ success: true })
})

// 게시글 삭제 (작성자/관리자만)
community.delete('/posts/:id', async (c) => {
  const userId = c.get('userId')
  const id = Number(c.req.param('id'))
  const post = await c.env.DB.prepare('SELECT user_id FROM community_posts WHERE id = ?').bind(id).first<{ user_id: number }>()
  if (!post || (post.user_id !== userId && !c.get('isAdmin'))) {
    return c.json({ error: '삭제 권한이 없습니다.' }, 403)
  }
  await c.env.DB.prepare('DELETE FROM community_comments WHERE post_id = ?').bind(id).run()
  await c.env.DB.prepare('DELETE FROM community_posts WHERE id = ?').bind(id).run()
  return c.json({ success: true })
})

export default community
