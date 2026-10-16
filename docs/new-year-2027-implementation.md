# 2027 신년운세 구현 인수 기록

## 현재 상태

기존 Lucky-Day-Planner 앱·상품·토스 주문·분석 스냅샷·PDF 뷰어 안에 연결했습니다. 기존 미커밋 상태를 시작점으로 부분 수정했습니다. 새 독립 앱이나 별도 결제 시스템은 만들지 않았습니다.

로컬 코드 구현·타입 검사·자동 테스트·빌드는 완료했습니다. 실제 공개 샘플·완성 영상·운영 결제 검증은 미완료입니다. 사용자 입력이나 분석 결과를 임의로 만들지 않았습니다. 원본·다른 참가자 폴더는 수정하지 않았습니다. 게시·배포·DB 적용·커밋·병합도 하지 않았습니다.

## 구현한 흐름

1. 기존 /saju에 campaign=new-year-2027로 접근합니다. 기본 성향·오행·핵심 풀이를 무료로 보여줍니다.
2. 2027 변형에서는 기존 saju_detail 상품만 9,900원에 사용합니다. 일반 화면의 4,900·9,900·19,900원 구성과 무료 체험은 그대로입니다.
3. 기존 buildSajuResult와 getYearFortune의 2027 결과를 같은 주문의 analysis_snapshots에 저장합니다. 분 단위 입력·일주 보정을 전달합니다. 과거 주문은 새 연간 분석으로 바꾸지 않습니다.
4. 성향·관계·직업·재물·2027 연간 흐름·월별 요약을 리포트에 연결했습니다. 월별 데이터는 기존 엔진이 제공하는 양력 월 15일 대표 월주·점수이며, 월별 심화 서술을 만들어내지 않습니다. 계산 기준을 화면·PDF에 표시합니다.
5. PDF와 공개용 3쪽 샘플은 같은 요약·월별표·분야별 상세 렌더러를 사용합니다. 웹 뷰어는 저장된 PDF 바이트를 읽습니다.
6. 결제 앱 이동 전에 계정별 주문 ID와 만료시각만 저장합니다. 출생정보·결제키·금액은 이 복구 힌트에 저장하지 않습니다. 복귀 후 서버가 소유권·금액·PG 상태를 검증합니다.
7. 서버 상태를 2초 간격·최대 2분 동안 조회합니다. 실제 완료율을 알 수 없는 가짜 진행률은 추가하지 않았습니다. 오류 시 같은 주문 확인과 기존 마이페이지 재시도를 제공합니다.
8. 리포트 생성은 processing 상태와 2분 임대로 중복 실행을 막습니다. 만료 후 재시도할 수 있으며, 이전 작업은 임대시각 조건 때문에 새 작업 결과를 덮어쓰지 못합니다. 생성 실패가 주문의 paid 상태를 취소하지 않습니다.
9. 기존 명시적 PDF 재생성은 완료된 리포트도 다시 만들 수 있습니다. 결제 재확인은 완료본을 재사용합니다. 완료본 재생성은 읽었던 버전의 시각까지 비교해 동시 요청이 새 완료본을 다시 잡지 않도록 했습니다.

## 실제 샘플 준비 상태

- 현재 sampleStatus는 unverified, samplePath는 null입니다. 실제 2027 공개 샘플은 생성하지 않았습니다.
- 기존 공개 샘플은 2027 연간·월별 구성이 검증된 자료가 아니므로 그대로 재사용하거나 덮어쓰지 않았습니다.
- artifacts/api-server/scripts/prepare-new-year-sample.ts는 공개 승인을 받은 비식별 저장 분석 JSON만 받습니다. 승인 표시 approvedForPublicSample=true와 result.reportEdition=new-year-2027이 필요합니다. 새 가상 인물이나 분석을 생성하지 않습니다.
- 스크립트는 신원·출생정보를 샘플 렌더러에 전달하지 않고 저장된 연간 결과만 사용합니다. 출력은 기존 public/report-samples 아래 new-year-2027.pdf이며 정확히 3쪽이어야 합니다. 페이지가 넘치면 실패합니다.
- 샘플 생성·렌더링·시각 검수는 수행하지 않았습니다. 승인된 원본 분석이 없기 때문입니다. 실제 결과와 대조한 뒤에만 new-year-campaign.ts의 sampleStatus와 samplePath를 검토해야 합니다.
- REPORT_SALES_ENABLED, REPORT_2027_SALES_ENABLED, 검수된 샘플 조건을 모두 만족해야 일반 계정이 2027 주문을 만들 수 있습니다. 관리자 무료 발급 경로는 검수용으로 유지합니다.

