import { useState } from "react";
import { Link } from "wouter";
import { customFetch } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";

const FIELDS = [
  ["refundsKrw", "실제 환불액"], ["pgKrw", "PG 비용"], ["freeAnalysisKrw", "무료 분석 비용"],
  ["paidGenerationKrw", "유료 생성 비용"], ["retriesKrw", "재시도 비용"],
  ["adKrw", "광고비"], ["contentKrw", "콘텐츠 제작비"], ["otherKrw", "세금 등 기타 비용"],
] as const;
type Row = {
  key: string; source: string; creative: string; visits: number; input_complete: number;
  free_result: number; checkout: number; approved: number; ready: number; provided: number;
  refund_status_orders: number; grossKrw: number; contributionKrw: number | null;
  perVisitorKrw: number | null; missingCosts: string[];
};
type Result = { rows: Row[]; note: string };
function won(value: number | null) { return value === null ? "미확인" : value.toLocaleString("ko-KR", { maximumFractionDigits: 1 }) + "원"; }

export default function CampaignResultsPage() {
  const [from, setFrom] = useState("2026-10-16");
  const [to, setTo] = useState("2026-11-16");
  const [costs, setCosts] = useState<Record<string, Record<string, string>>>({});
  const [data, setData] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  async function load() {
    setBusy(true); setError(null);
    try {
      const costsByContent = Object.fromEntries(Object.entries(costs).map(([key, fields]) => [key,
        Object.fromEntries(Object.entries(fields).map(([field, value]) => [field, value.trim() === "" ? null : Number(value)]))]));
      const result = await customFetch<Result>("/api/admin/campaigns/new-year-2027/metrics", {
        method: "POST", body: JSON.stringify({ from, to, costsByContent }),
      });
      setData(result); setDirty(false);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "집계 실패"); }
    finally { setBusy(false); }
  }
  return <div className="mx-auto max-w-6xl space-y-5">
    <Link href="/admin" className="text-sm text-primary underline">관리자 화면</Link>
    <h1 className="font-serif text-2xl">2027 콘텐츠 반응·손익</h1>
    <p className="text-sm leading-6 text-muted-foreground">방문일 기준 코호트입니다. 제공은 저장된 PDF의 서버 응답 기준이며 실제 완독을 뜻하지 않습니다. 비용은 같은 방문 집단에서 발생한 실제 합계를 입력하세요. 빈칸은 미확인, 확인된 무비용은 0입니다.</p>
    <form className="flex flex-wrap items-end gap-3" onSubmit={(event) => { event.preventDefault(); void load(); }}>
      <label className="text-sm">방문 시작일(KST)<input type="date" value={from} required onChange={(event) => { setFrom(event.target.value); setDirty(true); }} className="ml-2 rounded border p-2" /></label>
      <label className="text-sm">종료일(미포함)<input type="date" value={to} required onChange={(event) => { setTo(event.target.value); setDirty(true); }} className="ml-2 rounded border p-2" /></label>
      <Button disabled={busy} type="submit">{busy ? "집계 중" : "조회·손익 다시 계산"}</Button>
    </form>
    {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
    {dirty && data && <p role="status" className="text-sm">입력값이 바뀌었습니다. 다시 계산해야 결과에 반영됩니다.</p>}
    {data && <>
      <p className="text-xs leading-5 text-muted-foreground">{data.note}</p>
      {data.rows.length === 0 && <p>해당 기간에 수집된 방문이 없습니다.</p>}
      <div className="overflow-x-auto"><table className="w-full text-left text-sm">
        <caption className="sr-only">콘텐츠별 전환과 비용 반영 결과</caption>
        <thead><tr>{["소재", "방문", "입력", "무료 결과", "결제 시작(주문)", "승인", "생성 완료", "제공", "환불 상태 기록", "승인 매출", "비용 차감 이익", "방문자당 이익"].map((label) => <th key={label} className="whitespace-nowrap border-b p-2">{label}</th>)}</tr></thead>
        <tbody>{data.rows.map((row) => <tr key={row.key}>
          <th scope="row" className="p-2">{row.source} / {row.creative}</th>
          {[row.visits, row.input_complete, row.free_result, row.checkout, row.approved, row.ready, row.provided, row.refund_status_orders].map((value, index) => <td key={index} className="p-2">{value}</td>)}
          <td className="p-2">{won(row.grossKrw)}</td><td className="p-2">{dirty ? "재계산 필요" : won(row.contributionKrw)}</td><td className="p-2">{dirty ? "재계산 필요" : won(row.perVisitorKrw)}</td>
        </tr>)}</tbody>
      </table></div>
      {data.rows.map((row) => <fieldset key={row.key} disabled={busy} className="rounded-xl border p-4">
        <legend className="px-2 text-sm font-medium">{row.source} / {row.creative} · 실제 비용(원)</legend>
        <div className="grid gap-3 sm:grid-cols-3">{FIELDS.map(([field, label]) => <label key={field} className="text-sm">{label}<input inputMode="numeric" type="number" min="0" step="1" value={costs[row.key]?.[field] ?? ""}
          onChange={(event) => { setCosts((previous) => ({ ...previous, [row.key]: { ...previous[row.key], [field]: event.target.value } })); setDirty(true); }} className="mt-1 block w-full rounded border bg-background p-2" /></label>)}</div>
      </fieldset>)}
      <p className="text-xs text-muted-foreground">비용 입력은 이 화면의 계산에만 사용하며 DB에 저장하지 않습니다. 다음 방문 시 원장으로 다시 확인하세요. 환불 상태가 0건이어도 환불액을 0원으로 확정하지 않습니다.</p>
    </>}
  </div>;
}
