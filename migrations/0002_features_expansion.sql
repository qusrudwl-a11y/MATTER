-- ===== 기능 확장: 관리자, 카테고리 커스텀, 가격제보, 협력업체 평가, 팀 초대, 피드백, 커뮤니티 =====

-- 1) 관리자(개발자) 구분
ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0;

-- 2) 카테고리 사용자 추가 지원
ALTER TABLE categories ADD COLUMN is_custom INTEGER DEFAULT 0;
ALTER TABLE categories ADD COLUMN created_by INTEGER;
ALTER TABLE categories ADD COLUMN description TEXT;

-- 3) 자재 가격 변동(제보) 시스템 - 사용자가 입력한 실거래가를 집계해 기본값 갱신
CREATE TABLE IF NOT EXISTS price_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  material_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  reported_price INTEGER NOT NULL,
  source TEXT DEFAULT 'manual',      -- manual | specbook
  project_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (material_id) REFERENCES materials(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_price_reports_material ON price_reports(material_id);

-- materials에 제보가 반영된 집계값 컬럼 추가
ALTER TABLE materials ADD COLUMN reported_avg_price INTEGER;
ALTER TABLE materials ADD COLUMN reported_count INTEGER DEFAULT 0;

-- 4) 협력업체 - 소유자 개념 (created_by는 기존에 있음), 평가 시스템
CREATE TABLE IF NOT EXISTS supplier_ratings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  supplier_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_supplier_ratings_supplier ON supplier_ratings(supplier_id);

-- 5) 스펙북 팀원 초대 (프로젝트 공동편집)
CREATE TABLE IF NOT EXISTS project_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  role TEXT DEFAULT 'member',       -- owner | member
  invited_by INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_project_members_unique ON project_members(project_id, user_id);

-- 스펙북 항목에 작성자 기록 (팀 협업 추적)
ALTER TABLE specbook_items ADD COLUMN added_by_user_id INTEGER;

-- 6) AI 챗봇 - 서비스 불만/피드백 채널 (개발자만 확인 가능)
CREATE TABLE IF NOT EXISTS user_feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  content TEXT NOT NULL,
  category TEXT DEFAULT 'general',   -- general | bug | feature_request | complaint
  status TEXT DEFAULT 'new',         -- new | in_review | resolved
  admin_reply TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 7) 커뮤니티 게시판 (비밀글 지원)
CREATE TABLE IF NOT EXISTS community_posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_private INTEGER DEFAULT 0,
  private_pin TEXT,                  -- 4자리 pin (비밀글일 때)
  view_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS community_comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  content TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES community_posts(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_community_comments_post ON community_comments(post_id);