## 콘텐츠·측정

- 대본 3개와 소재별 인스타그램·유튜브 링크: docs/new-year-2027-content-plan.md. 완성 영상이나 게시물은 아닙니다.
- 방문 식별자는 브라우저별 무작위 UUID, 7일 첫 유입 기준입니다. 사람 수와 동일하지 않으며 저장 차단·브라우저 변경으로 누락·중복될 수 있습니다. 유입명은 허용된 source·creative 값만 받습니다.
- POST /api/campaign/events: visit, input_complete, free_result만 허용합니다. 반복 이벤트는 첫 시각을 보존합니다. 출생정보·고민·이메일·IP·전체 URL은 이벤트에 넣지 않습니다. 초기 단계는 브라우저 측정값입니다.
- 주문의 campaignVisitId는 서버에 수집된 7일 이내 방문 ID일 때만 연결합니다. 추적 저장소 오류는 구매를 막지 않습니다. 누락 주문이 생길 수 있으므로 측정 장애 기간에는 전환율을 확정하지 않습니다.
- 결제 시작은 서버 주문 생성 기준입니다. 승인·생성 완료는 기존 결제·리포트 기록, 제공은 저장 PDF의 최초 서버 응답 기준입니다. 제공은 파일 수신 완료나 완독 확인이 아닙니다.
- 관리자 화면: /admin/campaigns/new-year-2027. 관리자 대시보드에 연결했습니다.
- POST /api/admin/campaigns/new-year-2027/metrics는 조회만 합니다. 방문일 기준 한국시간 시작일 포함·종료일 미포함, 최대 93일입니다. 후속 결제·제공은 같은 방문 집단에 연결합니다.
- 관리자·무료·개발·테스트·결제 환경 미확인 주문은 매출 집계에서 제외합니다. 기존 PG 키·toss_pay mode에 따른 환경 표시를 주문 생성 때 고정합니다.
- 환불 상태의 운영 동기화는 확인하지 못했습니다. 상태가 0건이어도 환불액이 0원이라는 뜻이 아닙니다. 같은 방문 집단의 실제 환불·PG·무료 분석·유료 생성·재시도·광고·제작·세금 등 기타 비용을 전부 입력해야 이익과 방문자당 이익을 계산합니다. 빈칸은 미확인, 확인된 무비용만 0으로 입력합니다. 비용은 DB에 저장하지 않습니다.

## DB·환경 설정

- docs/sql/new-year-campaign-visits.sql은 검토용이며 실행하지 않았습니다. 새 방문 테이블은 DB 자동 초기화에 넣지 않았습니다.
- 검토용 SQL은 RLS를 켜고 PUBLIC·anon·authenticated의 직접 테이블 접근을 차단합니다. 서버는 테이블 소유자 또는 테이블 권한과 BYPASSRLS를 가진 신뢰된 역할을 사용해야 합니다. 실제 역할 설정은 적용 전에 확인해야 합니다.
- CAMPAIGN_ANALYTICS_ENABLED는 기본 false입니다. 별도로 승인된 SQL 적용·보존기간·개인정보 안내 확인 후 켭니다. 설정만 켜고 테이블을 적용하지 않으면 측정 API가 503을 반환합니다.
- REPORT_2027_SALES_ENABLED는 기본 false입니다. 기존 전역 판매 스위치를 대체하지 않습니다.
- REPORT_2027_APPROVED_SAMPLE_JSON은 샘플 준비 스크립트의 입력 경로입니다. 고객 원본이나 공개 승인 없는 분석을 사용하지 않습니다.

## 수행한 검증

