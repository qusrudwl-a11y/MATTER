import { Hono } from 'hono'
import type { AppEnv } from '../types'
import { authMiddleware } from '../middleware/auth'
import { callOpenAIChat, callOpenAIVision } from '../lib/openai'

const ai = new Hono<AppEnv>()

const CATEGORY_SLUGS = ['wood', 'stone', 'tile', 'metal', 'fabric', 'paint', 'glass', 'flooring']

// ---------- AI 자재 상담 (추천 + 없는 자재 자동 생성) ----------
ai.post('/chat', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const body = await c.req.json<{ message?: string }>()
  const message = body.message?.trim()
  if (!message) return c.json({ error: '메시지를 입력해주세요.' }, 400)

  await c.env.DB.prepare(
    "INSERT INTO ai_chat_messages (user_id, role, content) VALUES (?, 'user', ?)"
  ).bind(userId, message).run()

  // 최근 대화 맥락 (최대 6개)
  const { results: history } = await c.env.DB.prepare(
    `SELECT role, content FROM ai_chat_messages WHERE user_id = ? ORDER BY id DESC LIMIT 6`
  ).bind(userId).all<{ role: string; content: string }>()
  const historyMessages = history.reverse().map((h) => ({ role: h.role, content: h.content }))

  // 카테고리 및 기존 자재 목록 (이름/카테고리만 - 컨텍스트용)
  const { results: categories } = await c.env.DB.prepare('SELECT id, slug, name FROM categories ORDER BY sort_order').all<{ id: number; slug: string; name: string }>()
  const { results: existingMaterials } = await c.env.DB.prepare(`
    SELECT m.id, m.name, cat.slug as category_slug, m.material_type, m.application
    FROM materials m JOIN categories cat ON cat.id = m.category_id
  `).all<{ id: number; name: string; category_slug: string; material_type: string; application: string }>()

  const systemPrompt = `당신은 인테리어·공간디자인 실무자를 위한 MATTER 앱의 AI 자재 상담 어시스턴트입니다.
역할:
1. 사용자가 공간/조건(예: "물 쓰는 바닥")을 설명하면 적합한 마감재를 추천합니다.
2. 사용자가 특정 자재를 요청(예: "판석 제안해줘")하면 관련 자재를 추천합니다.
3. 라이브러리에 없는 자재가 필요하면 새 자재 정보를 생성해서 제안합니다.
4. 신입 실무자도 이해할 수 있게 쉽고 친절하게 설명합니다.

사용 가능한 카테고리 (slug): ${categories.map((cat) => `${cat.slug}(${cat.name})`).join(', ')}

기존 라이브러리 자재 목록(일부): ${existingMaterials.slice(0, 80).map((m) => `#${m.id}:${m.name}(${m.category_slug})`).join(', ')}

반드시 아래 JSON 형식으로만 응답하세요:
{
  "reply": "사용자에게 보여줄 친절한 답변 텍스트",
  "recommended_material_ids": [기존 라이브러리에서 추천하는 자재 id 배열, 없으면 빈 배열],
  "new_material": null 또는 {
    "category_slug": "wood|stone|tile|metal|fabric|paint|glass|flooring 중 하나",
    "name": "자재명",
    "origin": "원산지 추정",
    "spec": "규격 추정",
    "application": "적용처",
    "fire_retardant": "방염여부 추정",
    "material_type": "종류",
    "fabrication_method": "제작방식 추정",
    "surface_finish": "표면마감 추정",
    "market_price_min": 숫자(원, ㎡ 기준 추정),
    "market_price_max": 숫자(원, ㎡ 기준 추정),
    "description_beginner": "신입사원을 위한 쉬운 설명 2~3문장"
  }
}
new_material은 라이브러리에 적합한 자재가 전혀 없을 때만 채우고, 기존 자재로 충분히 추천 가능하면 null로 두세요.`

  let parsed: any
  try {
    const raw = await callOpenAIChat(c.env.OPENAI_API_KEY, c.env.OPENAI_BASE_URL, {
      messages: [
        { role: 'system', content: systemPrompt },
        ...historyMessages,
      ],
      jsonMode: true,
    })
    parsed = JSON.parse(raw)
  } catch (e: any) {
    return c.json({ error: 'AI 응답 처리 중 오류가 발생했습니다.', detail: String(e?.message || e) }, 500)
  }

  let createdMaterialId: number | null = null

  // 없는 자재 자동 생성
  if (parsed.new_material && parsed.new_material.name) {
    const nm = parsed.new_material
    const slug = CATEGORY_SLUGS.includes(nm.category_slug) ? nm.category_slug : 'wood'
    const category = categories.find((cat) => cat.slug === slug)
    if (category) {
      const result = await c.env.DB.prepare(`
        INSERT INTO materials
          (category_id, name, origin, spec, application, fire_retardant, material_type,
           fabrication_method, surface_finish, market_price_min, market_price_max, price_unit,
           description_beginner, source, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '㎡', ?, 'ai', ?)
      `).bind(
        category.id, nm.name, nm.origin || null, nm.spec || null, nm.application || null,
        nm.fire_retardant || null, nm.material_type || null, nm.fabrication_method || null,
        nm.surface_finish || null, nm.market_price_min || null, nm.market_price_max || null,
        nm.description_beginner || null, userId
      ).run()
      createdMaterialId = result.meta.last_row_id as number
    }
  }

  const reply = parsed.reply || '죄송해요, 다시 한 번 말씀해주시겠어요?'

  await c.env.DB.prepare(
    "INSERT INTO ai_chat_messages (user_id, role, content, related_material_id) VALUES (?, 'assistant', ?, ?)"
  ).bind(userId, reply, createdMaterialId || (parsed.recommended_material_ids?.[0] ?? null)).run()

  await c.env.DB.prepare(
    "INSERT INTO activity_logs (user_id, action, detail) VALUES (?, 'ai_chat', ?)"
  ).bind(userId, message.slice(0, 200)).run()

  // 추천/생성된 자재 상세 정보 반환
  const idsToFetch: number[] = [...(parsed.recommended_material_ids || [])]
  if (createdMaterialId) idsToFetch.push(createdMaterialId)

  let materials: any[] = []
  if (idsToFetch.length > 0) {
    const placeholders = idsToFetch.map(() => '?').join(',')
    const { results } = await c.env.DB.prepare(`
      SELECT m.id, m.name, m.image_url, m.market_price_min, m.market_price_max, m.price_unit,
             m.description_beginner, cat.name as category_name, cat.slug as category_slug, m.source
      FROM materials m JOIN categories cat ON cat.id = m.category_id
      WHERE m.id IN (${placeholders})
    `).bind(...idsToFetch).all()
    materials = results
  }

  return c.json({ reply, materials, created_new: !!createdMaterialId })
})

// 대화 이력 조회
ai.get('/chat/history', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const { results } = await c.env.DB.prepare(
    'SELECT role, content, related_material_id, created_at FROM ai_chat_messages WHERE user_id = ? ORDER BY id ASC LIMIT 100'
  ).bind(userId).all()
  return c.json({ messages: results })
})

// ---------- AI 비전 분석 (카메라 촬영 -> 종류/마감/단가 추정) ----------
ai.post('/vision-scan', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const body = await c.req.json<{ image_base64?: string; image_url?: string }>()

  let imageUrl = body.image_url
  if (!imageUrl && body.image_base64) {
    imageUrl = body.image_base64 // data URL 형태로 전달됨 (data:image/jpeg;base64,...)
  }
  if (!imageUrl) return c.json({ error: '이미지가 필요합니다.' }, 400)

  const prompt = `이 사진은 인테리어 마감재(자재) 촬영 이미지입니다. 사진을 분석해서 아래 JSON 형식으로만 답변하세요:
{
  "category_slug": "wood|stone|tile|metal|fabric|paint|glass|flooring 중 하나(가장 가까운 것)",
  "category_name_kr": "한글 카테고리명",
  "material_type": "구체적인 자재 종류(예: 오크 원목마루, 포셀린 타일 등)",
  "surface_finish": "표면 마감 추정(예: 무광, 유광, 헤어라인 등)",
  "estimated_price_min": 숫자(원 단위, ㎡ 기준 추정 최소가),
  "estimated_price_max": 숫자(원 단위, ㎡ 기준 추정 최대가),
  "confidence_note": "이 추정이 데모 수준이며 실측이 필요하다는 안내 문구(한글, 1문장)",
  "description": "이 자재에 대한 신입사원용 간단 설명(2문장 이내)"
}`

  let parsed: any
  try {
    const raw = await callOpenAIVision(c.env.OPENAI_API_KEY, c.env.OPENAI_BASE_URL, imageUrl, prompt)
    parsed = JSON.parse(raw)
  } catch (e: any) {
    return c.json({ error: 'AI 비전 분석 중 오류가 발생했습니다.', detail: String(e?.message || e) }, 500)
  }

  const category = await c.env.DB.prepare('SELECT id FROM categories WHERE slug = ?').bind(
    CATEGORY_SLUGS.includes(parsed.category_slug) ? parsed.category_slug : 'wood'
  ).first<{ id: number }>()

  // R2에 이미지 저장 (data URL인 경우)
  let storedImageUrl = imageUrl
  if (imageUrl.startsWith('data:')) {
    try {
      const matches = imageUrl.match(/^data:(.+);base64,(.+)$/)
      if (matches) {
        const contentType = matches[1]
        const base64Data = matches[2]
        const binaryData = Uint8Array.from(atob(base64Data), (ch) => ch.charCodeAt(0))
        const key = `vision-scans/${userId}-${Date.now()}.jpg`
        await c.env.R2.put(key, binaryData, { httpMetadata: { contentType } })
        storedImageUrl = `/api/files/${key}`
      }
    } catch (e) {
      // R2 저장 실패해도 분석 결과는 반환
      storedImageUrl = ''
    }
  }

  const scanResult = await c.env.DB.prepare(`
    INSERT INTO vision_scans (user_id, image_url, detected_category, detected_type, detected_finish, estimated_price_text, confidence_note)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(
    userId, storedImageUrl || '', parsed.category_name_kr || parsed.category_slug,
    parsed.material_type || null, parsed.surface_finish || null,
    `${parsed.estimated_price_min ?? '-'} ~ ${parsed.estimated_price_max ?? '-'}원/㎡`,
    parsed.confidence_note || null
  ).run()

  await c.env.DB.prepare(
    "INSERT INTO activity_logs (user_id, action, detail) VALUES (?, 'vision_scan', ?)"
  ).bind(userId, parsed.material_type || '').run()

  return c.json({
    scan_id: scanResult.meta.last_row_id,
    category_id: category?.id,
    category_slug: parsed.category_slug,
    category_name: parsed.category_name_kr,
    material_type: parsed.material_type,
    surface_finish: parsed.surface_finish,
    estimated_price_min: parsed.estimated_price_min,
    estimated_price_max: parsed.estimated_price_max,
    confidence_note: parsed.confidence_note,
    description: parsed.description,
    image_url: storedImageUrl,
  })
})

