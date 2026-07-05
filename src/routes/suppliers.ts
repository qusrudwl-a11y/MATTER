import { Hono } from 'hono'
import type { AppEnv } from '../types'
import { authMiddleware } from '../middleware/auth'

const suppliers = new Hono<AppEnv>()

// 협력업체 목록 (평점 평균 포함)
suppliers.get('/', async (c) => {
  const { results } = await c.env.DB.prepare(`
    SELECT s.id, s.name, s.region, s.items_handled, s.contact_name, s.phone, s.created_at, s.created_by,
           (SELECT ROUND(AVG(rating), 1) FROM supplier_ratings sr WHERE sr.supplier_id = s.id) as avg_rating,
           (SELECT COUNT(*) FROM supplier_ratings sr WHERE sr.supplier_id = s.id) as rating_count
    FROM suppliers s ORDER BY s.created_at DESC
  `).all()
  return c.json({ suppliers: results })
})

// 협력업체 상세 (취급 자재 + 평점 요약 포함)
suppliers.get('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const supplier = await c.env.DB.prepare('SELECT * FROM suppliers WHERE id = ?').bind(id).first<any>()
  if (!supplier) return c.json({ error: '업체를 찾을 수 없습니다.' }, 404)

  const { results: materialsHandled } = await c.env.DB.prepare(`
    SELECT m.id, m.name, cat.name as category_name
    FROM materials m
    JOIN material_suppliers ms ON ms.material_id = m.id
    JOIN categories cat ON cat.id = m.category_id
    WHERE ms.supplier_id = ?
  `).bind(id).all()

  const ratingSummary = await c.env.DB.prepare(
    'SELECT ROUND(AVG(rating),1) as avg_rating, COUNT(*) as cnt FROM supplier_ratings WHERE supplier_id = ?'
  ).bind(id).first<{ avg_rating: number; cnt: number }>()

  return c.json({ supplier, materials: materialsHandled, avg_rating: ratingSummary?.avg_rating || null, rating_count: ratingSummary?.cnt || 0 })
})

// 협력업체 등록
suppliers.post('/', authMiddleware, async (c) => {
  const body = await c.req.json<{ name?: string; region?: string; items_handled?: string; contact_name?: string; phone?: string; material_ids?: number[] }>()
  const userId = c.get('userId')

  if (!body.name || !body.phone) {
    return c.json({ error: '업체명과 연락처는 필수입니다.' }, 400)
  }

  const result = await c.env.DB.prepare(`
    INSERT INTO suppliers (name, region, items_handled, contact_name, phone, created_by)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(body.name, body.region || null, body.items_handled || null, body.contact_name || null, body.phone, userId).run()

  const supplierId = result.meta.last_row_id as number

  if (body.material_ids && body.material_ids.length > 0) {
    for (const materialId of body.material_ids) {
      await c.env.DB.prepare(
        'INSERT OR IGNORE INTO material_suppliers (material_id, supplier_id) VALUES (?, ?)'
      ).bind(materialId, supplierId).run()
    }
  }

  await c.env.DB.prepare(
    "INSERT INTO activity_logs (user_id, action, detail) VALUES (?, 'supplier_create', ?)"
  ).bind(userId, body.name).run()

  return c.json({ id: supplierId, success: true })
})

// 협력업체 삭제 - 등록한 본인(또는 관리자)만 삭제 가능
suppliers.delete('/:id', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const isAdmin = c.get('isAdmin')
  const id = Number(c.req.param('id'))
  const supplier = await c.env.DB.prepare('SELECT created_by FROM suppliers WHERE id = ?').bind(id).first<{ created_by: number | null }>()
  if (!supplier) return c.json({ error: '업체를 찾을 수 없습니다.' }, 404)
  if (supplier.created_by !== userId && !isAdmin) {
    return c.json({ error: '본인이 등록한 업체만 삭제할 수 있습니다.' }, 403)
  }

  await c.env.DB.prepare('DELETE FROM material_suppliers WHERE supplier_id = ?').bind(id).run()
  await c.env.DB.prepare('DELETE FROM supplier_ratings WHERE supplier_id = ?').bind(id).run()
  await c.env.DB.prepare('DELETE FROM suppliers WHERE id = ?').bind(id).run()

  return c.json({ success: true })
})

// 협력업체 평가 목록 (별점 + 코멘트, 모든 사용자에게 공개)
suppliers.get('/:id/ratings', async (c) => {
  const id = Number(c.req.param('id'))
  const { results } = await c.env.DB.prepare(`
    SELECT sr.id, sr.rating, sr.comment, sr.created_at, u.name, u.company
    FROM supplier_ratings sr JOIN users u ON u.id = sr.user_id
    WHERE sr.supplier_id = ? ORDER BY sr.id DESC
  `).bind(id).all()
  return c.json({ ratings: results })
})

// 협력업체 평가 등록 (사용해본 후 별점+피드백)
suppliers.post('/:id/ratings', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const id = Number(c.req.param('id'))
  const body = await c.req.json<{ rating?: number; comment?: string }>()
  const rating = Number(body.rating)
  if (!rating || rating < 1 || rating > 5) {
    return c.json({ error: '별점은 1~5 사이로 입력해주세요.' }, 400)
  }

  const supplier = await c.env.DB.prepare('SELECT id FROM suppliers WHERE id = ?').bind(id).first()
  if (!supplier) return c.json({ error: '업체를 찾을 수 없습니다.' }, 404)

  await c.env.DB.prepare(
    'INSERT INTO supplier_ratings (supplier_id, user_id, rating, comment) VALUES (?, ?, ?, ?)'
  ).bind(id, userId, rating, body.comment || null).run()

  await c.env.DB.prepare(
    "INSERT INTO activity_logs (user_id, action, detail) VALUES (?, 'supplier_rating', ?)"
  ).bind(userId, `supplier#${id}: ${rating}점`).run()

  return c.json({ success: true })
})

export default suppliers
