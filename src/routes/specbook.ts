import { Hono } from 'hono'
import * as XLSX from 'xlsx'
import type { AppEnv } from '../types'
import { authMiddleware } from '../middleware/auth'

const specbook = new Hono<AppEnv>()
specbook.use('/*', authMiddleware)

// 코드 접두사 매핑 (카테고리 slug -> 코드)
const CODE_PREFIX: Record<string, string> = {
  wood: 'WD', stone: 'ST', tile: 'TL', metal: 'MT',
  fabric: 'FB', paint: 'PT', glass: 'GL', flooring: 'FL',
}

// 프로젝트(스펙북) 목록
specbook.get('/projects', async (c) => {
  const userId = c.get('userId')
  const { results } = await c.env.DB.prepare(`
    SELECT p.id, p.name, p.created_at, p.updated_at,
           (SELECT COUNT(*) FROM specbook_items si WHERE si.project_id = p.id) as item_count
    FROM projects p WHERE p.user_id = ? ORDER BY p.updated_at DESC
  `).bind(userId).all()
  return c.json({ projects: results })
})

// 프로젝트 생성
specbook.post('/projects', async (c) => {
  const userId = c.get('userId')
  const body = await c.req.json<{ name?: string }>()
  if (!body.name?.trim()) return c.json({ error: '프로젝트명을 입력해주세요.' }, 400)

  const result = await c.env.DB.prepare('INSERT INTO projects (user_id, name) VALUES (?, ?)').bind(userId, body.name.trim()).run()
  await c.env.DB.prepare("INSERT INTO activity_logs (user_id, action, detail) VALUES (?, 'project_create', ?)").bind(userId, body.name).run()
  return c.json({ id: result.meta.last_row_id, success: true })
})

// 프로젝트 삭제
specbook.delete('/projects/:id', async (c) => {
  const userId = c.get('userId')
  const id = Number(c.req.param('id'))
  const project = await c.env.DB.prepare('SELECT id FROM projects WHERE id = ? AND user_id = ?').bind(id, userId).first()
  if (!project) return c.json({ error: '프로젝트를 찾을 수 없습니다.' }, 404)

  await c.env.DB.prepare('DELETE FROM specbook_items WHERE project_id = ?').bind(id).run()
  await c.env.DB.prepare('DELETE FROM projects WHERE id = ?').bind(id).run()
  return c.json({ success: true })
})

// 프로젝트 상세 (항목 포함)
specbook.get('/projects/:id', async (c) => {
  const userId = c.get('userId')
  const id = Number(c.req.param('id'))
  const project = await c.env.DB.prepare('SELECT * FROM projects WHERE id = ? AND user_id = ?').bind(id, userId).first()
  if (!project) return c.json({ error: '프로젝트를 찾을 수 없습니다.' }, 404)

  const { results: items } = await c.env.DB.prepare(
    'SELECT * FROM specbook_items WHERE project_id = ? ORDER BY id ASC'
  ).bind(id).all()

  return c.json({ project, items })
})

