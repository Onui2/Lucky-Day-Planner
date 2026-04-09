import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation, useQuery } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Sparkles, Star, AlertTriangle, Minus, TrendingUp, Loader2, Moon } from "lucide-react";

interface DreamKeyword {
  keyword: string;
  category: string;
  fortune: "great" | "good" | "neutral" | "bad" | "warning";
  meaning: string;
  detail: string;
  lucky?: string;
}

interface DreamSearchResult {
  matched: DreamKeyword[];
  partialMatched: DreamKeyword[];
  totalFound: number;
}

interface DreamMeta {
  popularKeywords: string[];
  categories: string[];
}

const FORTUNE_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: React.ElementType }> = {
  great:   { label: "대길 ★", color: "text-yellow-400", bg: "bg-yellow-400/10", border: "border-yellow-400/30", icon: Star },
  good:    { label: "길",      color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/30", icon: TrendingUp },
  neutral: { label: "중립",   color: "text-slate-400",   bg: "bg-slate-400/10",   border: "border-slate-400/30",   icon: Minus },
  bad:     { label: "흉",     color: "text-orange-400",  bg: "bg-orange-400/10",  border: "border-orange-400/30",  icon: AlertTriangle },
  warning: { label: "주의",   color: "text-red-400",     bg: "bg-red-400/10",     border: "border-red-400/30",     icon: AlertTriangle },
};

function DreamCard({ dream, highlight }: { dream: DreamKeyword; highlight?: boolean }) {
  const fc = FORTUNE_CONFIG[dream.fortune] ?? FORTUNE_CONFIG.neutral;
  const Icon = fc.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border p-5 ${fc.bg} ${fc.border} ${highlight ? "ring-2 ring-primary/30" : ""}`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-muted-foreground bg-white/5 px-2 py-0.5 rounded-full border border-white/10">{dream.category}</span>
            {highlight && <span className="text-xs text-primary/80 font-medium">정확 일치</span>}
          </div>
          <h3 className="text-xl font-serif font-bold text-foreground">{dream.keyword}</h3>
          <p className="text-sm font-medium text-muted-foreground mt-0.5">{dream.meaning}</p>
        </div>
        <div className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full border ${fc.bg} ${fc.border}`}>
          <Icon className={`w-3.5 h-3.5 ${fc.color}`} />
          <span className={`text-sm font-bold ${fc.color}`}>{fc.label}</span>
        </div>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">{dream.detail}</p>
      {dream.lucky && (
        <div className="mt-3 flex items-center gap-2 text-xs text-primary/70">
          <Sparkles className="w-3 h-3" />
          행운 정보: {dream.lucky}
        </div>
      )}
    </motion.div>
  );
}

