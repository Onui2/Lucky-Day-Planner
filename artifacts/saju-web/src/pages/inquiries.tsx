import { useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@workspace/replit-auth-web";
import {
  useGetMyInquiries,
  useMarkInquiryReadByUser,
  type Inquiry,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import {
  MessageSquare, Clock, CheckCircle2, ChevronLeft, ChevronRight,
  Loader2, LogIn, MessageCircleQuestion, Sparkles, Calendar,
  Heart, FileQuestion,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocation, Link } from "wouter";

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("ko-KR", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}

function StatusBadge({ status }: { status: string }) {
  return status === "answered" ? (
    <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
      <CheckCircle2 className="w-3 h-3" /> 답변완료
    </span>
  ) : (
    <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
      <Clock className="w-3 h-3" /> 답변대기
    </span>
  );
}

function InquiryTypeBadge({ type }: { type?: string | null }) {
  if (type === "saju") return (
    <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30">
      <Sparkles className="w-3 h-3" /> 사주
    </span>
  );
  if (type === "gungap") return (
    <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30">
      <Heart className="w-3 h-3" /> 궁합
    </span>
  );
  return (
    <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-400 border border-sky-500/30">
      <FileQuestion className="w-3 h-3" /> 일반
    </span>
  );
}

function SnapshotPreview({ snap, inline = false }: { snap: Inquiry["sajuSnapshot"]; inline?: boolean }) {
  if (!snap) return null;

  if (snap.birthYear) {
    return (
      <p className={cn("text-xs text-muted-foreground", inline ? "mt-1.5" : "")}>
        📅 {snap.birthYear}년 {snap.birthMonth}월 {snap.birthDay}일{" "}
        {snap.gender === "male" ? "남성" : "여성"}
        {snap.dayPillarStem ? ` · 일간 ${snap.dayPillarStem}` : ""}
      </p>
    );
  }

  return null;
}

function InquiryItem({ inquiry, onRead }: { inquiry: Inquiry; onRead: (id: number) => void }) {
  const [expanded, setExpanded] = useState(false);
  const hasUnreadReply = inquiry.adminReply && !inquiry.readByUser;

  const handleExpand = () => {
    setExpanded((v) => !v);
    if (hasUnreadReply) onRead(inquiry.id);
  };

  const snap = inquiry.sajuSnapshot as Record<string, unknown> | null | undefined;
  const hasSajuLink = !!(snap && snap.birthYear && inquiry.inquiryType === "saju");

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "glass-panel border rounded-2xl overflow-hidden transition-all",
        hasUnreadReply
          ? "border-emerald-500/40 bg-emerald-500/5"
          : "border-primary/20"
      )}
    >
      {/* 헤더 (항상 보임) */}
      <button
        className="w-full text-left p-5 flex items-start justify-between gap-4 hover:bg-primary/5 transition-colors"
        onClick={handleExpand}
      >
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <StatusBadge status={inquiry.status} />
            <InquiryTypeBadge type={inquiry.inquiryType} />
            {hasUnreadReply && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold">
                새 답변
              </span>
            )}
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="w-3 h-3" />
              {formatDate(inquiry.createdAt)}
            </div>
          </div>
          <p className="text-sm text-foreground/85 line-clamp-2 leading-relaxed">
            {inquiry.message}
          </p>
          <SnapshotPreview snap={inquiry.sajuSnapshot} inline />
        </div>
        <div className="shrink-0 text-muted-foreground">
          {expanded ? "▲" : "▼"}
        </div>
      </button>

      {/* 펼쳐진 내용 */}
      {expanded && (
        <div className="px-5 pb-5 space-y-4 border-t border-primary/10 pt-4">
          {/* 전체 문의 내용 */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">문의 내용</p>
            <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">{inquiry.message}</p>
          </div>

          {/* 스냅샷 정보 */}
          {inquiry.sajuSnapshot && (() => {
            const sj = inquiry.sajuSnapshot!;
            return (
              <div className="p-3 rounded-xl border border-primary/10 bg-primary/5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">첨부된 정보</p>
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-foreground/70">
                  <span>📅 {sj.birthYear}년 {sj.birthMonth}월 {sj.birthDay}일</span>
                  <span>{sj.gender === "male" ? "♂ 남성" : "♀ 여성"}</span>
                  {sj.dayPillarStem && <span>일간: {sj.dayPillarStem}</span>}
                </div>
                {hasSajuLink && (
                  <Link
                    href={`/saju?y=${sj.birthYear}&m=${sj.birthMonth}&d=${sj.birthDay}&g=${sj.gender}&c=${sj.calendarType}`}
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-2"
                  >
                    <Sparkles className="w-3 h-3" /> 사주 분석 다시 보기
                  </Link>
                )}
              </div>
            );
          })()}

          {/* 관리자 답변 */}
          {inquiry.adminReply ? (
            <div className="p-4 rounded-xl border border-emerald-500/25 bg-emerald-500/8">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <p className="text-xs font-semibold text-emerald-400">
                  관리자 답변{inquiry.repliedAt ? ` · ${formatDate(inquiry.repliedAt)}` : ""}
                </p>
              </div>
              <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">{inquiry.adminReply}</p>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
              <Clock className="w-4 h-4" />
              <span>관리자가 검토 중입니다. 조금만 기다려 주세요.</span>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

export default function InquiriesPage() {
  const { isAuthenticated, isLoading, login } = useAuth();
  const [page, setPage] = useState(1);
  const [, navigate] = useLocation();

  const { data, isLoading: listLoading } = useGetMyInquiries(page, isAuthenticated);
  const markReadMut = useMarkInquiryReadByUser();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="max-w-sm mx-auto text-center py-20">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
          <LogIn className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-xl font-semibold mb-2">로그인이 필요합니다</h2>
        <p className="text-muted-foreground mb-6">내 문의 내역을 보려면 로그인해 주세요.</p>
        <Button onClick={login} className="gap-2">
          <LogIn className="w-4 h-4" /> 로그인
        </Button>
      </div>
    );
  }

  const totalPages = data ? Math.ceil(data.total / data.limit) : 1;

  return (
    <div className="max-w-3xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
              <MessageCircleQuestion className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-serif text-primary">내 문의</h1>
              <p className="text-sm text-muted-foreground">상담 문의 내역</p>
            </div>
          </div>
          <Button
            variant="outline" size="sm"
            onClick={() => navigate("/")}
            className="gap-2 text-sm border-violet-500/40 text-violet-300 hover:bg-violet-500/10"
          >
            <MessageSquare className="w-4 h-4" />
            새 문의
          </Button>
        </div>

        {/* 목록 */}
        {listLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-7 h-7 animate-spin text-primary" />
          </div>
        ) : !data?.inquiries?.length ? (
          <div className="text-center py-20">
            <MessageCircleQuestion className="w-14 h-14 mx-auto mb-4 text-muted-foreground/30" />
            <p className="text-muted-foreground mb-2">아직 문의 내역이 없습니다.</p>
            <p className="text-sm text-muted-foreground mb-6">
              사주·궁합·일반 문의를 통해 궁금한 점을 물어보세요.
            </p>
            <Button variant="outline" onClick={() => navigate("/")} className="gap-2">
              <Sparkles className="w-4 h-4" />
              문의하러 가기
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {data.inquiries.map((inq) => (
              <InquiryItem
                key={inq.id}
                inquiry={inq}
                onRead={(id) => markReadMut.mutate(id)}
              />
            ))}
          </div>
        )}

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-8">
            <Button
              variant="outline" size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm text-muted-foreground">{page} / {totalPages}</span>
            <Button
              variant="outline" size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
