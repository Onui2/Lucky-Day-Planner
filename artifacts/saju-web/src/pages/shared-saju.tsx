import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useRoute } from "wouter";

import { SharedSajuView } from "@/components/SharedSajuView";
import { fetchPublicShare, type PublicSharePayload } from "@/lib/share-snapshot";

export default function SharedSajuPage() {
  const [, params] = useRoute("/share/:token");
  const [payload, setPayload] = useState<PublicSharePayload | null>(null);
  const [error, setError] = useState("");

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
      <div className="mx-auto flex max-w-3xl justify-center">
        {error ? (
          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 px-5 py-4 text-sm text-rose-700">{error}</div>
        ) : payload ? (
          <SharedSajuView payload={payload} />
        ) : (
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />공유 결과 불러오는 중</div>
        )}
      </div>
    </main>
  );
}
