import { useEffect, useMemo, useState } from "react";
import { HeartHandshake, Loader2, Sparkles } from "lucide-react";
import { Link, useRoute } from "wouter";

import { SharedSajuView } from "@/components/SharedSajuView";
import { createBirthProfileSearchParams } from "@/lib/birth-profile-query";
import { fetchPublicShare, type PublicSharePayload } from "@/lib/share-snapshot";

function buildGungapHref(payload: PublicSharePayload) {
  const birth = payload.birthInfo;
  const year = Number(birth?.year);
  const month = Number(birth?.month);
  const day = Number(birth?.day);
  if (!birth || !year || !month || !day) return null;

  const params = createBirthProfileSearchParams(
    {
      year,
      month,
      day,
      hour: Number.isFinite(Number(birth.hour)) ? Number(birth.hour) : -1,
      gender: typeof birth.gender === "string" ? birth.gender : undefined,
      calendarType: typeof birth.calendarType === "string" ? birth.calendarType : undefined,
    },
    payload.name,
  );
  return `/gungap?${params.toString()}`;
}

export default function SharedSajuPage() {
  const [, params] = useRoute("/share/:token");
  const [payload, setPayload] = useState<PublicSharePayload | null>(null);
  const [error, setError] = useState("");
  const gungapHref = useMemo(() => (payload ? buildGungapHref(payload) : null), [payload]);

  useEffect(() => {
    if (!params?.token) return;
    fetchPublicShare(params.token)
      .then((response) => setPayload(response.payload))
      .catch(() => setError("만료되었거나 삭제된 공유 링크입니다."));
  }, [params?.token]);

  useEffect(() => {
    const robots = document.createElement("meta");
    robots.name = "robots";
    robots.content = "noindex,nofollow";
    document.head.appendChild(robots);
    return () => robots.remove();
  }, []);

  return (
    <main className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-5">
        {error ? (
          <>
            <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 px-5 py-4 text-sm text-rose-700">{error}</div>
            <Link
              href="/saju"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-colors hover:bg-primary/90"
            >
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              내 사주 무료로 보기
            </Link>
          </>
        ) : payload ? (
          <>
            <SharedSajuView payload={payload} />
            <section
              aria-labelledby="share-cta-title"
              className="w-full max-w-2xl rounded-3xl border border-primary/20 bg-primary/5 p-5 text-center"
            >
              <h2 id="share-cta-title" className="font-serif text-lg font-bold text-foreground">
                {payload.name ? `${payload.name}님의 사주가 궁금하셨나요?` : "나의 사주 흐름도 확인해 보세요"}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground break-keep">
                생년월일만 입력하면 사주 핵심 분석을 무료로 볼 수 있습니다.
                {gungapHref ? " 이 사주와의 궁합도 바로 확인할 수 있어요." : ""}
              </p>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
                <Link
                  href="/saju"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-colors hover:bg-primary/90"
                >
                  <Sparkles className="h-4 w-4" aria-hidden="true" />
                  나도 사주 보기
                </Link>
                {gungapHref ? (
                  <Link
                    href={gungapHref}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-rose-400/40 bg-background px-5 text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-500/10"
                  >
                    <HeartHandshake className="h-4 w-4" aria-hidden="true" />
                    이 사주와 궁합 보기
                  </Link>
                ) : (
                  <Link
                    href="/gungap"
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-rose-400/40 bg-background px-5 text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-500/10"
                  >
                    <HeartHandshake className="h-4 w-4" aria-hidden="true" />
                    궁합 보러 가기
                  </Link>
                )}
              </div>
              {!gungapHref && (
                <p className="mt-3 text-xs text-muted-foreground">
                  공유자가 생년월일을 공개하지 않아 상대 정보는 직접 입력해야 합니다.
                </p>
              )}
            </section>
          </>
        ) : (
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />공유 결과 불러오는 중</div>
        )}
      </div>
    </main>
  );
}
