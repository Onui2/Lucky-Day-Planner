# Lucky Day Planner Harness Architecture

## Goal

명해원 서비스를 5개 기능 하네스로 나눠 제품 구조, 화면 IA, API 책임, DB 책임을 한 번에 정리한다.

## Harnesses

### 1. Profile Harness

- 역할: 인증, 계정, 사주 입력, 프로필 표준화
- 대표 화면: `/login`, `/register`, `/account`, `/saju`
- 핵심 데이터: `auth`, `memberData`, `savedSaju`

### 2. Saju Engine Harness

- 역할: 사주 원국 계산, 일주 분석, 대운 흐름, 궁합, 이름풀이
- 대표 화면: `/saju`, `/gungap`, `/daeun`, `/name-analysis`
- 핵심 데이터: 계산 결과, 이론표, 일주 해석 데이터

### 3. Fortune Feed Harness

- 역할: 오늘운, 월운, 연운, 애정운, 꿈 해몽, 신살 해설
- 대표 화면: `/daily-fortune`, `/monthly-fortune`, `/year-fortune`, `/love-fortune`
- 핵심 데이터: 운세 응답, 콘텐츠 템플릿, 사전/가이드

### 4. Action Harness

- 역할: 길일 선택, 북마크, 저장함, 최근 활동, 재방문 루프
- 대표 화면: `/lucky-calendar`, `/saved`, `/`
- 핵심 데이터: `luckyDayBookmarks`, `savedSaju`, recent activity

### 5. Ops Harness

- 역할: 문의 대응, 관리자 큐, 콘텐츠 유지보수, 운영 품질
- 대표 화면: `/inquiries`, `/admin`, `/sinsal-guide`, `/glossary`
- 핵심 데이터: `inquiries`, 관리자 알림, 레퍼런스 콘텐츠

## User Flow

1. `Profile Harness` 에서 사용자 입력 수집
2. `Saju Engine Harness` 에서 명리 계산 수행
3. `Fortune Feed Harness` 에서 읽기 좋은 결과 생성
4. `Action Harness` 에서 일정·저장·재방문으로 전환
5. `Ops Harness` 에서 문의·운영 피드백 회수

## Why This Split

- 제품 구조: 사용자 흐름 중심으로 묶임
- 개발 구조: API/DB/화면 책임 경계 선명
- 운영 구조: 관리자 기능 분리 쉬움
- 확장 구조: 하네스별 독립 개선 가능