// 비전 스캔 결과를 라이브러리 자재로 등록
ai.post('/vision-scan/:id/save', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const scanId = Number(c.req.param('id'))
  const scan = await c.env.DB.prepare('SELECT * FROM vision_scans WHERE id = ? AND user_id = ?').bind(scanId, userId).first<any>()
  if (!scan) return c.json({ error: '스캔 결과를 찾을 수 없습니다.' }, 404)

  const category = await c.env.DB.prepare('SELECT id FROM categories WHERE name = ?').bind(scan.detected_category).first<{ id: number }>()
    ?? await c.env.DB.prepare('SELECT id FROM categories LIMIT 1').first<{ id: number }>()

  const priceMatch = scan.estimated_price_text?.match(/(\d+)\s*~\s*(\d+)/)
  const priceMin = priceMatch ? Number(priceMatch[1]) : null
  const priceMax = priceMatch ? Number(priceMatch[2]) : null

  const result = await c.env.DB.prepare(`
    INSERT INTO materials (category_id, name, material_type, surface_finish, market_price_min, market_price_max, price_unit, image_url, source, created_by)
    VALUES (?, ?, ?, ?, ?, ?, '㎡', ?, 'vision', ?)
  `).bind(
    category!.id, scan.detected_type || '카메라 스캔 자재', scan.detected_type, scan.detected_finish,
    priceMin, priceMax, scan.image_url, userId
  ).run()

  const materialId = result.meta.last_row_id as number
  await c.env.DB.prepare('UPDATE vision_scans SET linked_material_id = ? WHERE id = ?').bind(materialId, scanId).run()

  return c.json({ material_id: materialId, success: true })
})

export default ai
