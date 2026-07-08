import { forwardRef } from "react";

const STEM_HANJA: Record<string, string> = {
  갑: "甲", 을: "乙", 병: "丙", 정: "丁", 무: "戊",
  기: "己", 경: "庚", 신: "辛", 임: "壬", 계: "癸",
};
const BRANCH_HANJA: Record<string, string> = {
  자: "子", 축: "丑", 인: "寅", 묘: "卯", 진: "辰", 사: "巳",
  오: "午", 미: "未", 신: "申", 유: "酉", 술: "戌", 해: "亥",
};
const ELEM_HEX: Record<string, string> = {
  목: "#4ade80", 화: "#f87171", 토: "#fbbf24", 금: "#cbd5e1", 수: "#60a5fa",
};
const ELEM_KOR: Record<string, string> = {
  목: "木", 화: "火", 토: "土", 금: "金", 수: "水",
};
const ELEM_LABEL: Record<string, string> = {
  목: "목 (木)", 화: "화 (火)", 토: "토 (土)", 금: "금 (金)", 수: "수 (水)",
};

function sh(k: string) { return STEM_HANJA[k] ?? k; }
function bh(k: string) { return BRANCH_HANJA[k] ?? k; }

function pillarHanja(pillar: Record<string, unknown> | null | undefined) {
  if (!pillar) return { top: "?", bot: "?" };
  return {
    top: sh(String(pillar.heavenlyStem ?? "?")),
    bot: bh(String(pillar.earthlyBranch ?? "?")),
  };
}

function pillarKor(pillar: Record<string, unknown> | null | undefined) {
  if (!pillar) return "??";
  return `${pillar.heavenlyStem ?? "?"}${pillar.earthlyBranch ?? "?"}`;
}

function elemColor(elem: string) {
  return ELEM_HEX[elem?.toLowerCase()] ?? "#d4af37";
}

function compactShadowReading(shadow: unknown) {
  if (!shadow || typeof shadow !== "object") return "";
  const value = shadow as Record<string, unknown>;
  const summary = typeof value.summary === "string" ? value.summary.replace(/\s+/g, " ").trim() : "";
  const firstPitfall = Array.isArray(value.pitfalls)
    ? value.pitfalls.find((item): item is string => typeof item === "string" && item.trim().length > 0)
    : "";
  const text = [summary, firstPitfall ? `주의: ${firstPitfall.trim()}` : ""].filter(Boolean).join(" ");
  return text.length > 90 ? `${text.slice(0, 87)}...` : text;
}

interface Props {
  result: Record<string, any>;
}

