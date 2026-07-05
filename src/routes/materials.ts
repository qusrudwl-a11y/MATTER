import { Hono } from 'hono'
import type { AppEnv } from '../types'
import { authMiddleware } from '../middleware/auth'
import { callOpenAIChat } from '../lib/openai'

const materials = new Hono<AppEnv>()

// 카테고리 목록 (등록 자재 수 포함)
materials.get('/categories', async (c) => {
  const { results } = await c.env.DB.prepare(`
    SELECT cat.id, cat.slug, cat.name, cat.icon, cat.sort_order, cat.is_custom, cat.description,
           (SELECT COUNT(*) FROM materials m WHERE m.category_id = cat.id) as material_count
    FROM categories cat
    ORDER BY cat.sort_order ASC
  `).all()
  return c.json({ categories: results })
})

// 카테고리 사용자 추가 - 이름만 입력하면 AI가 아이콘/설명을 자동으로 채움
materials.post('/categories', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const body = await c.req.json<{ name?: string }>()
  const name = body.name?.trim()
  if (!name) return c.json({ error: '카테고리 이름을 입력해주세요.' }, 400)

  const existing = await c.env.DB.prepare('SELECT id FROM categories WHERE name = ?').bind(name).first<{ id: number }>()
  if (existing) return c.json({ error: '이미 존재하는 카테고리입니다.' }, 409)

  const baseSlug = name
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, '-')
    .replace(/(^-|-$)/g, '') || `cat-${Date.now()}`

  let slug = baseSlug
  let n = 1
  while (await c.env.DB.prepare('SELECT id FROM categories WHERE slug = ?').bind(slug).first()) {
    slug = `${baseSlug}-${++n}`
  }

  // AI로 아이콘(Font Awesome 클래스)과 설명 자동 생성
  let icon = 'fa-cube'
  let description = ''
  try {
    const raw = await callOpenAIChat(c.env.OPENAI_API_KEY, c.env.OPENAI_BASE_URL, {
      messages: [
        {
          role: 'system',
          content: `당신은 인테리어 마감재 카테고리를 분류하는 도우미입니다. 사용자가 새로운 재질 카테고리 이름을 입력하면
1) 가장 어울리는 Font Awesome 6 Free Solid 아이콘 클래스명(예: fa-tree, fa-mountain, fa-th, fa-cog 등, 'fa-' 접두사 포함) 1개
2) 이 카테고리에 대한 한 줄 설명(한글, 신입사원도 이해할 수 있게 쉽게, 30자 내외)
을 아래 JSON으로만 답하세요: {"icon": "fa-xxx", "description": "설명"}`,
        },
        { role: 'user', content: `카테고리 이름: ${name}` },
      ],
      jsonMode: true,
    })
    const parsed = JSON.parse(raw)
    if (parsed.icon) icon = parsed.icon.startsWith('fa-') ? parsed.icon : `fa-${parsed.icon}`
    if (parsed.description) description = parsed.description
  } catch (e) {
    // AI 실패 시 기본 아이콘/설명으로 진행
    description = `${name} 관련 마감재 카테고리`
  }

  const { results: maxSort } = await c.env.DB.prepare('SELECT MAX(sort_order) as m FROM categories').all<{ m: number }>()
  const nextSort = (maxSort[0]?.m || 0) + 1

  const result = await c.env.DB.prepare(`
    INSERT INTO categories (slug, name, icon, sort_order, is_custom, created_by, description)
    VALUES (?, ?, ?, ?, 1, ?, ?)
  `).bind(slug, name, icon, nextSort, userId, description).run()

  await c.env.DB.prepare(
    "INSERT INTO activity_logs (user_id, action, detail) VALUES (?, 'category_create', ?)"
  ).bind(userId, name).run()

  return c.json({ id: result.meta.last_row_id, slug, name, icon, description, success: true })
})

