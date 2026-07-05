import { createMiddleware } from 'hono/factory'
import type { AppEnv } from '../types'

// 관리자(개발자) 전용 접근 제어. authMiddleware 이후에 사용해야 함.
// 사용자와 개발자를 완전히 분리하기 위해, 일반 회원가입으로는 is_admin=1이 될 수 없고
// 오직 /api/admin/login (비밀 패스코드)을 통해서만 관리자 세션이 발급됨.
export const adminMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  if (!c.get('isAdmin')) {
    return c.json({ error: '관리자만 접근할 수 있습니다.' }, 403)
  }
  await next()
})