- 회의 코덱스 작업은 셸·콘솔 명령 없이 파일 API로 읽기·쓰기·검색했습니다. 이후 상위 작업에서 로컬 자동 검증을 실행했습니다.
- TypeScript 5.9.3 컴파일러 API로 파일을 읽어 noEmit 정적 타입 검사를 수행했습니다. 서버·웹·DB 모델·API 클라이언트 모두 진단 0건입니다. 빌드 산출물이나 DB 연결을 만들지 않았습니다.
- 변경 TypeScript·TSX 전체 구문 검사: 오류 0건.
- 수정 파일 실제 경로가 코비 작업 폴더 안인지 확인했습니다.
- 기존 상품 설정, 공개 PDF 샘플, DB 자동 초기화 파일을 바꾸지 않았음을 확인했습니다.
- 최종 `corepack pnpm run verify` 종료 코드 0: 전체 타입 검사·워크스페이스 테스트·빌드 통과. DB 27개, API 220개, 웹 21개로 총 268개 통과했습니다. 기존 실제 DB 동시 예약 검사 1개는 DATABASE_URL이 없어 건너뛰었습니다.
- 결제·PDF 격리 회귀 검사 83개 통과. 새 재생성 회귀 검사는 수정 전 실패했고 수정 후 통과했습니다. 완료본 결제 재확인, 동시 재생성 1회, 만료 임대 재시도와 늦은 작업의 덮어쓰기 방지도 검사했습니다. 기존 테스트 대역에는 실제로 사용하는 lt 비교 연산을 추가했습니다.
- 원본 기존 수정 파일 18개 SHA-256이 시작 시점과 동일함을 확인했습니다. 빌드가 만든 무관한 mockup 생성 파일의 개행 변경은 정리했습니다.
- 실결제·모바일 브라우저·실제 PDF 샘플 생성·시각 검수·DB 연결 검사는 수행하지 않았습니다. 자동 검증 통과는 운영 검증을 대신하지 않습니다. Vite 빌드 중 기존 UI 컴포넌트 3개의 sourcemap 위치 경고는 남았으며 빌드는 성공했습니다.

## 남은 문제와 운영 전 검증

- 공개 승인된 실제 2027 분석과 동일 서식 샘플 3쪽이 필요합니다. 이 자료 없이 판매나 월별표 영상을 공개하면 안 됩니다.
- 기존 연간 엔진은 출생시간 미입력 시 대체 시주를 사용합니다. 이번 유료 변형에서는 이 경로를 차단했습니다. 무료 분석은 유지합니다. 시간 모름 지원은 별도 검수 과제입니다.
- 실제 모바일의 결제 앱 복귀·로그인 만료·승인 응답 타임아웃·중복 클릭·생성 중단 후 재시도·환불 후 접근 차단은 운영 검증이 필요합니다. 원래 PG·DB 설정과 환불 동기화는 미확인입니다.
- 새로운 수익 데이터는 없습니다. 조회수·구매율·방문자당 이익을 만들어내거나 추정값으로 채우지 않았습니다.
- 14,900원 개인 고민 심화는 기존 주제 선택만으로 제공했다고 볼 수 없습니다. 별도 출시·가격 변경·홍보는 하지 않았습니다.

## 변경 파일

| 파일 | 구분 |
|---|---|
| .env.example | 수정 |
| artifacts/api-server/scripts/prepare-new-year-sample.ts | 추가 |
| artifacts/api-server/src/lib/campaign-metrics.ts | 추가 |
| artifacts/api-server/src/lib/commerce-security.test.ts | 수정 · 최종 검증 보완 |
| artifacts/api-server/src/lib/new-year-campaign.ts | 추가 |
| artifacts/api-server/src/lib/report-generator.ts | 수정 |
| artifacts/api-server/src/lib/report-rendering.ts | 추가 |
| artifacts/api-server/src/lib/year-fortune.ts | 수정 |
| artifacts/api-server/src/routes/campaigns.ts | 추가 |
| artifacts/api-server/src/routes/commerce.ts | 수정 |
| artifacts/api-server/src/routes/index.ts | 수정 |
| artifacts/api-server/src/routes/reports.ts | 수정 |
| artifacts/saju-web/src/App.tsx | 수정 |
| artifacts/saju-web/src/components/NewYearOffer.tsx | 추가 |
| artifacts/saju-web/src/components/NewYearSample.tsx | 추가 |
| artifacts/saju-web/src/components/ReportPurchaseButton.tsx | 수정 |
| artifacts/saju-web/src/components/ReportPurchaseOptions.tsx | 수정 |
| artifacts/saju-web/src/lib/campaign-tracking.ts | 추가 |
| artifacts/saju-web/src/lib/toss-payments.ts | 수정 |
| artifacts/saju-web/src/pages/account.tsx | 수정 |
| artifacts/saju-web/src/pages/admin.tsx | 수정 |
| artifacts/saju-web/src/pages/campaign-results.tsx | 추가 |
| artifacts/saju-web/src/pages/payment-success.tsx | 수정 |
| artifacts/saju-web/src/pages/report-viewer.tsx | 수정 |
| artifacts/saju-web/src/pages/saju.tsx | 수정 |
| docs/new-year-2027-content-plan.md | 추가 |
| docs/sql/new-year-campaign-visits.sql | 추가 |
| lib/api-client-react/src/index.ts | 수정 |
| lib/db/src/schema/campaignVisits.ts | 추가 |
| lib/db/src/schema/index.ts | 수정 |
| docs/new-year-2027-implementation.md | 추가 · 이 문서 |
