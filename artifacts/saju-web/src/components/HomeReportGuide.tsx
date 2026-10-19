import { Link } from "wouter";
import { ArrowRight, Check, ExternalLink, Minus } from "lucide-react";
import { useGetCommerceProducts } from "@workspace/api-client-react";

const REPORTS = [
  { type: "saju_basic", name: "기본", purpose: "내 성향부터 가볍게", page: 1, image: "basic-page-1.webp", previewTitle: "내 사주의 기본 틀", previewDescription: "사주 원국과 일간·용신", imageAlt: "기본 리포트 1쪽: 가상 인물의 사주 원국과 일간·용신" },
  { type: "saju_detail", name: "상세", purpose: "일·돈·관계를 자세히", page: 6, image: "detail-page-6.webp", previewTitle: "일과 관계를 읽는 방법", previewDescription: "성격·직업·재물·연애 해석", imageAlt: "상세 리포트 6쪽: 성격, 직업운, 재물과 생활 관리, 연애운" },
  { type: "saju_full", name: "종합", purpose: "지나온 시간과 앞으로", page: 27, image: "full-page-27.webp", previewTitle: "앞으로의 흐름 살펴보기", previewDescription: "연도별 흐름과 생활 조언", imageAlt: "종합 리포트 27쪽: 앞으로의 연도별 흐름과 생활 조언" },
] as const;

const COMPARISON = [
  { label: "핵심 성향·오행", included: [true, true, true] },
  { label: "선택한 고민의 해석·실천 안내", included: [true, true, true] },
  { label: "직업·재물·관계·건강 해설", included: [false, true, true] },
  { label: "대운 흐름·주의 시기", included: [false, true, true] },
  { label: "어린 시절부터 현재까지 회고", included: [false, false, true] },
  { label: "앞으로의 연도별 흐름", included: [false, false, true] },
];

const sampleHref = (type: string) => `${import.meta.env.BASE_URL}report-samples/${type.replaceAll("_", "-")}.pdf`;

