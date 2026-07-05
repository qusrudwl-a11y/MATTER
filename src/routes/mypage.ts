import { Hono } from 'hono'
import type { AppEnv } from '../types'
import { authMiddleware } from '../middleware/auth'

const mypage = new Hono<AppEnv>()
mypage.use('/*', authMiddleware)

// 마이페이지 종합 정보: 개인정보 / 참여 프로젝트 / 활동 기록 / 나만의 협력사
mypage.get('/overview', async (c) => {
  const userId = c.get('userId')
  const profile = {
    company: c.get('userCompany'),
    name: c.get('userName'),
    position: c.get('userPosition'),
    phone: c.get('userPhone'),
  }

  const { results: projects } = await c.env.DB.prepare(`
    SELECT p.id, p.name, p.updated_at, 'owner' as role,
      (SELECT COUNT(*) FROM specbook_items si WHERE si.project_id = p.id) as item_count
    FROM projects p WHERE p.user_id = ?
    UNION ALL
    SELECT p.id, p.name, p.updated_at, 'member' as role,
      (SELECT COUNT(*) FROM specbook_items si WHERE si.project_id = p.id) as item_count
    FROM projects p JOIN project_members pm ON pm.project_id = p.id
    WHERE pm.user_id = ?
    ORDER BY updated_at DESC
  `).bind(userId, userId).all()

  const { results: activity } = await c.env.DB.prepare(
    'SELECT action, detail, created_at FROM activity_logs WHERE user_id = ? ORDER BY id DESC LIMIT 50'
  ).bind(userId).all()

  const { results: mySuppliers } = await c.env.DB.prepare(
    'SELECT id, name, region, items_handled, contact_name, phone FROM suppliers WHERE created_by = ? ORDER BY created_at DESC'
  ).bind(userId).all()

  return c.json({ profile, projects, activity, my_suppliers: mySuppliers })
})

export default mypage
