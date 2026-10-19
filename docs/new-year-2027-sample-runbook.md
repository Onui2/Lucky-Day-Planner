# 2027 신년운세 공개 샘플 준비 절차

2027 유료 판매는 `REPORT_SALES_ENABLED`, `REPORT_2027_SALES_ENABLED`, 검수된 샘플(`sampleStatus: "verified"` + `samplePath`)을 모두 갖춰야 열립니다(`artifacts/api-server/src/lib/new-year-campaign.ts`). 이 문서는 샘플 조건을 채우는 순서입니다. 가상 인물이나 만든 분석을 쓰지 않습니다.

## 1. 공개 승인 입력 확보

- 본인(운영자) 또는 공개 사용에 서면 동의한 사람의 생년월일·출생시간을 사용합니다.
- 출생시간이 필요합니다. 2027 유료 분석은 시간 미입력 시 생성을 거부합니다.
- 동의 기록(누구·언제·공개 범위)은 저장소 밖에 보관합니다. 샘플 PDF에는 신원·출생정보가 들어가지 않지만, 원본 분석은 개인정보입니다.

## 2. 실제 저장 분석 만들기

1. 관리자 계정으로 로그인합니다.
2. `/saju?campaign=new-year-2027`에서 승인 입력으로 무료 결과를 띄운 뒤, 9,900원 상품을 관리자 무료 발급으로 생성합니다. 실제 고객 주문과 같은 경로로 `analysis_snapshots.saju_result`에 `reportEdition: "new-year-2027"`와 `newYearAnalysis`가 저장됩니다.
3. 같은 주문의 유료 PDF를 열어 정상 생성됐는지 확인합니다. 이 PDF가 4단계 대조 기준입니다.

## 3. 승인 JSON 만들기

해당 스냅샷에서 연간 결과만 꺼냅니다. `birth_info`, 제목, 사용자 ID는 넣지 않습니다.

```sql
select saju_result->'reportEdition' as report_edition,
       saju_result->'newYearAnalysis' as new_year_analysis
from analysis_snapshots
where id = <스냅샷 ID>;
```

저장소 밖 경로에 아래 형태로 저장합니다.

```json
{
  "approvedForPublicSample": true,
  "result": {
    "reportEdition": "new-year-2027",
    "newYearAnalysis": { "...": "위 쿼리의 new_year_analysis 값 그대로" }
  }
}
```

`approvedForPublicSample`은 1단계 동의를 확인한 사람만 `true`로 씁니다.

## 4. 샘플 PDF 생성

```bash
REPORT_2027_APPROVED_SAMPLE_JSON=<승인 JSON 경로> \
  corepack pnpm --filter @workspace/api-server exec tsx scripts/prepare-new-year-sample.ts
```

- 출력: `artifacts/saju-web/public/report-samples/new-year-2027.pdf`
- 승인 표시나 `reportEdition`이 없으면 실패합니다. 렌더러는 샘플 모드에서 2027 섹션이 정확히 3개가 아니거나, 한 섹션이 한 쪽을 넘으면 실패합니다(`report-generator.ts`).
- 스크립트는 판매 스위치나 `sampleStatus`를 바꾸지 않습니다.

## 5. 검수 체크리스트

- [ ] 정확히 3쪽: 핵심 요약·목차 / 월별 요약표 / 분야별 상세 해석
- [ ] 어느 쪽에도 이름·생년월일·출생시간·성별·주문번호가 없음(머리말은 "공개 승인 샘플 · 비식별")
- [ ] 2단계 유료 PDF의 같은 페이지와 점수·월주·문구가 일치
- [ ] 월별표가 양력 1~12월이고, 월 15일 대표값·입춘 기준 안내 문구가 있음
- [ ] 모바일 폭에서 `NewYearOffer`의 "구매 전 실제 서식 3쪽 확인"으로 열었을 때 글자가 읽힘
- [ ] 검수자·검수일 기록

## 6. 샘플 공개 표시

검수를 통과한 뒤에만 `artifacts/api-server/src/lib/new-year-campaign.ts`를 수정합니다.

```ts
sampleStatus: "verified" as "unverified" | "verified",
samplePath: "/report-samples/new-year-2027.pdf" as string | null,
```

`NewYearSample`은 `/report-samples/<이름>.pdf` 형식만 받고, 3쪽이 아니면 표시하지 않습니다.

## 7. 판매 열기 전 남은 확인

샘플만으로 판매를 열지 않습니다. `docs/new-year-2027-implementation.md`의 "남은 문제와 운영 전 검증"을 함께 확인합니다.

- 실제 모바일 결제 앱 복귀·로그인 만료·중복 클릭·생성 실패 후 재시도·환불 후 접근 차단
- 환불 상태 동기화
- 위 확인 후 운영 환경에 `REPORT_2027_SALES_ENABLED=true` 설정(`REPORT_SALES_ENABLED=true` 전제)
