import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'
import type { AppEnv } from './types'
import auth from './routes/auth'
import materials from './routes/materials'
import suppliers from './routes/suppliers'
import ai from './routes/ai'
import specbook from './routes/specbook'
import files from './routes/files'
import admin from './routes/admin'
import feedback from './routes/feedback'
import mypage from './routes/mypage'
import community from './routes/community'

const app = new Hono<AppEnv>()

app.use('/api/*', cors())
app.use('/static/*', serveStatic({ root: './public' }))

app.route('/api/auth', auth)
app.route('/api/materials', materials)
app.route('/api/suppliers', suppliers)
app.route('/api/ai', ai)
app.route('/api/specbook', specbook)
app.route('/api/files', files)
app.route('/api/admin', admin)
app.route('/api/feedback', feedback)
app.route('/api/mypage', mypage)
app.route('/api/community', community)

app.get('/manifest.json', (c) => {
  return c.json({
    name: 'MATTER - Material Library',
    short_name: 'MATTER',
    description: '마감재 정보 · 시장가 · 협력업체 · AI 상담 · 스펙북',
    start_url: '/',
    display: 'standalone',
    background_color: '#1F2421',
    theme_color: '#1F2421',
    icons: [
      { src: '/static/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/static/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  })
})

app.get('*', (c) => {
  return c.html(`<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>MATTER - Material Library</title>
  <meta name="description" content="마감재 정보 · 시장가 · 협력업체 · AI 상담 · 스펙북 - 현장과 사무실을 잇는 자재 통합 플랫폼" />
  <link rel="manifest" href="/manifest.json" />
  <meta name="theme-color" content="#1F2421" />
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
  <link href="/static/styles.css" rel="stylesheet" />
  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            deepgreen: '#1F2421',
            sage: '#5E9285',
            terracotta: '#B85042',
          }
        }
      }
    }
  </script>
</head>
<body class="bg-[#F5F3EF] text-[#1F2421]">
  <div id="app"></div>
  <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
  <script src="/static/app.js"></script>
  <script src="/static/screens/splash-onboarding.js"></script>
  <script src="/static/screens/home.js"></script>
  <script src="/static/screens/suppliers.js"></script>
  <script src="/static/screens/ai-chat.js"></script>
  <script src="/static/screens/camera.js"></script>
  <script src="/static/screens/specbook.js"></script>
  <script src="/static/screens/mypage.js"></script>
  <script src="/static/screens/community.js"></script>
  <script src="/static/screens/admin.js"></script>
</body>
</html>`)
})

export default app
