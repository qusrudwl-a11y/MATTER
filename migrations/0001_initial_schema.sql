-- MATTER 서비스 초기 스키마
-- 사용자 (계정: 회사/이름/직급/연락처만 - 민감정보 없음, 비밀번호 없이 연락처로 식별)
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company TEXT NOT NULL,
  name TEXT NOT NULL,
  position TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_login_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 로그인 세션 (토큰 기반, 비밀번호 없이 연락처 확인 후 발급)
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 8개 재질 카테고리 (고정)
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  sort_order INTEGER NOT NULL
);

-- 자재 라이브러리
CREATE TABLE IF NOT EXISTS materials (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  origin TEXT,                    -- 원산지
  spec TEXT,                      -- 규격
  application TEXT,                -- 적용
  fire_retardant TEXT,             -- 방염 여부
  material_type TEXT,              -- 종류
  fabrication_method TEXT,         -- 제작 방식
  surface_finish TEXT,             -- 표면 마감
  market_price_min INTEGER,        -- 시장가 최소 (원)
  market_price_max INTEGER,        -- 시장가 최대 (원)
  price_unit TEXT DEFAULT '㎡',     -- 가격 단위
  description_beginner TEXT,       -- 신입사원용 설명
  image_url TEXT,
  source TEXT DEFAULT 'seed',      -- seed | ai | vision | manual
  created_by INTEGER,              -- users.id (nullable)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_materials_category ON materials(category_id);
CREATE INDEX IF NOT EXISTS idx_materials_name ON materials(name);

-- 협력업체
CREATE TABLE IF NOT EXISTS suppliers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  region TEXT,
  items_handled TEXT,             -- 취급품목
  contact_name TEXT,               -- 담당자
  phone TEXT,
  created_by INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- 자재 <-> 협력업체 (다대다)
CREATE TABLE IF NOT EXISTS material_suppliers (
  material_id INTEGER NOT NULL,
  supplier_id INTEGER NOT NULL,
  PRIMARY KEY (material_id, supplier_id),
  FOREIGN KEY (material_id) REFERENCES materials(id),
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
);

-- 프로젝트 (스펙북 단위)
CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 스펙북 항목 (프로젝트별 마감재 추가)
CREATE TABLE IF NOT EXISTS specbook_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  material_id INTEGER,
  code TEXT NOT NULL,               -- 예: ST-01 (자동 접두사 부여 가능)
  item_name TEXT NOT NULL,
  size_spec TEXT,
  applied_area TEXT,                 -- 적용 부위
  manager_name TEXT,
  manager_phone TEXT,
  photo_url TEXT,
  area_value REAL,                   -- 면적 (㎡)
  material_unit_price INTEGER,
  material_cost INTEGER,             -- 자재비 = 면적 x 단가
  construction_cost_est INTEGER,     -- 개략 시공비 (품값 40% 추정)
  total_cost INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (material_id) REFERENCES materials(id)
);

-- AI 자재 상담 대화 로그
CREATE TABLE IF NOT EXISTS ai_chat_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  role TEXT NOT NULL,                -- user | assistant
  content TEXT NOT NULL,
  related_material_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (related_material_id) REFERENCES materials(id)
);

-- AI 비전 스캔 기록 (카메라 촬영 분석)
CREATE TABLE IF NOT EXISTS vision_scans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  image_url TEXT NOT NULL,
  detected_category TEXT,
  detected_type TEXT,
  detected_finish TEXT,
  estimated_price_text TEXT,
  confidence_note TEXT,
  linked_material_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (linked_material_id) REFERENCES materials(id)
);

-- 활동 로그 (모든 기록 - 앱/웹 공용 데이터 추적)
CREATE TABLE IF NOT EXISTS activity_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  action TEXT NOT NULL,             -- e.g. 'material_view','specbook_export','vision_scan'
  detail TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