// 마감재 추가 흐름: 자재선택 -> 코드입력(자동부여 가능) -> 담당자/연락처 -> 적용부위 -> 사진 -> 면적(자동계산)
specbook.post('/projects/:id/items', async (c) => {
  const userId = c.get('userId')
  const projectId = Number(c.req.param('id'))
  const project = await c.env.DB.prepare('SELECT id FROM projects WHERE id = ? AND user_id = ?').bind(projectId, userId).first()
  if (!project) return c.json({ error: '프로젝트를 찾을 수 없습니다.' }, 404)

  const body = await c.req.json<{
    material_id?: number; code?: string; item_name?: string; size_spec?: string;
    applied_area?: string; manager_name?: string; manager_phone?: string; photo_url?: string;
    area_value?: number;
  }>()

  let itemName = body.item_name
  let sizeSpec = body.size_spec
  let unitPriceMin: number | null = null
  let unitPriceMax: number | null = null
  let categorySlug = 'wood'

  if (body.material_id) {
    const material = await c.env.DB.prepare(`
      SELECT m.name, m.spec, m.market_price_min, m.market_price_max, cat.slug as category_slug
      FROM materials m JOIN categories cat ON cat.id = m.category_id WHERE m.id = ?
    `).bind(body.material_id).first<any>()
    if (material) {
      itemName = itemName || material.name
      sizeSpec = sizeSpec || material.spec
      unitPriceMin = material.market_price_min
      unitPriceMax = material.market_price_max
      categorySlug = material.category_slug
    }
  }

  // 코드 자동 부여 (미입력 시)
  let code = body.code?.trim()
  if (!code) {
    const prefix = CODE_PREFIX[categorySlug] || 'MT'
    const { results: countResult } = await c.env.DB.prepare(
      `SELECT COUNT(*) as cnt FROM specbook_items WHERE project_id = ? AND code LIKE ?`
    ).bind(projectId, `${prefix}-%`).all<{ cnt: number }>()
    const nextNum = (countResult[0]?.cnt || 0) + 1
    code = `${prefix}-${String(nextNum).padStart(2, '0')}`
  }

  // 면적 기반 자재비 + 개략 시공비(품값 40% 추정) 자동 계산
  let materialCost: number | null = null
  let constructionCost: number | null = null
  let totalCost: number | null = null
  const avgUnitPrice = unitPriceMin && unitPriceMax ? Math.round((unitPriceMin + unitPriceMax) / 2) : (unitPriceMin || unitPriceMax)

  if (body.area_value && avgUnitPrice) {
    materialCost = Math.round(body.area_value * avgUnitPrice)
    constructionCost = Math.round(materialCost * 0.4)
    totalCost = materialCost + constructionCost
  }

  const result = await c.env.DB.prepare(`
    INSERT INTO specbook_items
      (project_id, material_id, code, item_name, size_spec, applied_area, manager_name, manager_phone,
       photo_url, area_value, material_unit_price, material_cost, construction_cost_est, total_cost)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    projectId, body.material_id || null, code, itemName || '미지정 자재', sizeSpec || null,
    body.applied_area || null, body.manager_name || null, body.manager_phone || null,
    body.photo_url || null, body.area_value || null, avgUnitPrice || null,
    materialCost, constructionCost, totalCost
  ).run()

  await c.env.DB.prepare('UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(projectId).run()
  await c.env.DB.prepare("INSERT INTO activity_logs (user_id, action, detail) VALUES (?, 'specbook_item_add', ?)").bind(userId, code).run()

  return c.json({ id: result.meta.last_row_id, code, material_cost: materialCost, construction_cost_est: constructionCost, total_cost: totalCost })
})

// 스펙북 항목 삭제
specbook.delete('/items/:itemId', async (c) => {
  const userId = c.get('userId')
  const itemId = Number(c.req.param('itemId'))
  const item = await c.env.DB.prepare(`
    SELECT si.id, p.user_id FROM specbook_items si JOIN projects p ON p.id = si.project_id WHERE si.id = ?
  `).bind(itemId).first<{ id: number; user_id: number }>()
  if (!item || item.user_id !== userId) return c.json({ error: '항목을 찾을 수 없습니다.' }, 404)

  await c.env.DB.prepare('DELETE FROM specbook_items WHERE id = ?').bind(itemId).run()
  return c.json({ success: true })
})

// 엑셀 내보내기 (서버 생성 -> R2 저장 -> 다운로드 링크 제공)
specbook.get('/projects/:id/export/excel', async (c) => {
  const userId = c.get('userId')
  const projectId = Number(c.req.param('id'))
  const project = await c.env.DB.prepare('SELECT * FROM projects WHERE id = ? AND user_id = ?').bind(projectId, userId).first<any>()
  if (!project) return c.json({ error: '프로젝트를 찾을 수 없습니다.' }, 404)

  const { results: items } = await c.env.DB.prepare(
    'SELECT * FROM specbook_items WHERE project_id = ? ORDER BY code ASC'
  ).bind(projectId).all<any>()

  const header = ['코드', '아이템', '규격', '적용부위', '면적(㎡)', '자재단가', '자재비', '시공비(추정)', '합계', '담당자', '연락처']
  const rows = items.map((it) => [
    it.code, it.item_name, it.size_spec || '', it.applied_area || '',
    it.area_value ?? '', it.material_unit_price ?? '', it.material_cost ?? '',
    it.construction_cost_est ?? '', it.total_cost ?? '', it.manager_name || '', it.manager_phone || '',
  ])

  const worksheetData = [header, ...rows]
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData)
  worksheet['!cols'] = [
    { wch: 10 }, { wch: 22 }, { wch: 16 }, { wch: 14 }, { wch: 10 },
    { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 14 },
  ]
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'SPECBOOK')

  const arrayBuffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' })
  const key = `specbooks/${userId}-${projectId}-${Date.now()}.xlsx`

  await c.env.R2.put(key, arrayBuffer, {
    httpMetadata: { contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
  })

  await c.env.DB.prepare("INSERT INTO activity_logs (user_id, action, detail) VALUES (?, 'specbook_export', ?)").bind(userId, project.name).run()

  const downloadUrl = `/api/files/${key}`
  return c.json({ download_url: downloadUrl, filename: `${project.name}_스펙북.xlsx` })
})

export default specbook