// 통합 검색 (자재 · 협력업체)
materials.get('/search', async (c) => {
  const q = c.req.query('q')?.trim()
  if (!q) return c.json({ materials: [], suppliers: [] })
  const like = `%${q}%`

  const { results: materialResults } = await c.env.DB.prepare(`
    SELECT m.id, m.name, m.image_url, m.market_price_min, m.market_price_max, m.price_unit,
           m.reported_avg_price, cat.name as category_name, cat.slug as category_slug
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
  const category = await c.env.DB.prepare('SELECT id, name, icon, description FROM categories WHERE slug = ?').bind(slug).first<{ id: number; name: string; icon: string; description: string }>()
  if (!category) return c.json({ error: '카테고리를 찾을 수 없습니다.' }, 404)

  const { results } = await c.env.DB.prepare(`
    SELECT id, name, image_url, market_price_min, market_price_max, price_unit,
           reported_avg_price, reported_count, material_type, source
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

  const { results: priceReports } = await c.env.DB.prepare(`
    SELECT pr.reported_price, pr.created_at, u.company
    FROM price_reports pr JOIN users u ON u.id = pr.user_id
    WHERE pr.material_id = ? ORDER BY pr.id DESC LIMIT 20
  `).bind(id).all()

  return c.json({ material, suppliers, price_reports: priceReports })
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

// 자재 사진 업로드 (공간 사진이 아닌 자재 자체 사진, R2 저장)
materials.post('/:id/photo', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const id = Number(c.req.param('id'))
  const body = await c.req.json<{ image_base64?: string }>()
  if (!body.image_base64 || !body.image_base64.startsWith('data:')) {
    return c.json({ error: '이미지 데이터가 필요합니다.' }, 400)
  }

  const material = await c.env.DB.prepare('SELECT id FROM materials WHERE id = ?').bind(id).first()
  if (!material) return c.json({ error: '자재를 찾을 수 없습니다.' }, 404)

  const matches = body.image_base64.match(/^data:(.+);base64,(.+)$/)
  if (!matches) return c.json({ error: '이미지 형식이 올바르지 않습니다.' }, 400)

  const contentType = matches[1]
  const binaryData = Uint8Array.from(atob(matches[2]), (ch) => ch.charCodeAt(0))
  const key = `materials/${id}-${Date.now()}.jpg`
  await c.env.R2.put(key, binaryData, { httpMetadata: { contentType } })
  const imageUrl = `/api/files/${key}`

  await c.env.DB.prepare('UPDATE materials SET image_url = ? WHERE id = ?').bind(imageUrl, id).run()
  await c.env.DB.prepare(
    "INSERT INTO activity_logs (user_id, action, detail) VALUES (?, 'material_photo_upload', ?)"
  ).bind(userId, String(id)).run()

  return c.json({ image_url: imageUrl, success: true })
})

// 자재 실거래가 제보 (변동 가격) - 제보 누적 후 평균값을 카테고리/상세에 노출
materials.post('/:id/price-report', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const id = Number(c.req.param('id'))
  const body = await c.req.json<{ price?: number; project_id?: number }>()
  const price = Number(body.price)
  if (!price || price <= 0) return c.json({ error: '올바른 금액을 입력해주세요.' }, 400)

  const material = await c.env.DB.prepare('SELECT id FROM materials WHERE id = ?').bind(id).first()
  if (!material) return c.json({ error: '자재를 찾을 수 없습니다.' }, 404)

  await c.env.DB.prepare(
    'INSERT INTO price_reports (material_id, user_id, reported_price, project_id) VALUES (?, ?, ?, ?)'
  ).bind(id, userId, price, body.project_id || null).run()

  const agg = await c.env.DB.prepare(
    'SELECT AVG(reported_price) as avg_price, COUNT(*) as cnt FROM price_reports WHERE material_id = ?'
  ).bind(id).first<{ avg_price: number; cnt: number }>()

  await c.env.DB.prepare('UPDATE materials SET reported_avg_price = ?, reported_count = ? WHERE id = ?')
    .bind(Math.round(agg?.avg_price || price), agg?.cnt || 1, id).run()

  await c.env.DB.prepare(
    "INSERT INTO activity_logs (user_id, action, detail) VALUES (?, 'price_report', ?)"
  ).bind(userId, `material#${id}: ${price}원`).run()

  return c.json({
    success: true,
    reported_avg_price: Math.round(agg?.avg_price || price),
    reported_count: agg?.cnt || 1,
  })
})

export default materials
