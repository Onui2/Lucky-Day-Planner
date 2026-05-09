# 명해원 기능 확장 구현 로드맵

## 1. 목표

이 문서는 [명해원 기능 확장 PRD](./MYEONGHAEWON_EXPANSION_PRD.md)를 현재 코드베이스에 연결해 실제 구현 순서, 기술 설계 방향, 데이터 구조, API 범위를 정리한다.

핵심 원칙은 아래 3가지다.

- 기존 사주 계산 엔진은 그대로 유지한다.
- 신규 기능은 기존 하네스 위에 모듈로 붙인다.
- 1차 출시는 `유료화 검증` 에 집중하고, 구독과 PRO SaaS는 이후 단계로 분리한다.

## 2. 현재 코드베이스 기준 확장 방향

### 2.1 현재 하네스 구조

- `Profile Harness`: 인증, 프로필, 사주 입력
- `Saju Engine Harness`: 사주 계산, 궁합, 만세력
- `Fortune Feed Harness`: 운세/해설/콘텐츠
- `Action Harness`: 저장함, 북마크, 대시보드, 재방문 루프
- `Ops Harness`: 관리자, 문의, 운영 도구

### 2.2 신규 기능 매핑

| 기능 | 주 책임 하네스 | 보조 하네스 |
| --- | --- | --- |
| 정밀 PDF 리포트 | Saju Engine | Action, Ops |
| AI 질문하기 | Fortune Feed | Profile, Ops |
| 단건 결제 | Action | Ops, Profile |
| Premium 구독 | Action | Fortune Feed, Profile |
| 월운 리포트 | Fortune Feed | Action |
| 오늘의 흐름 카드 | Fortune Feed | Action |
| 운세 캘린더 유료화 | Action | Saju Engine |
| 가족/지인 저장 | Action | Profile |
| 궁합 커플 모드 | Saju Engine | Action |
| 음성 해설 | Fortune Feed | Action |
| PRO SaaS | Ops | Profile, Action |

## 3. 권장 출시 전략

### 3.1 1차 출시 범위

이 단계는 가장 먼저 돈이 되는 흐름만 검증한다.

- 정밀 PDF 리포트 판매
- 단건 결제
- 결제 내역 조회
- 구매 권한 부여
- 리포트 재다운로드
- AI 질문 3회 제한
- 관리자 결제/리포트 관리

### 3.2 2차 출시 범위

이 단계는 반복 방문과 월 구독을 만든다.

- Premium 구독
- 월운 리포트
- 오늘의 흐름 카드
- 운세 캘린더 유료화
- 저장 인원 확대

### 3.3 3차 출시 범위

이 단계는 B2B 확장을 위한 멀티 고객 관리로 넘어간다.

- 명해원 PRO
- 고객 등록/메모/상담 이력
- 지점/직원 권한
- 예약/재상담 알림

## 4. 추천 MVP 축소안

1차 출시는 아래처럼 좁게 가는 것이 가장 안전하다.

- 상품은 `정밀 사주 PDF 리포트` 1개부터 시작
- 결제사는 `토스페이먼츠 단건 결제` 만 붙임
- 리포트는 `분석 결과 기반 서버 생성 HTML → PDF 변환` 으로 시작
- AI 질문은 `무료 3회 + Premium 예약 정책 문구만 노출` 수준으로 시작
- 궁합 심층 분석, 연간 운세 리포트, 정기결제는 1차 배포 후 확장

이렇게 하면 결제/권한/리포트 재다운로드라는 핵심 루프를 가장 빨리 검증할 수 있다.

## 5. 시스템 아키텍처 제안

### 5.1 인증

- 현재 `@workspace/replit-auth-web` 와 서버 `authMiddleware` 구조를 유지한다.
- Supabase Auth를 인증 소스로 사용하되, 기존 `useAuth()` 인터페이스는 최대한 보존한다.
- 사용자 권한은 `users.role` + 별도 구독/권한 테이블로 분리한다.

### 5.2 결제

- 클라이언트는 주문 생성 요청만 수행한다.
- 서버는 주문 생성, 결제 승인 검증, 금액 대조, 권한 부여를 담당한다.
- 결제 승인 성공 이후에만 리포트 생성 큐를 시작한다.
- 결제와 리포트 생성은 반드시 분리한다.

### 5.3 PDF 생성

- 입력: 저장된 분석 결과 스냅샷 + 리포트 템플릿 버전
- 처리: 서버에서 HTML 리포트 렌더링 후 PDF 변환
- 저장: Supabase Storage 또는 접근 제어 가능한 파일 저장소
- 상태: `pending`, `generating`, `ready`, `failed`

### 5.4 AI 질문

- 입력: 사용자 질문 + 사용자 사주 스냅샷 + 최근 리포트 요약
- 처리: 서버 프롬프트 빌더가 안전 문구와 정책을 강제
- 저장: 질문/답변/토큰 사용량/과금 단위를 기록
- 제한: 무료 3회, Premium 20회, 상위 플랜 확장 가능 구조

### 5.5 월운·오늘의 흐름

- 월운은 사용자별 정기 생성 또는 첫 조회 시 생성 후 캐싱
- 오늘의 흐름은 조회 비용이 낮으면 요청 시 계산, 비싸면 일 단위 캐시
- 공통 콘텐츠와 개인 맞춤 해설을 분리해 저장

## 6. 데이터 모델 제안

### 6.1 사용자 권한·과금

- `user_profiles`
- `subscription_plans`
- `user_subscriptions`
- `purchase_entitlements`
- `orders`
- `payments`
- `refunds`

