import { Hono } from 'hono'
import type { AppEnv } from '../types'
import { authMiddleware } from '../middleware/auth'

const materials = new Hono<AppEnv>()

// 카테고리 목록 (등록 자재 수 포함)
materials.get('/categories', async (c) => {
  const { results } = await c.env.DB.prepare(`
    SELECT cat.id, cat.slug, cat.name, cat.icon, cat.sort_order,
           (SELECT COUNT(*) FROM materials m WHERE m.category_id = cat.id) as material_count
    FROM categories cat
    ORDER BY cat.sort_order ASC
  `).all()
  return c.json({ categories: results })
})

// 통합 검색 (자재 · 협력업체)
materials.get('/search', async (c) => {
  const q = c.req.query('q')?.trim()
  if (!q) return c.json({ materials: [], suppliers: [] })
  const like = `%${q}%`

  const { results: materialResults } = await c.env.DB.prepare(`
    SELECT m.id, m.name, m.image_url, m.market_price_min, m.market_price_max, m.price_unit,
           cat.name as category_name, cat.slug as category_slug
    FROM materials m JOIN categories cat ON cat.id = m.category_id
    WHERE m.name LIKE ? OR m.material_type LIKE ? OR m.application LIKE ?
    LIMIT 30
  `).bind(like, like, like).all()

  const { results: supplierResults } = await c.env.DB.prepare(`
    SELECT id, name, region, items_handled, contact_name, phone
    FROM suppliers
    WHERE name LIKE ? OR items_handled LIKE ?
    LIMIT 20
  `).bind(like, like).all()

  return c.json({ materials: materialResults, suppliers: supplierResults })
})

// 카테고리별 자재 목록
materials.get('/category/:slug', async (c) => {
  const slug = c.req.param('slug')
  const category = await c.env.DB.prepare('SELECT id, name, icon FROM categories WHERE slug = ?').bind(slug).first<{ id: number; name: string; icon: string }>()
  if (!category) return c.json({ error: '카테고리를 찾을 수 없습니다.' }, 404)

  const { results } = await c.env.DB.prepare(`
    SELECT id, name, image_url, market_price_min, market_price_max, price_unit, material_type, source
    FROM materials WHERE category_id = ? ORDER BY id ASC
  `).bind(category.id).all()

  return c.json({ category, materials: results })
})

// 자재 상세
materials.get('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const material = await c.env.DB.prepare(`
    SELECT m.*, cat.name as category_name, cat.slug as category_slug
    FROM materials m JOIN categories cat ON cat.id = m.category_id
    WHERE m.id = ?
  `).bind(id).first()

  if (!material) return c.json({ error: '자재를 찾을 수 없습니다.' }, 404)

  const { results: suppliers } = await c.env.DB.prepare(`
    SELECT s.id, s.name, s.region, s.contact_name, s.phone, s.items_handled
    FROM suppliers s
    JOIN material_suppliers ms ON ms.supplier_id = s.id
    WHERE ms.material_id = ?
  `).bind(id).all()

  return c.json({ material, suppliers })
})

// 자재 등록 (수동 추가 - 로그인 필요)
materials.post('/', authMiddleware, async (c) => {
  const body = await c.req.json<any>()
  const userId = c.get('userId')

  if (!body.category_id || !body.name) {
    return c.json({ error: '카테고리와 자재명은 필수입니다.' }, 400)
  }

  const result = await c.env.DB.prepare(`
    INSERT INTO materials
      (category_id, name, origin, spec, application, fire_retardant, material_type,
       fabrication_method, surface_finish, market_price_min, market_price_max, price_unit,
       description_beginner, image_url, source, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'manual', ?)
  `).bind(
    body.category_id, body.name, body.origin || null, body.spec || null,
    body.application || null, body.fire_retardant || null, body.material_type || null,
    body.fabrication_method || null, body.surface_finish || null,
    body.market_price_min || null, body.market_price_max || null, body.price_unit || '㎡',
    body.description_beginner || null, body.image_url || null, userId
  ).run()

  return c.json({ id: result.meta.last_row_id, success: true })
})

export default materials
