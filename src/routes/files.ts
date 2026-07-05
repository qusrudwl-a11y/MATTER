import { Hono } from 'hono'
import type { AppEnv } from '../types'

const files = new Hono<AppEnv>()

// R2에 저장된 이미지/엑셀 파일 서빙
files.get('/*', async (c) => {
  const key = c.req.path.replace(/^\/api\/files\//, '')
  const object = await c.env.R2.get(key)
  if (!object) return c.notFound()

  return new Response(object.body, {
    headers: {
      'Content-Type': object.httpMetadata?.contentType || 'application/octet-stream',
      'Cache-Control': 'public, max-age=31536000',
    },
  })
})

export default files