export default function DreamPage() {
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: meta } = useQuery<DreamMeta>({
    queryKey: ["dream", "meta"],
    queryFn: () => customFetch<DreamMeta>("/api/dream/meta"),
    staleTime: Infinity,
  });

  const search = useMutation({
    mutationFn: (q: string) =>
      customFetch<DreamSearchResult>("/api/dream/search", { method: "POST", body: JSON.stringify({ query: q }) }),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setSubmitted(q);
    search.mutate(q);
  }

  function handleKeyword(kw: string) {
    setQuery(kw);
    setSubmitted(kw);
    search.mutate(kw);
    inputRef.current?.focus();
  }

  const hasResults = search.data && search.data.totalFound > 0;
  const noResults = search.isSuccess && search.data?.totalFound === 0;

  return (
    <div className="max-w-2xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-10"
      >
        <div className="w-16 h-16 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center mx-auto mb-5">
          <Moon className="w-8 h-8 text-primary" />
        </div>
        <h1 className="font-serif text-3xl font-bold text-gradient-gold mb-2">꿈 해몽 (夢解夢)</h1>
        <p className="text-muted-foreground text-sm">꿈에 나타난 것을 입력하면 풀이해 드립니다</p>
      </motion.div>

      {/* 검색창 */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-6"
      >
        <form onSubmit={handleSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              placeholder="예) 뱀, 돼지, 날다, 물에 빠지다…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="pl-10 bg-input/40 border-primary/20 text-base h-12 rounded-xl"
            />
          </div>
          <Button
            type="submit"
            className="h-12 px-6 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-medium"
            disabled={search.isPending || !query.trim()}
          >
            {search.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "해몽"}
          </Button>
        </form>
      </motion.div>

      {/* 인기 키워드 */}
      {!search.isSuccess && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <p className="text-xs text-muted-foreground mb-3 font-medium tracking-wide uppercase">인기 꿈 키워드</p>
          <div className="flex flex-wrap gap-2">
            {(meta?.popularKeywords ?? ["돼지","뱀","용","물고기","돈","황금","태양","아기","보석","말"]).map(kw => (
              <button
                key={kw}
                onClick={() => handleKeyword(kw)}
                className="px-3.5 py-1.5 rounded-full border border-primary/25 bg-primary/8 text-sm text-primary/80 hover:bg-primary/15 hover:text-primary transition-colors"
              >
                {kw}
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {/* 결과 */}
      <AnimatePresence mode="wait">
        {search.isPending && (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">꿈을 풀이하는 중…</p>
          </motion.div>
        )}

        {noResults && (
          <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="text-center py-16 glass-panel rounded-2xl border border-primary/15"
          >
            <Moon className="w-10 h-10 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-foreground font-medium mb-1">"{submitted}"에 대한 해몽을 찾지 못했습니다</p>
            <p className="text-sm text-muted-foreground">다른 키워드로 검색해보세요. (예: 동물, 자연 현상, 물건 등)</p>
          </motion.div>
        )}

        {hasResults && (
          <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm text-muted-foreground">
                <span className="text-primary font-semibold">"{submitted}"</span> 해몽 결과 {search.data!.totalFound}건
              </p>
              <button onClick={() => { search.reset(); setSubmitted(""); setQuery(""); }} className="text-xs text-muted-foreground hover:text-primary transition-colors">
                초기화
              </button>
            </div>

            {search.data!.matched.length > 0 && (
              <div className="space-y-3">
                {search.data!.matched.map(d => (
                  <DreamCard key={d.keyword} dream={d} highlight />
                ))}
              </div>
            )}

            {search.data!.partialMatched.length > 0 && (
              <>
                {search.data!.matched.length > 0 && (
                  <div className="flex items-center gap-3 my-4">
                    <div className="h-px flex-1 bg-primary/10" />
                    <p className="text-xs text-muted-foreground">관련 해몽</p>
                    <div className="h-px flex-1 bg-primary/10" />
                  </div>
                )}
                <div className="space-y-3">
                  {search.data!.partialMatched.map(d => (
                    <DreamCard key={d.keyword} dream={d} />
                  ))}
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 안내 */}
      {!search.isSuccess && !search.isPending && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-10 glass-panel rounded-2xl border border-primary/15 p-5"
        >
          <h3 className="font-serif text-base font-semibold text-foreground mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" /> 꿈 해몽 안내
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
            <div>
              <p className="font-medium text-foreground mb-1.5">검색 가능한 꿈</p>
              <ul className="space-y-1 text-xs">
                <li>• 동물 — 뱀, 돼지, 용, 호랑이…</li>
                <li>• 자연 — 비, 눈, 번개, 태양…</li>
                <li>• 사람 — 아기, 결혼, 조상…</li>
                <li>• 행동 — 날기, 쫓기기, 시험…</li>
                <li>• 물건 — 돈, 보석, 황금…</li>
              </ul>
            </div>
            <div>
              <p className="font-medium text-foreground mb-1.5">운세 등급</p>
              <ul className="space-y-1 text-xs">
                <li className="text-yellow-400">★ 대길 — 매우 좋은 꿈</li>
                <li className="text-emerald-400">↑ 길 — 좋은 꿈</li>
                <li className="text-slate-400">— 중립 — 평범한 꿈</li>
                <li className="text-orange-400">△ 흉 — 좋지 않은 꿈</li>
                <li className="text-red-400">⚠ 주의 — 경고의 꿈</li>
              </ul>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
