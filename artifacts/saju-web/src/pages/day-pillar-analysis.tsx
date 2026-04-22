import { useEffect, useMemo, useState } from "react";
import { useSearch } from "wouter";
import { motion } from "framer-motion";
import { BookOpen, Search, Sparkles, ChevronLeft, ChevronRight, Link2, CheckCheck } from "lucide-react";
import { useAuth } from "@workspace/replit-auth-web";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  DAY_PILLAR_ANALYSIS_ENTRIES,
  findDayPillarAnalysisByQuery,
  normalizeDayPillarQuery,
  searchDayPillarAnalyses,
} from "@/data/dayPillarAnalysis";
import { addRecentActivity } from "@/lib/member-insights";

const EXAMPLE_QUERIES = ["갑자", "계묘", "癸卯", "신유", "丁亥"];
const STEM_OPTIONS = ["전체", "갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"] as const;
const BRANCH_OPTIONS = ["전체", "자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"] as const;

export default function DayPillarAnalysisPage() {
  const rawSearch = useSearch();
  const initialQuery = new URLSearchParams(rawSearch).get("q") ?? "";
  const { user } = useAuth();

  const [query, setQuery] = useState(initialQuery);
  const [selectedKey, setSelectedKey] = useState<string | null>(
    findDayPillarAnalysisByQuery(initialQuery)?.key ?? DAY_PILLAR_ANALYSIS_ENTRIES[0]?.key ?? null,
  );
  const [copied, setCopied] = useState(false);
  const [stemFilter, setStemFilter] = useState<(typeof STEM_OPTIONS)[number]>("전체");
  const [branchFilter, setBranchFilter] = useState<(typeof BRANCH_OPTIONS)[number]>("전체");

  useEffect(() => {
    const nextQuery = new URLSearchParams(rawSearch).get("q") ?? "";
    setQuery(nextQuery);
    setSelectedKey(
      findDayPillarAnalysisByQuery(nextQuery)?.key ?? DAY_PILLAR_ANALYSIS_ENTRIES[0]?.key ?? null,
    );
  }, [rawSearch]);

  const entries = useMemo(() => {
    const searched = searchDayPillarAnalyses(query);
    return searched.filter((entry) => {
      const matchStem = stemFilter === "전체" || entry.stem === stemFilter;
      const matchBranch = branchFilter === "전체" || entry.branch === branchFilter;
      return matchStem && matchBranch;
    });
  }, [branchFilter, query, stemFilter]);

  useEffect(() => {
    if (entries.length === 0) {
      if (selectedKey !== null) setSelectedKey(null);
      return;
    }

    if (selectedKey && entries.some((entry) => entry.key === selectedKey)) return;

    const nextKey =
      findDayPillarAnalysisByQuery(query)?.key
      ?? entries[0]?.key
      ?? null;

    if (nextKey !== selectedKey) {
      setSelectedKey(nextKey);
    }
  }, [entries, query, selectedKey]);

  const selected = useMemo(
    () => DAY_PILLAR_ANALYSIS_ENTRIES.find((entry) => entry.key === selectedKey) ?? null,
    [selectedKey],
  );
  const selectedIndex = useMemo(
    () => DAY_PILLAR_ANALYSIS_ENTRIES.findIndex((entry) => entry.key === selectedKey),
    [selectedKey],
  );
  const prevEntry = selectedIndex > 0 ? DAY_PILLAR_ANALYSIS_ENTRIES[selectedIndex - 1] : null;
  const nextEntry =
    selectedIndex >= 0 && selectedIndex < DAY_PILLAR_ANALYSIS_ENTRIES.length - 1
      ? DAY_PILLAR_ANALYSIS_ENTRIES[selectedIndex + 1]
      : null;

  const normalizedQuery = normalizeDayPillarQuery(query);
  const showingAll = normalizedQuery.length === 0;

  useEffect(() => {
    if (typeof window === "undefined") return;

    const url = new URL(window.location.href);

    if (query.trim()) {
      url.searchParams.set("q", query.trim());
    } else {
      url.searchParams.delete("q");
    }

    window.history.replaceState({}, "", `${url.pathname}${url.search}`);
  }, [query]);

  useEffect(() => {
    if (!user?.id || !selected) return;

    void addRecentActivity(user.id, {
      id: `day-pillar:${selected.key}`,
      kind: "day-pillar",
      title: `${selected.key} 일주 분석`,
      subtitle: selected.hanja,
      href: `/day-pillar-analysis?q=${encodeURIComponent(selected.key)}`,
      createdAt: new Date().toISOString(),
    });
  }, [selected, user?.id]);

  function jumpToEntry(nextKey: string) {
    setSelectedKey(nextKey);
    setQuery(nextKey);
  }

  async function copyCurrentLink() {
    if (typeof window === "undefined" || !selected) return;

    const url = new URL(window.location.href);
    url.searchParams.set("q", selected.key);
    await navigator.clipboard.writeText(url.toString());
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-2"
      >
        <div className="flex items-center justify-center gap-2 text-primary/70 text-sm font-medium mb-1">
          <BookOpen className="w-4 h-4" />
          <span>관리자 전용 일주 검색</span>
        </div>
        <h1 className="text-3xl font-serif font-bold bg-gradient-to-r from-primary via-amber-300 to-primary bg-clip-text text-transparent">
          일주 분석 검색
        </h1>
        <p className="text-muted-foreground text-sm">
          60갑자 일주를 `계묘` 또는 `癸卯` 형태로 바로 찾아볼 수 있습니다
        </p>
      </motion.div>

      <Card className="glass-panel border-primary/20">
        <CardContent className="pt-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="계묘, 癸卯, 갑자, 甲子 ..."
              className="pl-9"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1">
              <span className="text-[11px] text-muted-foreground">천간 필터</span>
              <select
                value={stemFilter}
                onChange={(e) => setStemFilter(e.target.value as (typeof STEM_OPTIONS)[number])}
                className="w-full rounded-xl border border-white/15 bg-white/8 px-3 py-2 text-sm outline-none focus:border-primary/50"
              >
                {STEM_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-[11px] text-muted-foreground">지지 필터</span>
              <select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value as (typeof BRANCH_OPTIONS)[number])}
                className="w-full rounded-xl border border-white/15 bg-white/8 px-3 py-2 text-sm outline-none focus:border-primary/50"
              >
                {BRANCH_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="flex flex-wrap gap-2">
            {EXAMPLE_QUERIES.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => setQuery(example)}
                className="px-3 py-1.5 rounded-full text-xs border border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 transition-colors"
              >
                {example}
              </button>
            ))}
          </div>

          <div className="text-xs text-muted-foreground">
            {showingAll
              ? `전체 ${DAY_PILLAR_ANALYSIS_ENTRIES.length}개 일주를 둘러보는 중`
              : `검색 결과 ${entries.length}건`}
          </div>

          {entries.length > 0 ? (
            <div className="max-h-72 overflow-y-auto rounded-2xl border border-primary/10 bg-background/20 p-3">
              <div className="flex flex-wrap gap-2">
                {entries.map((entry) => {
                  const active = entry.key === selectedKey;
                  return (
                    <button
                      key={entry.key}
                      type="button"
                      onClick={() => setSelectedKey(entry.key)}
                      className={cn(
                        "px-3 py-2 rounded-xl border text-left transition-colors",
                        active
                          ? "border-primary/40 bg-primary/15 text-primary"
                          : "border-white/10 bg-white/5 text-foreground/80 hover:bg-primary/8 hover:text-primary",
                      )}
                    >
                      <div className="text-sm font-medium">{entry.key}</div>
                      <div className="text-[11px] text-muted-foreground">{entry.hanja}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-amber-400/20 bg-amber-400/5 px-4 py-5 text-sm text-muted-foreground">
              검색 결과 없음. `계묘` 또는 `癸卯` 형식으로 다시 찾으면 됨.
            </div>
          )}
        </CardContent>
      </Card>

      {selected && (
        <motion.div
          key={selected.key}
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
        >
            <Card className="glass-panel border-amber-400/30">
            <CardHeader className="pb-3 border-b border-amber-400/15">
              <CardTitle className="flex flex-wrap items-center gap-2 text-amber-300">
                <span className="text-2xl font-serif">{selected.hanja}</span>
                <span className="text-lg font-medium">{selected.title} 분석</span>
                <span className="ml-auto text-xs font-normal text-muted-foreground bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-full">
                  60갑자 검색
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => prevEntry && jumpToEntry(prevEntry.key)}
                    disabled={!prevEntry}
                    className="gap-1.5"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    이전 일주
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => nextEntry && jumpToEntry(nextEntry.key)}
                    disabled={!nextEntry}
                    className="gap-1.5"
                  >
                    다음 일주
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void copyCurrentLink()}
                  className="gap-1.5"
                >
                  {copied ? (
                    <>
                      <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                      링크 복사됨
                    </>
                  ) : (
                    <>
                      <Link2 className="w-3.5 h-3.5" />
                      링크 복사
                    </>
                  )}
                </Button>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="px-2.5 py-1 rounded-full border border-primary/20 bg-primary/5 text-primary">
                  한글 {selected.key}
                </span>
                <span className="px-2.5 py-1 rounded-full border border-primary/20 bg-primary/5 text-primary">
                  한자 {selected.hanja}
                </span>
              </div>

              <div className="text-sm text-foreground/85 leading-relaxed whitespace-pre-line">
                {selected.text}
              </div>

              <div className="rounded-xl border border-primary/10 bg-primary/5 px-4 py-3 text-[11px] text-muted-foreground">
                <div className="flex items-center gap-2 text-primary mb-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span className="font-medium">해석 메모</span>
                </div>
                일주 해석은 참고 자료.
                전체 사주팔자와 대운, 세운 같이 봐야 정확함.
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
