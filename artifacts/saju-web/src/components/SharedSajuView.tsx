import { forwardRef } from "react";

import type { PublicSharePayload } from "@/lib/share-snapshot";

const ELEMENT_LABELS: Record<string, string> = {
  wood: "목",
  fire: "화",
  earth: "토",
  metal: "금",
  water: "수",
};

export const SharedSajuView = forwardRef<HTMLDivElement, { payload: PublicSharePayload }>(
  function SharedSajuView({ payload }, ref) {
    const birth = payload.birthInfo;
    const summary = payload.summary;
    const elements = payload.elements;

    return (
      <div ref={ref} className="w-full max-w-2xl rounded-3xl border border-primary/20 bg-background p-6 text-foreground shadow-xl">
        <div className="border-b border-primary/15 pb-4">
          <div className="text-xs tracking-[0.18em] text-primary">명해원 공유 사주</div>
          <h1 className="mt-2 font-serif text-2xl font-bold">{payload.name ?? "사주 흐름 요약"}</h1>
          {birth && (
            <p className="mt-2 text-sm text-muted-foreground">
              {String(birth.year)}년 {String(birth.month)}월 {String(birth.day)}일 · {birth.calendarType === "lunar" ? "음력" : "양력"}
            </p>
          )}
        </div>

        {payload.pillars && (
          <div className="mt-5 grid grid-cols-4 gap-2">
            {payload.pillars.map((pillar) => (
              <div key={pillar.label} className="rounded-2xl border border-primary/15 bg-primary/5 px-2 py-4 text-center">
                <div className="text-xs text-muted-foreground">{pillar.label}</div>
                <div className="mt-2 text-lg font-semibold">
                  {pillar.value?.heavenlyStem ?? "?"}{pillar.value?.earthlyBranch ?? "?"}
                </div>
              </div>
            ))}
          </div>
        )}

        {elements && (
          <div className="mt-5">
            <h2 className="text-sm font-semibold">오행 흐름</h2>
            <div className="mt-2 grid grid-cols-5 gap-2">
              {Object.entries(ELEMENT_LABELS).map(([key, label]) => (
                <div key={key} className="rounded-xl border border-foreground/10 bg-foreground/5 px-2 py-3 text-center">
                  <div className="text-xs text-muted-foreground">{label}</div>
                  <div className="mt-1 font-semibold">{Number(elements[key] ?? 0)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {summary && (
          <div className="mt-5 space-y-3 rounded-2xl border border-primary/15 bg-primary/5 p-4">
            {typeof summary.fortune === "string" && summary.fortune && <p className="text-sm leading-relaxed">{summary.fortune}</p>}
            {typeof summary.personality === "string" && summary.personality && <p className="text-sm leading-relaxed text-muted-foreground">{summary.personality}</p>}
          </div>
        )}

        <div className="mt-5 text-xs text-muted-foreground">
          공유자가 선택한 항목만 표시됩니다. 사주 해석은 참고용입니다.
        </div>
      </div>
    );
  },
);
