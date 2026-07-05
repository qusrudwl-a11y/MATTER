# MATTER - Material Library App

## 프로젝트 개요
- **이름**: MATTER (마감재 정보 · 시장가 · 협력업체 · AI 상담 · 스펙북 · 커뮤니티)
- **목표**: 인테리어·공간디자인 현장의 흩어진 마감재 정보를 하나의 모바일 웹앱(PWA)으로 통합. 앱과 웹이 동일한 링크/동일한 데이터베이스를 공유하여 모든 기록이 서버에 저장됨.
- **기획서 기반**: `MATTER_기획서.pdf` v1.0을 기반으로 실제 서비스형(D1 DB + 실제 AI 연동)으로 구현.
- **핵심 설계 원칙**: **사용자(User)와 개발자(Admin) 완전 분리** — 일반 사용자의 불만/피드백/사용내역은 관리자만 열람 가능하며, 관리자 계정은 일반 회원가입으로는 절대 생성될 수 없음(별도 패스코드 로그인).

## 완료된 기능

### 기본 기능
- ✅ **계정 시스템**: 회사/이름/직급/연락처만으로 계정 생성·로그인 (비밀번호 없음, 민감정보 미수집)
- ✅ **자재 라이브러리**: 8개 기본 재질 카테고리(우드/석재·대리석/타일/메탈/패브릭·카펫/도장·벽지/유리·투광/바닥재) + 사용자 커스텀 카테고리, 32종 시드 자재, 통합검색(자재+협력업체)
- ✅ **자재 상세**: 신입사원용 설명, 핵심 스펙(원산지/규격/적용/방염 등), 시장가, 납품 협력업체 연동
- ✅ **AI 자재 상담**: 하단시트 챗봇, 실제 OpenAI(gpt-5-mini) 연동, 라이브러리에 없는 자재는 AI가 자동 생성하여 등록
- ✅ **AI 비전 분석(카메라)**: 사진 촬영 → 실제 AI Vision으로 종류/표면마감/추정단가 분석, R2에 이미지 저장, 결과를 라이브러리에 자재로 등록 가능
- ✅ **스펙북(프로젝트)**: 프로젝트 생성 → 자재 추가(코드 자동부여, 담당자/연락처/적용부위/면적) → 면적 기반 자재비+시공비 자동계산
- ✅ **엑셀 내보내기**: 서버(Workers)에서 xlsx 생성 → Cloudflare R2 저장 → 다운로드 링크 제공 (한글 정상 표시)
- ✅ **디자인 시스템**: 딥그린(#1F2421)·세이지(#5E9285)·테라코타(#B85042) 키컬러, PWA 매니페스트(홈 화면 설치 가능)
- ✅ **활동 로그**: 모든 주요 액션이 activity_logs 테이블에 기록됨

### 신규 확장 기능 (이번 업데이트)
- ✅ **① Genspark 호스팅 배포**: 사용자 소유 Cloudflare 계정 없이 Genspark 관리형 인프라로 배포
- ✅ **② 재질 카테고리 사용자 추가**: 카테고리 이름만 입력하면 AI(gpt-5-mini)가 Font Awesome 아이콘과 한글 설명을 자동 생성하여 등록
- ✅ **③ 자재 사진 업로드**: 자재 상세 화면에서 실제 자재 사진(공간 사진 아님)을 촬영/업로드하면 R2에 저장되어 라이브러리에 표시
- ✅ **④ 변동 가격(실거래가 제보)**: 사용자가 스펙북/자재 상세에서 실제 단가를 입력하면 누적 평균가(reported_avg_price)가 계산되어 카테고리/상세 화면에 기본값으로 노출
- ✅ **⑤ 협력업체 개인화**: 기존 시드 협력업체 데이터 완전 제거, 사용자가 직접 등록(본인이 등록한 업체만 삭제 가능)
- ✅ **⑥ 스펙북 팀원 초대**: 연락처로 팀원을 검색해 프로젝트에 초대, 초대된 팀원도 항목 추가/삭제/엑셀 내보내기 가능
- ✅ **⑦ AI 챗봇 불만/피드백 자동 감지 + 수동 제보**: 챗봇 대화 중 불만 키워드가 감지되면 자동으로 관리자 전용 피드백함에 기록, 마이페이지에서 수동으로도 제보 가능(사용자는 감지 여부를 인지하지 못함)
- ✅ **⑧ 마이페이지**: 우측 상단 "OOO님" 클릭 시 개인정보/참여 프로젝트/활동기록/내가 등록한 협력사/내 피드백 이력을 확인하는 페이지
- ✅ **⑨ 협력업체 하단바 고정 + 평가 시스템**: 하단 네비게이션에 협력업체 탭 고정, 별점(1-5)+코멘트로 업체를 평가하고 모든 사용자가 공개 열람 가능
- ✅ **⑩ 커뮤니티 게시판**: 자유게시판 + 비밀글(4자리 이상 PIN 보호) 기능, 댓글 지원
- ✅ **관리자/사용자 완전 분리**: 패스코드 기반 별도 관리자 로그인(`#/admin`), 전용 대시보드에서 전체 사용자/활동로그/피드백을 조회·답변, 비밀글도 강제 열람 가능. 일반 회원가입으로는 관리자 권한 획득 불가

## API 엔드포인트 요약

### 인증
| Method | Path | 설명 |
|---|---|---|
| POST | `/api/auth/register` | 계정 생성 (company, name, position, phone) |
| POST | `/api/auth/login` | 로그인 (phone) |
| POST | `/api/auth/logout` | 로그아웃 |
| GET | `/api/auth/me` | 내 정보 조회 (is_admin 포함) |

### 자재 · 카테고리
| Method | Path | 설명 |
|---|---|---|
| GET | `/api/materials/categories` | 카테고리 목록 + 자재 수 |
| POST | `/api/materials/categories` | 카테고리 추가 (인증필요, AI가 아이콘/설명 자동생성) |
| GET | `/api/materials/search?q=` | 통합검색 (자재+협력업체) |
| GET | `/api/materials/category/:slug` | 카테고리별 자재 목록 |
| GET | `/api/materials/:id` | 자재 상세 + 협력업체 + 가격제보 이력 |
| POST | `/api/materials` | 자재 수동 등록 (인증필요) |
| POST | `/api/materials/:id/photo` | 자재 사진 업로드 (인증필요, R2 저장) |
| POST | `/api/materials/:id/price-report` | 실거래가 제보 (인증필요, 평균가 자동갱신) |

### 협력업체
| Method | Path | 설명 |
|---|---|---|
| GET | `/api/suppliers` | 협력업체 목록 (평균 별점 포함) |
| GET | `/api/suppliers/:id` | 협력업체 상세 + 취급자재 + 평점 요약 |
| POST | `/api/suppliers` | 협력업체 등록 (인증필요) |
| DELETE | `/api/suppliers/:id` | 삭제 (등록자 본인 또는 관리자만) |
| GET | `/api/suppliers/:id/ratings` | 평가 목록 조회 (공개) |
| POST | `/api/suppliers/:id/ratings` | 평가 작성 (인증필요, 별점1-5+코멘트) |

### AI
| Method | Path | 설명 |
|---|---|---|
| POST | `/api/ai/chat` | AI 자재 상담 (인증필요, 불만 키워드 자동감지) |
| GET | `/api/ai/chat/history` | 대화 이력 |
| POST | `/api/ai/vision-scan` | 카메라 비전 분석 (인증필요) |
| POST | `/api/ai/vision-scan/:id/save` | 스캔결과 자재 등록 |

### 스펙북(프로젝트) · 팀 협업
| Method | Path | 설명 |
|---|---|---|
| GET | `/api/specbook/projects` | 프로젝트 목록 (소유+참여 모두) |
| POST | `/api/specbook/projects` | 프로젝트 생성 |
| DELETE | `/api/specbook/projects/:id` | 프로젝트 삭제 |
| GET | `/api/specbook/projects/:id` | 프로젝트 상세 + 항목 + 팀원 목록 |
| POST | `/api/specbook/projects/:id/members` | 팀원 초대 (연락처 기반, 소유자만) |
| DELETE | `/api/specbook/projects/:id/members/:memberId` | 팀원 제외 (소유자만) |
| POST | `/api/specbook/projects/:id/items` | 마감재 추가 (단가 직접입력 옵션 포함) |
| DELETE | `/api/specbook/items/:itemId` | 항목 삭제 |
| GET | `/api/specbook/projects/:id/export/excel` | 엑셀 내보내기 (다운로드 링크 반환) |

### 마이페이지 · 피드백
| Method | Path | 설명 |
|---|---|---|
| GET | `/api/mypage/overview` | 개인정보/프로젝트/활동기록/내 협력사 종합 조회 |
| POST | `/api/feedback` | 불만/개선 요청 수동 제출 (인증필요) |
| GET | `/api/feedback/my` | 본인 피드백 이력 조회 |

### 커뮤니티
| Method | Path | 설명 |
|---|---|---|
| GET | `/api/community/posts` | 게시글 목록 (비밀글은 잠금 표시만) |
| POST | `/api/community/posts` | 게시글 작성 (is_private+pin으로 비밀글 설정) |
| GET | `/api/community/posts/:id?pin=` | 게시글 상세 (비밀글은 PIN 필요) |
| POST | `/api/community/posts/:id/comments` | 댓글 작성 |
| DELETE | `/api/community/posts/:id` | 삭제 (작성자/관리자만) |

### 관리자 전용 (패스코드 로그인 필요)
| Method | Path | 설명 |
|---|---|---|
| POST | `/api/admin/login` | 관리자 로그인 (passcode) |
| GET | `/api/admin/stats` | 전체 통계 (사용자/자재/프로젝트/신규피드백/협력업체/게시글) |
| GET | `/api/admin/users` | 전체 사용자 목록 + 활동량 |
| GET | `/api/admin/activity` | 전체 활동 로그 |
| GET | `/api/admin/feedback` | 전체 피드백 목록 (자동감지+수동제출 모두) |
| PUT | `/api/admin/feedback/:id` | 상태 변경 + 답변 작성 |
| GET | `/api/admin/community/posts/:id` | 비밀글 강제 열람 |

### 기타
| Method | Path | 설명 |
|---|---|---|
| GET | `/api/files/*` | R2 저장 파일(이미지/엑셀) 서빙 |

## 데이터 아키텍처
- **DB**: Cloudflare D1 (SQLite)
  - 기본: users(is_admin 포함), sessions, categories(is_custom/created_by/description), materials(reported_avg_price/reported_count), suppliers, material_suppliers, projects, specbook_items(added_by_user_id), ai_chat_messages, vision_scans, activity_logs
  - 신규: price_reports(실거래가 제보), supplier_ratings(협력업체 평가), project_members(스펙북 팀원), user_feedback(불만/피드백), community_posts/community_comments(커뮤니티)
- **파일 저장**: Cloudflare R2 — 비전 스캔 이미지, 자재 사진, 스펙북 엑셀 파일
- **AI**: OpenAI 호환 API (gpt-5-mini, 텍스트 상담 + 이미지 비전 분석 + 카테고리 자동생성)
- **인증**:
  - 일반 사용자: 비밀번호 없는 토큰 세션 (연락처로 식별, 1년 유효)
  - 관리자: 별도 패스코드(`ADMIN_PASSCODE` 환경변수) 로그인, 일반 회원가입 경로로는 절대 관리자가 될 수 없음

## 관리자/사용자 분리 구조 (핵심)
- 프론트엔드: 일반 사용자는 `matter_token`/`matter_user`, 관리자는 완전히 별도인 `matter_admin_token`을 사용하며 `#/admin` 경로에서만 로그인 화면 접근 가능
- 백엔드: `adminMiddleware`가 `is_admin` 플래그를 검사하여 일반 사용자의 관리자 API 접근을 403으로 차단
- 사용자의 AI 챗봇 불만, 수동 피드백, 전체 활동 로그, 비밀 게시글 등은 관리자 대시보드에서만 열람 가능 — 다른 일반 사용자에게는 노출되지 않음

## 아직 구현되지 않은 기능 / 향후 개선 사항
- Google Drive 자동 업로드 연동 (현재는 서버 다운로드 링크 방식으로 대체)
- 이메일 발송을 통한 스펙북 전달 (현재는 다운로드 링크만 제공)
- PPT(.pptx) 내보내기 (사용자 요청에 따라 제외, 엑셀만 지원)
- 오프라인 캐싱(Service Worker) 등 PWA 고급 기능
- 팀원 초대 시 실시간 알림(현재는 폴링 없이 새로고침 시 반영)

## 사용 가이드
1. 앱 접속 후 "시작하기" → 회사/이름/직급/연락처 입력하여 계정 생성 (또는 기존 연락처로 로그인)
2. 홈 화면에서 검색하거나 카테고리를 눌러 자재를 탐색, "카테고리 추가" 버튼으로 새 재질 카테고리를 만들면 AI가 자동으로 아이콘/설명을 채워줌
3. 자재 상세에서 사진을 업로드하거나 실거래가를 제보하면 평균가가 자동 계산되어 다른 사용자에게도 노출됨
4. 플로팅 "AI 상담" 버튼으로 공간/조건을 말하면 AI가 자재를 추천 (불만/버그 관련 메시지는 자동으로 관리자에게 전달됨)
5. 하단 "카메라"로 실제 마감재를 촬영하면 AI가 종류·마감·단가를 분석
6. "스펙북"에서 프로젝트를 만들고 팀원을 연락처로 초대하면 함께 자재를 추가/편집/엑셀 내보내기 가능
7. 하단 "협력업체" 탭에서 업체를 등록하고, 사용 후기를 별점+코멘트로 남기면 다른 사용자도 참고 가능
8. "커뮤니티"에서 자유롭게 글을 쓰거나, 비밀글로 설정(PIN 4자리 이상)하여 특정 사람과만 공유 가능
9. 우측 상단 "OOO님"을 누르면 마이페이지에서 내 프로젝트/활동기록/내 협력사/피드백 이력을 확인 가능
10. 관리자는 `#/admin` 경로에서 별도 패스코드로 로그인하여 전체 사용자 활동과 피드백을 확인·답변

## 배포 상태
- **플랫폼**: Cloudflare Pages (Genspark 호스팅 계정)
- **기술 스택**: Hono + TypeScript + Cloudflare D1/R2 + Vanilla JS SPA + TailwindCSS(CDN)
- **로컬 개발 상태**: ✅ 정상 동작 확인 (신규 10개 기능 전체 curl 종단간 테스트 완료 - 회원가입/카테고리생성/사진업로드/가격제보/협력업체등록·삭제·평가/팀원초대/엑셀내보내기/AI챗봇피드백감지/마이페이지/커뮤니티비밀글/관리자로그인·대시보드)
- **GitHub**: https://github.com/qusrudwl-a11y/MATTER
- **최종 업데이트**: 2026-07-05
