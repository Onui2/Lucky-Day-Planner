import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  STEMS, STEMS_HANJA,
  BRANCHES, BRANCHES_HANJA, BRANCHES_ANIMAL,
  STEM_COMBINATIONS, STEM_CLASHES,
  BRANCH_SIX_COMBINATIONS, BRANCH_TRIPLE_COMBINATIONS, BRANCH_DIRECTIONAL,
  BRANCH_CLASHES,
  HYEONG_SAL,
  GWIMUN_SAL,
  SAMJAE_GROUPS,
  CHEONEUR_GWIIN, MUNCHANG_GWIIN, YANGINSSAL,
  YEOKMA_SAL, DOHWA_SAL, HWAGAE_SAL,
  JANG_GAN,
  ELEM_BADGE, ELEM_TEXT,
} from "@/data/sajuTables";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "stem",    label: "천간",    icon: "☰" },
  { key: "branch",  label: "지지 합·충", icon: "⊕" },
  { key: "hyeong",  label: "형살",    icon: "⚔️" },
  { key: "sinsal",  label: "신살 조견표", icon: "✨" },
  { key: "samjae",  label: "삼재",    icon: "🛡️" },
  { key: "janggan", label: "장간",    icon: "🔬" },
] as const;
type TabKey = typeof TABS[number]["key"];