### 6.2 리포트·콘텐츠

- `saved_saju_profiles`
- `analysis_snapshots`
- `pdf_reports`
- `pdf_report_jobs`
- `monthly_fortune_reports`
- `couple_reports`
- `audio_briefings`

### 6.3 AI 기록

- `ai_question_limits`
- `ai_question_threads`
- `ai_question_messages`
- `ai_usage_logs`

### 6.4 PRO SaaS

- `pro_workspaces`
- `pro_workspace_members`
- `pro_clients`
- `pro_client_tags`
- `pro_consultation_notes`
- `pro_consultation_events`

## 7. RLS 방향

### 7.1 기본 규칙

- 모든 개인 데이터 테이블은 `auth.uid() = user_id` 기준 조회 제한
- 사용자는 자기 데이터만 `select/update/delete`
- 결제/권한 부여성 테이블은 사용자는 조회만 가능
- 생성/승인/환불은 서버만 가능

### 7.2 관리자 규칙

- 관리자용 읽기 권한은 별도 정책으로 제한
- 운영 목적상 필요한 최소 범위만 허용
- 원본 개인정보는 마스킹 뷰 제공을 우선 검토

### 7.3 PRO SaaS 규칙

- `workspace_id` 기준 멀티테넌시
- 사용자는 자신이 속한 워크스페이스 데이터만 접근
- `role in workspace` 로 고객/메모/결제 접근 범위 제어

## 8. API 설계 제안

### 8.1 결제

- `POST /api/commerce/orders`
- `POST /api/commerce/payments/confirm`
- `GET /api/commerce/orders`
- `GET /api/commerce/payments`
- `POST /api/commerce/refunds/request`

### 8.2 리포트

- `POST /api/reports/saju-pdf`
- `GET /api/reports`
- `GET /api/reports/:reportId`
- `POST /api/reports/:reportId/regenerate`
- `GET /api/reports/:reportId/download`

### 8.3 AI 질문

- `POST /api/ai/questions`
- `GET /api/ai/questions`
- `GET /api/ai/usage`

### 8.4 구독·권한

- `GET /api/billing/subscription`
- `POST /api/billing/subscription/start`
- `POST /api/billing/subscription/cancel`
- `GET /api/entitlements`

### 8.5 저장된 사람

- `GET /api/people`
- `POST /api/people`
- `PATCH /api/people/:id`
- `DELETE /api/people/:id`

## 9. 화면별 구현 포인트

### 9.1 홈

- 무료/유료 차이를 명확히 보여주는 히어로 섹션
- `정밀 리포트`, `Premium`, `오늘의 흐름` 진입 동선 추가

### 9.2 분석 결과

- 잠금 콘텐츠 미리보기
- `정밀 PDF 리포트 받기` 구매 버튼
- AI 질문 박스
- 관련 유료 상품 추천 슬롯

### 9.3 대시보드

- 오늘의 흐름 카드
- 이번 달 월운 카드
- Premium 상태 카드
- 최근 구매 리포트 카드

### 9.4 마이페이지

- 내 리포트
- 결제 내역
- 구독 관리
- AI 질문 기록
- 저장된 사람

### 9.5 관리자

- 주문/결제/환불 상태 테이블
- 리포트 생성 실패 재처리
- 사용자 Premium 상태 조회
- 문의/운영 메모 연결

## 10. 1차 출시 티켓 분해안

### 10.1 서버

- 주문 생성/조회 API
- 토스 결제 승인 검증 API
- 구매 권한 생성 로직
- PDF 리포트 생성 잡
- 리포트 재생성 API
- AI 질문 제한 API

### 10.2 프론트

- 결과 화면 구매 CTA
- 결제 성공/실패 페이지
- 리포트 목록/상세/다운로드 UI
- AI 질문 입력 UI
- 마이페이지 결제 내역 UI

### 10.3 데이터

- 주문/결제/권한/리포트 테이블 생성
- RLS 정책 작성
- 관리자 조회용 뷰 또는 서버 전용 쿼리 추가

### 10.4 운영

- 환불 정책 페이지
- 관리자 결제 확인 도구
- 실패 결제/실패 리포트 대응 플로우

## 11. 리스크와 대응

### 11.1 결제 성공 후 리포트 실패

- 결제와 리포트 상태를 분리
- 재생성 버튼 제공
- 관리자 재처리 기능 제공

### 11.2 중복 결제

- 주문별 idempotency key 적용
- 승인 전 상태 확인
- 이미 승인된 주문 재승인 차단

### 11.3 AI 비용 초과

- 질문 횟수 제한
- 모델별 토큰 상한
- 긴 질문/반복 질문 rate limit 적용

### 11.4 권한 누수

- 클라이언트 가드만 믿지 않음
- 다운로드/API/스토리지 접근 모두 서버 검증
- 관리자 권한 분리 점검

## 12. 추천 구현 순서

1. 주문/결제/권한 데이터 모델 추가
2. PDF 리포트 스냅샷 저장 구조 추가
3. 결과 화면 구매 CTA와 결제 흐름 추가
4. 리포트 생성/재다운로드 연결
5. AI 질문 3회 제한 추가
6. 마이페이지와 관리자 결제 화면 추가
7. 1차 배포 후 Premium 구독과 월운으로 확장

## 13. 바로 다음 액션 추천

- `1순위`: 1차 출시 기준 DB 스키마 설계
- `2순위`: 토스 단건 결제 서버 플로우 설계
- `3순위`: 정밀 PDF 리포트 템플릿 구조 설계
- `4순위`: 분석 결과 화면 유료 CTA 와이어프레임 설계