// 카드 외부에서 ref를 붙여 toPng()로 캡처
export const SajuShareCard = forwardRef<HTMLDivElement, Props>(function SajuShareCard(
  { result },
  ref,
) {
  const bi = (result.birthInfo ?? {}) as Record<string, unknown>;
  const year = bi.year;
  const month = bi.month;
  const day = bi.day;
  const hour = typeof bi.hour === "number" ? bi.hour : -1;
  const gender = bi.gender === "female" ? "여성" : "남성";
  const calType = bi.calendarType === "lunar" ? "음력" : "양력";

  const yearP = result.yearPillar;
  const monthP = result.monthPillar;
  const dayP = result.dayPillar;
  const hourP = result.hourPillar;

  const dayMasterElem = String(result.dayMasterElement ?? "");
  const dayMasterStem = String(dayP?.heavenlyStem ?? "");
  const sinGangYak = String(result.sinGangYak?.label ?? "");
  const yongsin = String(result.yongsin?.yongsin ?? "");
  const geokguk = String(result.geokguk?.name ?? "");
  const dominant = String(result.dominantElement ?? "");
  const lacking = String(result.lackingElement ?? "");

  const fortune = String(result.fortune ?? "").replace(/\s+/g, " ").trim();
  const fortuneShort = fortune.length > 90
    ? fortune.slice(0, 87) + "…"
    : fortune;
  const shadowShort = compactShadowReading(result.shadowReading);

  const elBalance = (result.elementBalance ?? {}) as Record<string, number>;
  const specialSummary = (result.specialSummary ?? {}) as Record<string, unknown>;
  const specialElementLine =
    typeof specialSummary.elementLine === "string" ? specialSummary.elementLine : "";
  const specialDetailLine =
    typeof specialSummary.detailLine === "string" ? specialSummary.detailLine : "";
  const elems = ["목", "화", "토", "금", "수"];
  // elementBalance는 영문 키(wood/fire/earth/metal/water)로 내려온다.
  // 한글 키로 조회하면 전부 undefined→0이 되므로 매핑해서 읽는다.
  const KOR_TO_ENG: Record<string, string> = {
    목: "wood", 화: "fire", 토: "earth", 금: "metal", 수: "water",
  };
  const elVal = (e: string) => elBalance[KOR_TO_ENG[e]] ?? elBalance[e] ?? 0;
  const maxEl = Math.max(...elems.map(elVal), 1);

  const pillars = [
    { label: "년주", p: yearP },
    { label: "월주", p: monthP },
    { label: "일주", p: dayP },
    { label: "시주", p: hourP },
  ];

  const hourLabel = hour < 0 ? "시간 미상" : `${hour}시`;

  // ── 스타일 상수 ─────────────────────────────────────
  const GOLD = "#d4af37";
  const GOLD_DIM = "rgba(212,175,55,0.25)";
  const BG = "#0b0c14";
  const CARD_BG = "#111420";
  const BORDER = "rgba(212,175,55,0.22)";
  const TEXT = "#f0e8d0";
  const MUTED = "rgba(240,232,208,0.5)";
  const W = 720;

  const sectionStyle: React.CSSProperties = {
    padding: "18px 28px",
    borderBottom: `1px solid ${BORDER}`,
  };

  return (
    <div
      ref={ref}
      style={{
        width: W,
        background: BG,
        fontFamily:
          "'Apple SD Gothic Neo', 'Noto Sans KR', 'Malgun Gothic', 'Apple Gothic', sans-serif",
        color: TEXT,
        borderRadius: 20,
        border: `1.5px solid ${BORDER}`,
        overflow: "hidden",
        boxShadow: "0 24px 80px rgba(0,0,0,0.7)",
        letterSpacing: "0.01em",
      }}
    >
      {/* ── 헤더 ── */}
      <div
        style={{
          background: "linear-gradient(135deg, #0e1020 0%, #1a1430 60%, #0e1020 100%)",
          padding: "28px 28px 22px",
          borderBottom: `1px solid ${BORDER}`,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* 배경 원형 장식 */}
        <div
          style={{
            position: "absolute",
            top: -40,
            right: -40,
            width: 180,
            height: 180,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${GOLD_DIM} 0%, transparent 70%)`,
            pointerEvents: "none",
          }}
        />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: "0.22em", color: GOLD, textTransform: "uppercase", marginBottom: 6 }}>
              命海苑 · MYEONGHAE-WON
            </div>
            <div style={{ fontSize: 26, fontWeight: 700, color: TEXT, lineHeight: 1.2 }}>
              정밀 사주 분석
            </div>
            <div style={{ fontSize: 13, color: MUTED, marginTop: 4 }}>
              {String(year ?? "")}년 {String(month ?? "")}월 {String(day ?? "")}일 {hourLabel} · {gender} · {calType}
            </div>
          </div>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              border: `1.5px solid ${GOLD_DIM}`,
              background: "rgba(212,175,55,0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 26,
            }}
          >
            ☯
          </div>
        </div>
      </div>

      {/* ── 사주팔자 ── */}
      <div style={{ ...sectionStyle }}>
        <div style={{ fontSize: 10, letterSpacing: "0.18em", color: GOLD, textTransform: "uppercase", marginBottom: 12 }}>
          사주팔자 四柱八字
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          {pillars.map(({ label, p }) => {
            const h = pillarHanja(p);
            const kor = pillarKor(p);
            const stemElem = String(p?.heavenlyStemElement ?? "");
            const branchElem = String(p?.earthlyBranchElement ?? "");
            return (
              <div
                key={label}
                style={{
                  flex: 1,
                  background: "rgba(255,255,255,0.04)",
                  border: `1px solid ${BORDER}`,
                  borderRadius: 14,
                  padding: "14px 10px",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 10, color: GOLD, letterSpacing: "0.1em", marginBottom: 8 }}>
                  {label}
                </div>
                <div style={{ fontSize: 30, fontWeight: 700, color: elemColor(stemElem), lineHeight: 1 }}>
                  {h.top}
                </div>
                <div style={{ width: 1, height: 6, background: BORDER, margin: "6px auto" }} />
                <div style={{ fontSize: 30, fontWeight: 700, color: elemColor(branchElem), lineHeight: 1 }}>
                  {h.bot}
                </div>
                <div style={{ fontSize: 12, color: MUTED, marginTop: 8 }}>{kor}</div>
              </div>
            );
          })}
        </div>
        {(specialElementLine || specialDetailLine) && (
          <div
            style={{
              marginTop: 14,
              border: `1px solid ${BORDER}`,
              borderRadius: 12,
              overflow: "hidden",
              background: "rgba(255,255,255,0.035)",
              textAlign: "center",
            }}
          >
            {specialElementLine && (
              <div
                style={{
                  padding: "8px 12px",
                  borderBottom: specialDetailLine ? `1px solid ${BORDER}` : "none",
                  fontFamily: "'Noto Serif KR', 'Noto Sans KR', serif",
                  fontSize: 18,
                  fontWeight: 700,
                  color: TEXT,
                }}
              >
                {specialElementLine}
              </div>
            )}
            {specialDetailLine && (
              <div
                style={{
                  padding: "8px 12px",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "rgba(240,232,208,0.82)",
                  lineHeight: 1.55,
                }}
              >
                {specialDetailLine}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── 핵심 정보 ── */}
      <div style={{ ...sectionStyle, display: "flex", gap: 10 }}>
        {/* 일간 */}
        <div
          style={{
            flex: 1,
            background: `linear-gradient(135deg, ${elemColor(dayMasterElem)}18, ${elemColor(dayMasterElem)}08)`,
            border: `1px solid ${elemColor(dayMasterElem)}40`,
            borderRadius: 14,
            padding: "16px 14px",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 10, color: elemColor(dayMasterElem), letterSpacing: "0.15em", marginBottom: 8 }}>
            일간 日干
          </div>
          <div style={{ fontSize: 34, fontWeight: 700, color: elemColor(dayMasterElem), lineHeight: 1 }}>
            {sh(dayMasterStem)}
          </div>
          <div style={{ fontSize: 13, color: TEXT, marginTop: 6 }}>
            {ELEM_KOR[dayMasterElem] ?? dayMasterElem} · {dayMasterElem}
          </div>
        </div>

        {/* 신강/약, 용신, 격국 */}
        <div style={{ flex: 2, display: "flex", flexDirection: "column", gap: 8 }}>
          <div
            style={{
              background: "rgba(255,255,255,0.04)",
              border: `1px solid ${BORDER}`,
              borderRadius: 10,
              padding: "10px 14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span style={{ fontSize: 11, color: MUTED }}>신강 · 신약</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: TEXT }}>{sinGangYak || "—"}</span>
          </div>
          <div
            style={{
              background: "rgba(255,255,255,0.04)",
              border: `1px solid ${BORDER}`,
              borderRadius: 10,
              padding: "10px 14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span style={{ fontSize: 11, color: MUTED }}>용신 用神</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: GOLD }}>{yongsin || "—"}</span>
          </div>
          {geokguk && (
            <div
              style={{
                background: "rgba(255,255,255,0.04)",
                border: `1px solid ${BORDER}`,
                borderRadius: 10,
                padding: "10px 14px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span style={{ fontSize: 11, color: MUTED }}>격국 格局</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>{geokguk}</span>
            </div>
          )}
          {(dominant || lacking) && (
            <div
              style={{
                background: "rgba(255,255,255,0.04)",
                border: `1px solid ${BORDER}`,
                borderRadius: 10,
                padding: "10px 14px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span style={{ fontSize: 11, color: MUTED }}>강함 · 약함</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>
                <span style={{ color: elemColor(dominant) }}>{dominant}</span>
                {" / "}
                <span style={{ color: elemColor(lacking) }}>{lacking}</span>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── 오행 분포 ── */}
      <div style={{ ...sectionStyle }}>
        <div style={{ fontSize: 10, letterSpacing: "0.18em", color: GOLD, textTransform: "uppercase", marginBottom: 14 }}>
          오행 분포 五行
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {elems.map((e) => {
            const val = elVal(e);
            const pct = Math.round((val / (maxEl + 1)) * 100);
            return (
              <div key={e} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 52, fontSize: 12, color: MUTED, flexShrink: 0 }}>
                  {ELEM_LABEL[e]}
                </div>
                <div
                  style={{
                    flex: 1,
                    height: 8,
                    background: "rgba(255,255,255,0.07)",
                    borderRadius: 99,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${Math.max(pct, val > 0 ? 8 : 0)}%`,
                      height: "100%",
                      background: elemColor(e),
                      borderRadius: 99,
                    }}
                  />
                </div>
                <div style={{ width: 16, fontSize: 13, fontWeight: 600, color: val > 0 ? elemColor(e) : MUTED, textAlign: "right", flexShrink: 0 }}>
                  {val}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 종합 운세 ── */}
      {fortuneShort && (
        <div style={{ ...sectionStyle, borderBottom: "none" }}>
          <div style={{ fontSize: 10, letterSpacing: "0.18em", color: GOLD, textTransform: "uppercase", marginBottom: 12 }}>
            핵심 메시지
          </div>
          <div
            style={{
              background: "rgba(212,175,55,0.06)",
              border: `1px solid rgba(212,175,55,0.18)`,
              borderRadius: 12,
              padding: "14px 16px",
              fontSize: 13.5,
              lineHeight: 1.85,
              color: TEXT,
            }}
          >
            {fortuneShort}
          </div>
          {shadowShort && (
            <div
              style={{
                marginTop: 10,
                background: "rgba(248,113,113,0.08)",
                border: "1px solid rgba(248,113,113,0.22)",
                borderRadius: 12,
                padding: "12px 14px",
                fontSize: 12.5,
                lineHeight: 1.75,
                color: "#fecaca",
              }}
            >
              {shadowShort}
            </div>
          )}
        </div>
      )}

      {/* ── 푸터 ── */}
      <div
        style={{
          padding: "14px 28px",
          borderTop: `1px solid ${BORDER}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "rgba(0,0,0,0.25)",
        }}
      >
        <div style={{ fontSize: 11, color: GOLD, letterSpacing: "0.16em" }}>
          명해원 (命海苑)
        </div>
        <div style={{ fontSize: 10, color: MUTED }}>
          정밀 사주 · AI 운세 분석 플랫폼
        </div>
      </div>
    </div>
  );
});