function SectionTitle({ icon, title, sub }: { icon: string; title: string; sub?: string }) {
  return (
    <div className="flex items-center gap-2.5 mb-4">
      <span className="text-xl">{icon}</span>
      <div>
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function ElemBadge({ elem }: { elem: string }) {
  return (
    <span className={cn("text-[11px] font-medium px-1.5 py-0.5 rounded border", ELEM_BADGE[elem] ?? "bg-white/5 text-foreground/60 border-white/10")}>
      {elem}
    </span>
  );
}

function BranchPill({ b }: { b: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-medium">
      <span className="text-muted-foreground">{BRANCHES_HANJA[b] ?? b}</span>
      <span className="text-foreground/90">{b}</span>
    </span>
  );
}

function StemPill({ s }: { s: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-400/10 border border-amber-400/20 text-xs font-medium text-amber-300">
      <span className="text-muted-foreground">{STEMS_HANJA[s] ?? s}</span>
      <span>{s}</span>
    </span>
  );
}

// ── 탭 1: 천간 ────────────────────────────────────
function StemTab() {
  return (
    <div className="space-y-6">
      {/* 천간합 */}
      <Card className="glass-panel border-amber-400/20">
        <CardHeader className="pb-3 border-b border-amber-400/10">
          <SectionTitle icon="🔗" title="천간합 (天干合)" sub="음양 상합 — 두 천간이 결합해 새 오행 생성" />
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid gap-2">
            {STEM_COMBINATIONS.map((c) => (
              <div key={c.stems.join("+")} className="flex items-center gap-3 p-3 rounded-xl bg-white/3 border border-white/5">
                <div className="flex items-center gap-1.5 min-w-[90px]">
                  <StemPill s={c.stems[0]} />
                  <span className="text-muted-foreground text-xs">+</span>
                  <StemPill s={c.stems[1]} />
                </div>
                <span className="text-muted-foreground text-xs">→</span>
                <ElemBadge elem={c.element} />
                <span className="text-xs text-muted-foreground flex-1">{c.desc}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 천간충 */}
      <Card className="glass-panel border-red-500/20">
        <CardHeader className="pb-3 border-b border-red-500/10">
          <SectionTitle icon="⚡" title="천간충 (天干沖)" sub="서로 상극하는 천간 관계" />
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid gap-2">
            {STEM_CLASHES.map((c) => (
              <div key={c.stems.join("-")} className="flex items-center gap-3 p-3 rounded-xl bg-red-500/3 border border-red-500/8">
                <div className="flex items-center gap-1.5 min-w-[90px]">
                  <StemPill s={c.stems[0]} />
                  <span className="text-red-400 text-sm">↔</span>
                  <StemPill s={c.stems[1]} />
                </div>
                <span className="text-xs text-red-400/70 font-medium">{c.elements}</span>
                <span className="text-xs text-muted-foreground flex-1">{c.desc}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── 탭 2: 지지 합·충 ──────────────────────────────
function BranchTab() {
  return (
    <div className="space-y-6">
      {/* 육합 */}
      <Card className="glass-panel border-violet-400/20">
        <CardHeader className="pb-3 border-b border-violet-400/10">
          <SectionTitle icon="🔗" title="지지 육합 (六合)" sub="두 지지가 짝을 이뤄 합하는 관계" />
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {BRANCH_SIX_COMBINATIONS.map((c) => (
              <div key={c.branches.join("+")} className="flex items-center gap-2 p-2.5 rounded-xl bg-white/3 border border-white/5">
                <BranchPill b={c.branches[0]} />
                <span className="text-muted-foreground text-xs">+</span>
                <BranchPill b={c.branches[1]} />
                <span className="text-muted-foreground text-xs">→</span>
                <ElemBadge elem={c.element} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 삼합 */}
      <Card className="glass-panel border-emerald-400/20">
        <CardHeader className="pb-3 border-b border-emerald-400/10">
          <SectionTitle icon="△" title="지지 삼합 (三合)" sub="같은 오행 세 지지의 강한 조화" />
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid gap-2">
            {BRANCH_TRIPLE_COMBINATIONS.map((c) => (
              <div key={c.branches.join("")} className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                <div className="flex items-center gap-1 flex-wrap">
                  {c.branches.map((b, i) => (
                    <span key={b}>
                      <BranchPill b={b} />
                      {i < 2 && <span className="text-muted-foreground text-xs mx-0.5">·</span>}
                    </span>
                  ))}
                </div>
                <span className="text-muted-foreground text-xs">→</span>
                <ElemBadge elem={c.element} />
                <span className="text-xs text-muted-foreground hidden sm:block">{c.desc}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 방합 */}
      <Card className="glass-panel border-blue-400/20">
        <CardHeader className="pb-3 border-b border-blue-400/10">
          <SectionTitle icon="🧭" title="지지 방합 (方合)" sub="방위별 계절 기운의 집결" />
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid gap-2">
            {BRANCH_DIRECTIONAL.map((c) => (
              <div key={c.direction} className="flex items-start gap-3 p-3 rounded-xl bg-blue-500/5 border border-blue-500/10">
                <div className="flex items-center gap-1 flex-wrap min-w-fit">
                  {c.branches.map((b, i) => (
                    <span key={b}>
                      <BranchPill b={b} />
                      {i < 2 && <span className="text-muted-foreground text-xs mx-0.5">·</span>}
                    </span>
                  ))}
                </div>
                <span className="text-muted-foreground text-xs">→</span>
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-xs font-medium text-foreground/80">{c.direction}</span>
                    <ElemBadge elem={c.element} />
                  </div>
                  <p className="text-xs text-muted-foreground">{c.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 지지충 */}
      <Card className="glass-panel border-red-500/20">
        <CardHeader className="pb-3 border-b border-red-500/10">
          <SectionTitle icon="⚡" title="지지 충 (地支沖)" sub="서로 대립하여 충돌하는 지지" />
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {BRANCH_CLASHES.map((c) => (
              <div key={c.branches.join("-")} className="p-3 rounded-xl bg-red-500/5 border border-red-500/10">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <BranchPill b={c.branches[0]} />
                  <span className="text-red-400">↔</span>
                  <BranchPill b={c.branches[1]} />
                  <span className="text-xs text-red-400/70 ml-1">{c.elements}</span>
                </div>
                <p className="text-xs text-muted-foreground">{c.desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── 탭 3: 형살 ────────────────────────────────────
function HyeongTab() {
  return (
    <div className="space-y-4">
      <Card className="glass-panel border-orange-400/20">
        <CardHeader className="pb-3 border-b border-orange-400/10">
          <SectionTitle icon="⚔️" title="형살 (刑殺)" sub="지지 간 충돌·분쟁·수술·법적 문제" />
        </CardHeader>
        <CardContent className="pt-4">
          <div className="space-y-3">
            {HYEONG_SAL.map((h, idx) => (
              <div key={idx} className="p-3 rounded-xl bg-orange-500/5 border border-orange-500/10">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className={cn(
                    "text-[11px] font-medium px-2 py-0.5 rounded border",
                    h.type === "삼형살" ? "bg-red-500/15 border-red-500/30 text-red-300" :
                    h.type === "상형" ? "bg-orange-500/15 border-orange-500/30 text-orange-300" :
                    "bg-yellow-500/15 border-yellow-500/30 text-yellow-300"
                  )}>{h.type}</span>
                  {h.branches.map((b) => <BranchPill key={b} b={b} />)}
                  <span className="text-xs font-medium text-foreground/80">{h.name}</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{h.desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── 탭 4: 신살 조견표 ─────────────────────────────
function SinsalTab() {
  return (
    <div className="space-y-6">
      {/* 천을귀인 */}
      <Card className="glass-panel border-amber-400/30">
        <CardHeader className="pb-3 border-b border-amber-400/15">
          <SectionTitle icon="👑" title="천을귀인 (天乙貴人)" sub="일간(日干) 기준 — 귀인의 도움·행운·위기 해결" />
        </CardHeader>
        <CardContent className="pt-4">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-2 pr-4 text-muted-foreground font-medium">일간</th>
                  <th className="text-left py-2 text-muted-foreground font-medium">천을귀인 지지</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(CHEONEUR_GWIIN).map(([stem, branches]) => (
                  <tr key={stem} className="border-b border-white/5 hover:bg-white/2">
                    <td className="py-2 pr-4">
                      <StemPill s={stem} />
                    </td>
                    <td className="py-2">
                      <div className="flex gap-1.5 flex-wrap">
                        {branches.map((b) => <BranchPill key={b} b={b} />)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 문창귀인 */}
      <Card className="glass-panel border-blue-400/20">
        <CardHeader className="pb-3 border-b border-blue-400/10">
          <SectionTitle icon="📚" title="문창귀인 (文昌貴人)" sub="일간(日干) 기준 — 학문·지식·총명함·시험운" />
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {STEMS.map((s) => (
              <div key={s} className="flex items-center gap-2 p-2 rounded-lg bg-blue-500/5 border border-blue-500/10">
                <StemPill s={s} />
                <span className="text-muted-foreground text-xs">→</span>
                <BranchPill b={MUNCHANG_GWIIN[s] ?? "-"} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 양인살 */}
      <Card className="glass-panel border-red-400/20">
        <CardHeader className="pb-3 border-b border-red-400/10">
          <SectionTitle icon="⚔️" title="양인살 (羊刃殺)" sub="양간(陽干) 일간 기준 — 칼, 수술, 강한 기운 (음간은 해당 없음)" />
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {(["갑","병","무","경","임"] as const).map((s) => (
              <div key={s} className="flex items-center gap-2 p-2 rounded-lg bg-red-500/5 border border-red-500/10">
                <StemPill s={s} />
                <span className="text-muted-foreground text-xs">→</span>
                <BranchPill b={YANGINSSAL[s] ?? "-"} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 역마·도화·화개 */}
      <Card className="glass-panel border-primary/20">
        <CardHeader className="pb-3 border-b border-primary/10">
          <SectionTitle icon="🌸" title="역마살·도화살·화개살" sub="일지(또는 연지) 기준 — 삼합 그룹으로 판단" />
        </CardHeader>
        <CardContent className="pt-4">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-2 pr-3 text-muted-foreground font-medium">지지</th>
                  <th className="text-left py-2 pr-3 text-muted-foreground font-medium">역마살 🐎</th>
                  <th className="text-left py-2 pr-3 text-muted-foreground font-medium">도화살 🌸</th>
                  <th className="text-left py-2 text-muted-foreground font-medium">화개살 🎪</th>
                </tr>
              </thead>
              <tbody>
                {BRANCHES.map((b) => (
                  <tr key={b} className="border-b border-white/5 hover:bg-white/2">
                    <td className="py-1.5 pr-3"><BranchPill b={b} /></td>
                    <td className="py-1.5 pr-3">
                      {YEOKMA_SAL[b] ? <BranchPill b={YEOKMA_SAL[b]} /> : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="py-1.5 pr-3">
                      {DOHWA_SAL[b] ? <BranchPill b={DOHWA_SAL[b]} /> : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="py-1.5">
                      {HWAGAE_SAL[b] ? <BranchPill b={HWAGAE_SAL[b]} /> : <span className="text-muted-foreground">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-muted-foreground">
            <div className="p-2 rounded-lg bg-white/3 border border-white/5">
              <span className="text-foreground/70 font-medium">🐎 역마살</span><br />
              이동·여행·변동 多. 외국 인연, 분주한 삶
            </div>
            <div className="p-2 rounded-lg bg-white/3 border border-white/5">
              <span className="text-foreground/70 font-medium">🌸 도화살</span><br />
              이성 인기, 매력 넘침. 지나치면 색정 문제
            </div>
            <div className="p-2 rounded-lg bg-white/3 border border-white/5">
              <span className="text-foreground/70 font-medium">🎪 화개살</span><br />
              종교·예술 인연. 고독, 철학적 기질
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 귀문살 */}
      <Card className="glass-panel border-purple-400/20">
        <CardHeader className="pb-3 border-b border-purple-400/10">
          <SectionTitle icon="👻" title="귀문살 (鬼門殺)" sub="사주에 해당 지지 쌍이 있을 때 작용 — 영감·신경과민·집착" />
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {GWIMUN_SAL.map((g) => (
              <div key={g.branches.join("-")} className="p-3 rounded-xl bg-purple-500/5 border border-purple-500/10">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <BranchPill b={g.branches[0]} />
                  <span className="text-purple-400 text-sm">⇌</span>
                  <BranchPill b={g.branches[1]} />
                </div>
                <p className="text-xs text-muted-foreground">{g.desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── 탭 5: 삼재 ────────────────────────────────────
function SamjaeTab() {
  return (
    <div className="space-y-4">
      <Card className="glass-panel border-primary/20">
        <CardHeader className="pb-3 border-b border-primary/10">
          <SectionTitle icon="🛡️" title="삼재 조견표 (三災)" sub="3년 주기 — 들삼재·눌삼재·날삼재 순서로 진행" />
        </CardHeader>
        <CardContent className="pt-4">
          <div className="space-y-4">
            {SAMJAE_GROUPS.map((g) => (
              <div key={g.direction} className="p-4 rounded-xl bg-white/3 border border-white/8">
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <span className="text-xs font-semibold text-primary/80 bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full">
                    {g.direction}
                  </span>
                  <span className="text-xs text-muted-foreground">내 띠 지지</span>
                  {g.myBranches.map((b) => <BranchPill key={b} b={b} />)}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-muted-foreground">삼재 해당년</span>
                  {g.samjaeBranches.map((b, i) => (
                    <span key={b} className="flex items-center gap-1">
                      <span className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded border font-medium",
                        i === 0 ? "bg-yellow-500/15 border-yellow-500/25 text-yellow-300" :
                        i === 1 ? "bg-red-500/15 border-red-500/25 text-red-300" :
                        "bg-emerald-500/15 border-emerald-500/25 text-emerald-300"
                      )}>
                        {i === 0 ? "들삼재" : i === 1 ? "눌삼재" : "날삼재"}
                      </span>
                      <BranchPill b={b} />
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
            {[
              { label: "들삼재 (入)", color: "yellow", desc: "삼재 시작. 갑작스러운 변화와 새로운 어려움" },
              { label: "눌삼재 (滯)", color: "red", desc: "가장 힘든 시기. 사고·손실·질병 주의" },
              { label: "날삼재 (出)", color: "emerald", desc: "삼재 해소. 점차 안정되며 새 출발 준비" },
            ].map((s) => (
              <div key={s.label} className={cn(
                "p-2.5 rounded-lg border",
                s.color === "yellow" ? "bg-yellow-500/8 border-yellow-500/15" :
                s.color === "red" ? "bg-red-500/8 border-red-500/15" :
                "bg-emerald-500/8 border-emerald-500/15"
              )}>
                <div className={cn(
                  "font-semibold mb-1",
                  s.color === "yellow" ? "text-yellow-300" :
                  s.color === "red" ? "text-red-300" : "text-emerald-300"
                )}>{s.label}</div>
                <p className="text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── 탭 6: 장간 ────────────────────────────────────
function JangGanTab() {
  const ELEM_DOT: Record<string, string> = {
    목: "bg-green-400", 화: "bg-red-400",
    토: "bg-yellow-400", 금: "bg-gray-300", 수: "bg-blue-400",
  };
  return (
    <div className="space-y-4">
      <Card className="glass-panel border-primary/20">
        <CardHeader className="pb-3 border-b border-primary/10">
          <SectionTitle icon="🔬" title="지지 장간 (地支藏干)" sub="지지 속에 숨겨진 천간 — 정기(正氣)·중기(中氣)·여기(餘氣)" />
        </CardHeader>
        <CardContent className="pt-4">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-2 pr-4 text-muted-foreground font-medium">지지</th>
                  <th className="text-left py-2 pr-4 text-muted-foreground font-medium">정기 (주기)</th>
                  <th className="text-left py-2 pr-4 text-muted-foreground font-medium">중기</th>
                  <th className="text-left py-2 text-muted-foreground font-medium">여기</th>
                </tr>
              </thead>
              <tbody>
                {JANG_GAN.map((jg) => (
                  <tr key={jg.branch} className="border-b border-white/5 hover:bg-white/2">
                    <td className="py-2 pr-4">
                      <div className="flex items-center gap-1.5">
                        <span className={cn("w-2 h-2 rounded-full", ELEM_DOT[jg.element] ?? "bg-white/20")} />
                        <span className="text-muted-foreground">{jg.hanja}</span>
                        <span className="font-medium">{jg.branch}</span>
                      </div>
                    </td>
                    <td className="py-2 pr-4">
                      <StemPill s={jg.junggi} />
                    </td>
                    <td className="py-2 pr-4">
                      {jg.junki ? <StemPill s={jg.junki} /> : <span className="text-white/20">—</span>}
                    </td>
                    <td className="py-2">
                      {jg.yeoki ? <StemPill s={jg.yeoki} /> : <span className="text-white/20">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-[11px] text-muted-foreground/60 border-t border-white/5 pt-3">
            * 장간은 지지의 외부 속성 외에 숨겨진 내면의 기운을 나타냅니다. 십신 분석, 용신 파악, 세밀한 운세 해석에 활용됩니다.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// ── 메인 컴포넌트 ──────────────────────────────────
export default function SajuTablesPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("stem");

  const tabContent: Record<TabKey, React.ReactNode> = {
    stem:    <StemTab />,
    branch:  <BranchTab />,
    hyeong:  <HyeongTab />,
    sinsal:  <SinsalTab />,
    samjae:  <SamjaeTab />,
    janggan: <JangGanTab />,
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* 헤더 */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400/30 to-violet-500/30 border border-amber-400/20 flex items-center justify-center text-xl">
            📊
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-amber-300 via-violet-300 to-blue-300 bg-clip-text text-transparent">
              사주 이론 조견표
            </h1>
            <p className="text-sm text-muted-foreground">천간·지지 합충형·신살·삼재·장간 한눈에 보기</p>
          </div>
        </div>
      </motion.div>

      {/* 탭 */}
      <div className="flex gap-1.5 flex-wrap">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
              activeTab === t.key
                ? "bg-primary/20 border border-primary/40 text-primary shadow-sm shadow-primary/10"
                : "bg-white/5 border border-white/10 text-muted-foreground hover:bg-white/8 hover:text-foreground"
            )}
          >
            <span>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* 탭 콘텐츠 */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        {tabContent[activeTab]}
      </motion.div>

      <p className="text-[11px] text-muted-foreground/40 text-center pt-2">
        * 본 조견표는 명리학 이론을 참고용으로 정리한 자료입니다. 전체 사주팔자와 종합하여 해석하세요.
      </p>
    </div>
  );
}