export default function HomeReportGuide() {
  const catalog = useGetCommerceProducts();

  return (
    <div className="home-report-guide w-full max-w-5xl space-y-14 pb-12 sm:space-y-20 sm:pb-16">
      <section id="report-preview" aria-labelledby="report-preview-title" className="scroll-mt-28 border-t border-foreground/10 pt-10 sm:pt-14">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-widest text-primary">리포트 미리보기</p>
            <h2 id="report-preview-title" className="mt-3 text-2xl font-semibold leading-snug sm:text-3xl">어떤 해석을 받는지,<br className="sm:hidden" /> 먼저 살펴보세요</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">공개 PDF에서 가져온 실제 페이지입니다. 가상 인물의 예시이며, 개인별 해석과 분량은 달라집니다.</p>
          </div>
          <p className="text-xs text-muted-foreground sm:hidden">옆으로 넘겨 세 가지 샘플을 살펴보세요 →</p>
        </div>
        <div className="mt-6 flex snap-x snap-mandatory gap-5 overflow-x-auto pb-4 sm:grid sm:grid-cols-3 sm:overflow-visible">
          {REPORTS.map(report => (
            <a key={report.type} href={`${sampleHref(report.type)}#page=${report.page}`} target="_blank" rel="noreferrer"
              className="group relative min-w-[78%] snap-start rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4 sm:min-w-0">
              <div className="overflow-hidden rounded-xl border border-foreground/10 bg-secondary/40 p-3 transition-colors group-hover:bg-secondary/70 sm:p-4">
                <img src={`${import.meta.env.BASE_URL}report-samples/${report.image}`} alt={report.imageAlt}
                  width={849} height={1200} loading="lazy" decoding="async" className="h-auto w-full rounded-sm shadow-md shadow-foreground/10" />
              </div>
              <div className="mt-4 flex items-center justify-between gap-2 text-xs font-medium text-primary">
                <span>{report.name} 리포트 · {report.page}쪽</span>
                <span className="inline-flex items-center gap-1">원본 PDF <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" /><span className="sr-only">새 탭에서 보기</span></span>
              </div>
              <h3 className="mt-2 font-sans text-base font-semibold">{report.previewTitle}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{report.previewDescription}</p>
            </a>
          ))}
        </div>
      </section>

      <section id="report-comparison" aria-labelledby="report-comparison-title" className="scroll-mt-28">
        <p className="text-xs font-semibold tracking-widest text-primary">구성 비교</p>
        <h2 id="report-comparison-title" className="mt-3 text-2xl font-semibold break-keep sm:text-3xl">지금 필요한 깊이만 선택하세요</h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">핵심 요약은 무료입니다. 더 읽고 싶은 범위에 따라 리포트를 고르세요.</p>

        {catalog.isPending ? <p role="status" className="mt-6 rounded-xl border bg-card p-6 text-sm text-muted-foreground">리포트 구성과 가격을 불러오고 있습니다.</p>
          : catalog.isError ? <div role="alert" className="mt-6 rounded-xl border bg-card p-5 text-sm">가격 정보를 불러오지 못했습니다. <button type="button" onClick={() => void catalog.refetch()} className="inline-flex min-h-11 items-center font-medium underline underline-offset-4">다시 불러오기</button></div>
          : <div className="mt-6 overflow-hidden rounded-2xl border border-foreground/10 bg-card">
            <table className="w-full table-fixed text-center text-sm">
              <caption className="sr-only">기본, 상세, 종합 사주 리포트의 가격과 포함 내용 비교</caption>
              <thead>
                <tr className="border-b border-foreground/10 bg-secondary/35">
                  <th scope="col" className="w-[34%] p-3 text-left text-xs font-medium text-muted-foreground sm:p-5 sm:text-sm">포함 내용</th>
                  {REPORTS.map(report => {
                    const product = catalog.data?.products.find(item => item.type === report.type);
                    return <th key={report.type} scope="col" className="px-1 py-5 sm:px-3 sm:py-6">
                      <span className="font-semibold">{report.name}</span>
                      <span className="mt-2 block whitespace-nowrap text-[13px] font-bold tabular-nums min-[380px]:text-base sm:text-2xl">{product ? product.amount.toLocaleString("ko-KR") : "—"}<span className="ml-0.5 text-[10px] font-normal sm:text-xs">{product && "원"}</span></span>
                      <span className="mt-2 hidden text-xs font-normal text-muted-foreground sm:block">{report.purpose}</span>
                    </th>;
                  })}
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map(row => <tr key={row.label} className="border-b border-foreground/8 last:border-b-0">
                  <th scope="row" className="px-3 py-4 text-left text-xs font-medium leading-5 break-keep sm:px-5 sm:text-sm">{row.label}</th>
                  {row.included.map((included, index) => <td key={index} className="px-2 py-4">
                    {included ? <Check className="mx-auto h-4 w-4 text-primary sm:h-5 sm:w-5" aria-hidden="true" /> : <Minus className="mx-auto h-4 w-4 text-muted-foreground/50" aria-hidden="true" />}
                    <span className="sr-only">{included ? "포함" : "미포함"}</span>
                  </td>)}
                </tr>)}
              </tbody>
            </table>
            <div className="border-t border-foreground/10 bg-secondary/20 px-4 py-4 text-xs leading-6 text-muted-foreground sm:px-5">
              <p className="font-medium text-foreground">모든 유료 리포트 공통 · 웹 열람 + PDF 다운로드 · 1회 결제 · 부가세 포함</p>
              <p>연도별 분석 범위는 입력 정보와 산출 가능한 데이터에 따라 달라집니다. 건강·재물 해석은 의료·투자 판단을 대신하지 않습니다.</p>
            </div>
          </div>}

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <Link href="/saju" className="inline-flex min-h-11 items-center gap-2 text-sm font-medium underline underline-offset-4">무료 요약부터 보기 <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
          <Link href="/reports" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-foreground px-5 text-sm font-medium text-background transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">상품 상세 · 결제 안내 <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
        </div>
      </section>
    </div>
  );
}
