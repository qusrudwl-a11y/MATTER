import { Hono } from 'hono'
import type { AppEnv } from '../types'
import { authMiddleware } from '../middleware/auth'

const suppliers = new Hono<AppEnv>()

// 협력업체 목록
suppliers.get('/', async (c) => {
  const { results } = await c.env.DB.prepare(`
    SELECT id, name, region, items_handled, contact_name, phone, created_at
    FROM suppliers ORDER BY created_at DESC
  `).all()
  return c.json({ suppliers: results })
})

// 협력업체 상세 (취급 자재 포함)
suppliers.get('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const supplier = await c.env.DB.prepare('SELECT * FROM suppliers WHERE id = ?').bind(id).first()
  if (!supplier) return c.json({ error: '업체를 찾을 수 없습니다.' }, 404)

  const { results: materialsHandled } = await c.env.DB.prepare(`
    SELECT m.id, m.name, cat.name as category_name
    FROM materials m
    JOIN material_suppliers ms ON ms.material_id = m.id
    JOIN categories cat ON cat.id = m.category_id
    WHERE ms.supplier_id = ?
  `).bind(id).all()

  return c.json({ supplier, materials: materialsHandled })
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

  return c.json({ id: supplierId, success: true })
})

export default suppliers
