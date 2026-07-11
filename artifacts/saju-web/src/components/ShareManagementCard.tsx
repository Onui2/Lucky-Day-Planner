import { useEffect, useState } from "react";
import { Link2, Loader2, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  deleteShareSnapshot,
  listShareSnapshots,
  type ShareSnapshotSummary,
} from "@/lib/share-snapshot";

function statusOf(share: ShareSnapshotSummary) {
  if (share.deletedAt) return { label: "삭제됨", className: "text-muted-foreground" };
  if (new Date(share.expiresAt) <= new Date()) return { label: "만료됨", className: "text-amber-700" };
  return { label: "공유 중", className: "text-emerald-700" };
}

export function ShareManagementCard() {
  const [shares, setShares] = useState<ShareSnapshotSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void listShareSnapshots()
      .then(({ shares: next }) => { if (!cancelled) setShares(next); })
      .catch(() => { if (!cancelled) setError("공유 내역을 불러오지 못했습니다."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  async function handleDelete(id: number) {
    if (!window.confirm("이 공유 링크를 삭제할까요? 삭제 즉시 상대방도 열 수 없습니다.")) return;
    setDeletingId(id);
    setError("");
    try {
      await deleteShareSnapshot(id);
      setShares((current) => current.map((share) => share.id === id
        ? { ...share, deletedAt: new Date().toISOString() }
        : share));
    } catch {
      setError("공유 링크 삭제에 실패했습니다.");
    } finally {
      setDeletingId(null);
    }
  }

  const visibleShares = shares.slice(0, 10);
  return (
    <div className="glass-panel rounded-2xl border border-primary/15 p-5 mb-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg font-serif text-primary">공유 링크 관리</h2>
          <p className="text-xs text-muted-foreground mt-1">링크는 생성 후 30일간 유지되며 언제든 즉시 삭제할 수 있습니다.</p>
        </div>
        <Link2 className="w-5 h-5 text-primary/70 shrink-0" />
      </div>
      {loading ? (
        <div className="flex justify-center py-5"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
      ) : visibleShares.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-foreground/10 bg-foreground/5 p-4 text-sm text-muted-foreground">
          아직 만든 공유 링크가 없습니다.
        </div>
      ) : (
        <div className="space-y-2">
          {visibleShares.map((share) => {
            const status = statusOf(share);
            const active = status.label === "공유 중";
            return (
              <div key={share.id} className="flex items-center justify-between gap-3 rounded-xl border border-foreground/10 bg-foreground/5 px-4 py-3">
                <div className="min-w-0 text-xs text-muted-foreground">
                  <p><span className={`font-medium ${status.className}`}>{status.label}</span> · {new Date(share.createdAt).toLocaleDateString("ko-KR")} 생성</p>
                  {active && <p className="mt-1">{new Date(share.expiresAt).toLocaleDateString("ko-KR")} 만료</p>}
                </div>
                {active && (
                  <Button variant="outline" size="sm" onClick={() => void handleDelete(share.id)} disabled={deletingId === share.id} className="shrink-0 gap-1 text-destructive">
                    {deletingId === share.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    삭제
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
      {shares.length > 10 && <p className="mt-3 text-center text-xs text-muted-foreground">최근 10개만 표시됩니다.</p>}
      {error && <p className="mt-3 text-xs text-destructive">{error}</p>}
    </div>
  );
}
