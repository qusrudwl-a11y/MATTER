# MATTER - Material Library App

## 프로젝트 개요
- **이름**: MATTER (마감재 정보 · 시장가 · 협력업체 · AI 상담 · 스펙북)
- **목표**: 인테리어·공간디자인 현장의 흩어진 마감재 정보를 하나의 모바일 웹앱(PWA)으로 통합. 앱과 웹이 동일한 링크/동일한 데이터베이스를 공유하여 모든 기록이 서버에 저장됨.
- **기획서 기반**: `MATTER_기획서.pdf` v1.0을 기반으로 실제 서비스형(D1 DB + 실제 AI 연동)으로 구현.

## 완료된 기능
- ✅ **계정 시스템**: 회사/이름/직급/연락처만으로 계정 생성·로그인 (비밀번호 없음, 민감정보 미수집)
- ✅ **자재 라이브러리**: 8개 재질 카테고리(우드/석재·대리석/타일/메탈/패브릭·카펫/도장·벽지/유리·투광/바닥재), 32종 시드 자재, 통합검색(자재+협력업체)
- ✅ **자재 상세**: 신입사원용 설명, 핵심 스펙(원산지/규격/적용/방염 등), 시장가, 납품 협력업체 연동
- ✅ **협력업체 관리**: 등록/조회/전화 바로걸기/취급자재 연동
- ✅ **AI 자재 상담**: 하단시트 챗봇, 실제 OpenAI(gpt-5-mini) 연동, 라이브러리에 없는 자재는 AI가 자동 생성하여 등록
- ✅ **AI 비전 분석(카메라)**: 사진 촬영 → 실제 AI Vision으로 종류/표면마감/추정단가 분석, R2에 이미지 저장, 결과를 라이브러리에 자재로 등록 가능
- ✅ **스펙북(프로젝트)**: 프로젝트 생성 → 자재 추가(코드 자동부여 WD/ST/TL 등, 담당자/연락처/적용부위/면적) → 면적 기반 자재비+시공비(품값 40% 추정) 자동계산
- ✅ **엑셀 내보내기**: 서버(Workers)에서 xlsx 생성 → Cloudflare R2 저장 → 다운로드 링크 제공 (한글 정상 표시 확인)
- ✅ **디자인 시스템**: 딥그린(#1F2421)·세이지(#5E9285)·테라코타(#B85042) 키컬러, PWA 매니페스트(홈 화면 설치 가능)
- ✅ **활동 로그**: 모든 주요 액션(가입/로그인/AI상담/비전스캔/스펙북생성/내보내기)이 activity_logs 테이블에 기록됨

## API 엔드포인트 요약
| Method | Path | 설명 |
|---|---|---|
| POST | `/api/auth/register` | 계정 생성 (company, name, position, phone) |
| POST | `/api/auth/login` | 로그인 (phone) |
| POST | `/api/auth/logout` | 로그아웃 |
| GET | `/api/auth/me` | 내 정보 조회 |
| GET | `/api/materials/categories` | 8개 카테고리 + 자재 수 |
| GET | `/api/materials/search?q=` | 통합검색 (자재+협력업체) |
| GET | `/api/materials/category/:slug` | 카테고리별 자재 목록 |
| GET | `/api/materials/:id` | 자재 상세 + 협력업체 |
| POST | `/api/materials` | 자재 수동 등록 (인증필요) |
| GET | `/api/suppliers` | 협력업체 목록 |
| GET | `/api/suppliers/:id` | 협력업체 상세 + 취급자재 |
| POST | `/api/suppliers` | 협력업체 등록 (인증필요) |
| POST | `/api/ai/chat` | AI 자재 상담 (인증필요) |
| GET | `/api/ai/chat/history` | 대화 이력 |
| POST | `/api/ai/vision-scan` | 카메라 비전 분석 (인증필요) |
| POST | `/api/ai/vision-scan/:id/save` | 스캔결과 자재 등록 |
| GET | `/api/specbook/projects` | 프로젝트(스펙북) 목록 |
| POST | `/api/specbook/projects` | 프로젝트 생성 |
| DELETE | `/api/specbook/projects/:id` | 프로젝트 삭제 |
| GET | `/api/specbook/projects/:id` | 프로젝트 상세 + 항목 |
| POST | `/api/specbook/projects/:id/items` | 마감재 추가 |
| DELETE | `/api/specbook/items/:itemId` | 항목 삭제 |
| GET | `/api/specbook/projects/:id/export/excel` | 엑셀 내보내기 (다운로드 링크 반환) |
| GET | `/api/files/*` | R2 저장 파일(이미지/엑셀) 서빙 |

## 데이터 아키텍처
- **DB**: Cloudflare D1 (SQLite) — users, sessions, categories, materials, suppliers, material_suppliers, projects, specbook_items, ai_chat_messages, vision_scans, activity_logs
- **파일 저장**: Cloudflare R2 — 비전 스캔 이미지, 스펙북 엑셀 파일
- **AI**: OpenAI 호환 API (gpt-5-mini, 텍스트 상담 + 이미지 비전 분석)
- **인증**: 비밀번호 없는 토큰 세션 (연락처로 식별, 1년 유효 세션 토큰)

## 아직 구현되지 않은 기능 / 향후 개선 사항
- Google Drive 자동 업로드 연동 (현재는 서버 다운로드 링크 방식으로 대체)
- 이메일 발송을 통한 스펙북 전달 (현재는 다운로드 링크만 제공)
- PPT(.pptx) 내보내기 (사용자 요청에 따라 이번 버전에서 제외, 엑셀만 지원)
- 실사용자 다수의 동시 협업(권한/역할 관리)
- 자재 이미지 대량 업로드/실사진 라이브러리 구축 (현재 시드 자재는 이미지 없음)
- 오프라인 캐싱(Service Worker) 등 PWA 고급 기능

## 사용 가이드
1. 앱 접속 후 "시작하기" → 회사/이름/직급/연락처 입력하여 계정 생성 (또는 기존 연락처로 로그인)
2. 홈 화면에서 검색하거나 8개 카테고리를 눌러 자재를 탐색
3. 하단 "AI 상담" 버튼으로 공간/조건을 말하면 AI가 자재를 추천 (없는 자재는 자동 생성)
4. 하단 "카메라"로 실제 마감재를 촬영하면 AI가 종류·마감·단가를 분석
5. "스펙북"에서 프로젝트를 만들고 자재를 추가하면 코드가 자동 부여되고 면적 입력 시 비용이 자동 계산됨
6. 스펙북 상세에서 "엑셀" 버튼을 누르면 서버에서 즉시 엑셀 파일이 생성되어 다운로드됨

## 배포 상태
- **플랫폼**: Cloudflare Pages (예정 — 아래 참고)
- **기술 스택**: Hono + TypeScript + Cloudflare D1/R2 + Vanilla JS SPA + TailwindCSS(CDN)
- **로컬 개발 상태**: ✅ 정상 동작 확인 (회원가입/로그인/AI상담/비전분석/스펙북/엑셀 전부 curl 테스트 완료)
- **프로덕션 배포**: 아직 미배포. Cloudflare 계정 연결 방식(BYOK 또는 Genspark 호스팅) 확인 후 배포 예정
- **GitHub**: https://github.com/qusrudwl-a11y/MATTER
- **최종 업데이트**: 2026-07-05
