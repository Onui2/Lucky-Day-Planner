import { useState, useEffect, type ComponentType } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@workspace/replit-auth-web";
import {
  useGetAdminStats,
  useGetAdminInquiries,
  useAdminReplyInquiry,
  useAdminMarkRead,
  useAdminDeleteInquiry,
  useCalculateSaju,
  useGetAdminUsers,
  useAdminSetUserRole,
  type AdminStatsResponse,
  type Inquiry,
  type InquirySajuSnapshot,
  type AdminUser,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ShieldCheck, MessageSquare, Clock, CheckCircle2, Trash2,
  ChevronLeft, ChevronRight, Send, Loader2, User, Calendar,
  AlertTriangle, Eye, ChevronDown, ChevronUp, Sparkles, Heart, FileQuestion,
  Users, Search, Crown, UserCheck, UserX, Mail, TrendingUp, Database,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getBirthHourLabel } from "@/components/ProfileModal";
import { useLocation } from "wouter";

/* ─── 헬퍼 ───────────────────────────────────── */
const STEM_HANJA: Record<string, string> = {
  갑:"甲",을:"乙",병:"丙",정:"丁",무:"戊",
  기:"己",경:"庚",신:"辛",임:"壬",계:"癸",
};
const BRANCH_HANJA: Record<string, string> = {
  자:"子",축:"丑",인:"寅",묘:"卯",진:"辰",사:"巳",
  오:"午",미:"未",신:"申",유:"酉",술:"戌",해:"亥",
};
const toH = (k: string) => STEM_HANJA[k]   ?? k;
const toB = (k: string) => BRANCH_HANJA[k] ?? k;

const ELEM_BG: Record<string, string> = {
  목:"bg-emerald-500/10 text-emerald-300",
  화:"bg-rose-500/10 text-rose-300",
  토:"bg-amber-500/10 text-amber-300",
  금:"bg-slate-400/10 text-slate-200",
  수:"bg-blue-500/10 text-blue-300",
};

function elemStyle(el: string) {
  return ELEM_BG[el] ?? "bg-primary/10 text-primary";
}

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
      <Clock className="w-3 h-3" /> 대기중
    </span>
  );
}

function InquiryTypeBadge({ type }: { type?: string | null }) {
  if (!type || type === "general") {
    return (
      <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-400 border border-sky-500/30">
        <FileQuestion className="w-3 h-3" /> 일반
      </span>
    );
  }
  if (type === "saju") {
    return (
      <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30">
        <Sparkles className="w-3 h-3" /> 사주
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30">
      <Heart className="w-3 h-3" /> 궁합
    </span>
  );
}

/* ─── 사주 분석 패널 ──────────────────────────── */
type SajuData = Awaited<ReturnType<typeof useCalculateSaju>>["data"];

function SajuAnalysisPanel({ snap }: { snap: InquirySajuSnapshot }) {
  const { mutate, data: result, isPending } = useCalculateSaju();

  useEffect(() => {
    mutate({
      data: {
        birthYear: snap.birthYear,
        birthMonth: snap.birthMonth,
        birthDay: snap.birthDay,
        birthHour: snap.birthHour ?? -1,
        birthMinute: 0,
        gender: snap.gender as "male" | "female",
        calendarType: snap.calendarType as "solar" | "lunar",
      },
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isPending) {
    return (
      <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground text-sm">
        <Loader2 className="w-4 h-4 animate-spin" /> 사주 계산 중...
      </div>
    );
  }

  if (!result) return null;

  const r = result as NonNullable<SajuData> & Record<string, unknown>;
  const pillars = [
    { label: "연주", pillar: r.yearPillar },
    { label: "월주", pillar: r.monthPillar },
    { label: "일주", pillar: r.dayPillar },
    { label: "시주", pillar: r.hourPillar },
  ] as const;

  const eb = r.elementBalance as unknown as Record<string, number>;
  const elemTotal = Object.values(eb).reduce((a, b) => a + b, 0) || 1;

  const yongsin = r.yongsin as { yongsin?: string; heegsin?: string; geesin?: string; explanation?: string } | undefined;
  const sinGangYak = r.sinGangYak as { label?: string; score?: number; description?: string } | undefined;
  const daeun = r.daeun as Array<{ age?: number; stem?: string; branch?: string; stemElement?: string; startYear?: number }> | undefined;
  const samjae = r.samjae as { isSamjae?: boolean; type?: string; targetYears?: number[] } | undefined;
  const yongsinItems = r.yongsinItems as Array<{ category?: string; items?: string[] }> | undefined;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="mt-3 space-y-4 border-t border-primary/10 pt-4"
    >
      {/* ① 사주팔자 표 */}
      <div>
        <p className="text-xs font-bold text-primary/80 uppercase tracking-widest mb-2">사주팔자 (四柱八字)</p>
        <div className="grid grid-cols-4 gap-1.5">
          {pillars.map(({ label, pillar }) => {
            const p = pillar as { heavenlyStem?: string; earthlyBranch?: string; heavenlyStemElement?: string; earthlyBranchElement?: string; zodiac?: string } | undefined;
            const hs = p?.heavenlyStem ?? "?";
            const eb2 = p?.earthlyBranch ?? "?";
            const hse = p?.heavenlyStemElement ?? "";
            const ebe = p?.earthlyBranchElement ?? "";
            return (
              <div key={label} className="flex flex-col items-center gap-1">
                <span className="text-[10px] text-muted-foreground font-medium">{label}</span>
                <div className={cn("w-10 h-10 rounded-lg flex flex-col items-center justify-center text-xs font-bold border", elemStyle(hse), "border-current/20")}>
                  <span className="text-base leading-none">{toH(hs)}</span>
                  <span className="text-[9px] opacity-60">{hs}</span>
                </div>
                <div className={cn("w-10 h-10 rounded-lg flex flex-col items-center justify-center text-xs font-bold border", elemStyle(ebe), "border-current/20")}>
                  <span className="text-base leading-none">{toB(eb2)}</span>
                  <span className="text-[9px] opacity-60">{eb2}</span>
                </div>
                {p?.zodiac && <span className="text-[9px] text-muted-foreground">{p.zodiac}</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* ② 오행 균형 */}
      <div>
        <p className="text-xs font-bold text-primary/80 uppercase tracking-widest mb-2">오행 균형</p>
        <div className="flex gap-1.5 flex-wrap">
          {(["목","화","토","금","수"] as const).map((elem) => {
            const cnt = (eb[elem] ?? 0) as number;
            const pct = Math.round((cnt / elemTotal) * 100);
            return (
              <div key={elem} className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium", elemStyle(elem))}>
                <span className="font-bold">{elem}</span>
                <span className="opacity-70">{cnt}개 ({pct}%)</span>
              </div>
            );
          })}
        </div>
        <div className="flex gap-2 mt-2 text-xs text-muted-foreground">
          <span>일간: <strong className="text-foreground">{r.dayMasterStem as string}</strong> ({r.dayMasterElement as string})</span>
          <span>·</span>
          <span>강: <strong className="text-foreground">{r.dominantElement as string}</strong></span>
          <span>·</span>
          <span>약: <strong className="text-foreground">{r.lackingElement as string}</strong></span>
        </div>
      </div>

      {/* ③ 신강/신약 + 용신 */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {sinGangYak && (
          <div className="p-3 rounded-xl border border-primary/15 bg-primary/5">
            <p className="text-[10px] font-bold text-primary/60 uppercase tracking-widest mb-1">신강/신약</p>
            <p className="text-sm font-bold text-primary mb-1">{sinGangYak.label}</p>
            {sinGangYak.description && (
              <p className="text-xs text-muted-foreground leading-relaxed">{sinGangYak.description}</p>
            )}
          </div>
        )}
        {yongsin && (
          <div className="p-3 rounded-xl border border-amber-500/20 bg-amber-500/5">
            <p className="text-[10px] font-bold text-amber-400/70 uppercase tracking-widest mb-1">용신/희신/기신</p>
            <div className="flex flex-wrap gap-1.5 mb-1.5">
              {yongsin.yongsin && <span className={cn("text-xs px-2 py-0.5 rounded-full font-bold", elemStyle(yongsin.yongsin))}>용신 {yongsin.yongsin}</span>}
              {yongsin.heegsin && <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium opacity-80", elemStyle(yongsin.heegsin))}>희신 {yongsin.heegsin}</span>}
              {yongsin.geesin && <span className="text-xs px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 font-medium">기신 {yongsin.geesin}</span>}
            </div>
            {yongsin.explanation && (
              <p className="text-xs text-muted-foreground leading-relaxed">{yongsin.explanation}</p>
            )}
          </div>
        )}
      </div>

      {/* ④ 대운 */}
      {daeun && daeun.length > 0 && (
        <div>
          <p className="text-xs font-bold text-primary/80 uppercase tracking-widest mb-2">대운 (大運)</p>
          <div className="flex gap-1.5 flex-wrap">
            {daeun.slice(0, 8).map((d, i) => (
              <div key={i} className={cn("flex flex-col items-center p-1.5 rounded-lg border text-xs", elemStyle(d.stemElement ?? ""))}>
                <span className="font-bold text-sm leading-none">{toH(d.stem ?? "")+toB(d.branch ?? "")}</span>
                <span className="text-[9px] opacity-70 mt-0.5">{d.startYear}년</span>
                <span className="text-[9px] opacity-60">{d.age}세</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ⑤ 삼재 */}
      {samjae?.isSamjae && (
        <div className="p-3 rounded-xl border border-rose-500/30 bg-rose-500/8">
          <p className="text-xs font-bold text-rose-400 mb-1">⚠ 삼재 ({samjae.type})</p>
          <p className="text-xs text-muted-foreground">대상 연도: {samjae.targetYears?.join("년, ")}년</p>
        </div>
      )}

      {/* ⑥ 성격/운세/직업 */}
      <div className="space-y-2.5">
        {[
          { label: "성격", val: r.personality },
          { label: "직업운", val: r.career },
          { label: "사랑운", val: r.love },
          { label: "건강운", val: r.health },
        ].map(({ label, val }) => (
          val ? (
            <div key={label} className="p-3 rounded-xl border border-primary/10 bg-primary/3">
              <p className="text-[10px] font-bold text-primary/60 uppercase tracking-widest mb-1">{label}</p>
              <p className="text-xs text-foreground/80 leading-relaxed">{val as string}</p>
            </div>
          ) : null
        ))}
      </div>

      {/* ⑦ 용신 아이템 */}
      {yongsinItems && yongsinItems.length > 0 && (
        <div>
          <p className="text-xs font-bold text-primary/80 uppercase tracking-widest mb-2">용신 아이템</p>
          <div className="flex flex-wrap gap-2">
            {yongsinItems.map((cat, i) => (
              <div key={i} className="text-xs">
                <span className="text-muted-foreground">{cat.category}: </span>
                <span className="text-foreground/80">{cat.items?.join(", ")}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ⑧ 행운 정보 */}
      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
        <span>🔢 행운번호: {(r.luckyNumbers as number[])?.join(", ")}</span>
        <span>🎨 행운색: {(r.luckyColors as string[])?.join(", ")}</span>
        <span>🧭 행운방향: {(r.luckyDirections as string[])?.join(", ")}</span>
      </div>
    </motion.div>
  );
}

/* ─── 사주 요약 표시 ─────────────────────────── */
function SajuInfoBar({ snap }: { snap: Inquiry["sajuSnapshot"] }) {
  if (!snap) return <span className="text-muted-foreground text-xs italic">사주 정보 없음</span>;

  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
      <span>📅 {snap.birthYear}년 {snap.birthMonth}월 {snap.birthDay}일</span>
      {snap.birthHour !== undefined && snap.birthHour >= 0 && (
        <span>🕐 {getBirthHourLabel(snap.birthHour).split(' ')[0]}</span>
      )}
      <span>{snap.gender === "male" ? "♂ 남성" : "♀ 여성"}</span>
      {snap.calendarType === "lunar" && <span className="text-primary/70">음력</span>}
      {snap.dayPillarStem && <span>일간: <strong className="text-foreground">{snap.dayPillarStem}</strong></span>}
      {snap.sajuSummary && <span className="text-foreground/50 max-w-xs truncate">{snap.sajuSummary}</span>}
    </div>
  );
}

/* ─── 문의 카드 ──────────────────────────────── */
function InquiryCard({
  inquiry,
  onReply,
  onDelete,
  onMarkRead,
}: {
  inquiry: Inquiry;
  onReply: (id: number, reply: string) => Promise<void>;
  onDelete: (id: number) => void;
  onMarkRead: (id: number) => void;
}) {
  const [replyText, setReplyText] = useState(inquiry.adminReply ?? "");
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [showSaju, setShowSaju] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleReplySubmit = async () => {
    if (!replyText.trim() || submitting) return;
    setSubmitting(true);
    try {
      await onReply(inquiry.id, replyText.trim());
      setShowReplyForm(false);
    } finally {
      setSubmitting(false);
    }
  };

  const snapObj = inquiry.sajuSnapshot as Record<string, unknown> | null | undefined;
  const hasSaju = !!snapObj && !!snapObj.birthYear;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "glass-panel border rounded-2xl p-5 transition-all",
        !inquiry.readByAdmin
          ? "border-violet-500/40 bg-violet-500/5"
          : "border-primary/20"
      )}
    >
      {/* 헤더 */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 flex-wrap">
          <StatusBadge status={inquiry.status} />
          <InquiryTypeBadge type={inquiry.inquiryType} />
          {!inquiry.readByAdmin && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30">NEW</span>
          )}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <User className="w-3.5 h-3.5" />
            {inquiry.userFirstName || inquiry.userEmail?.split("@")[0] || "이용자"}
            {inquiry.userEmail && <span className="text-foreground/40">({inquiry.userEmail})</span>}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="w-3.5 h-3.5" />
            {formatDate(inquiry.createdAt)}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!inquiry.readByAdmin && (
            <Button variant="ghost" size="sm" onClick={() => onMarkRead(inquiry.id)} className="h-7 text-xs text-muted-foreground">
              <Eye className="w-3.5 h-3.5 mr-1" /> 읽음 처리
            </Button>
          )}
          {confirmDelete ? (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-rose-400">삭제하시겠습니까?</span>
              <Button variant="ghost" size="sm" onClick={() => onDelete(inquiry.id)} className="h-7 text-xs text-rose-400 hover:text-rose-300">확인</Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)} className="h-7 text-xs">취소</Button>
            </div>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(true)} className="h-7 text-muted-foreground hover:text-rose-400">
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* 사주 정보 (클릭하면 펼쳐짐) */}
      <button
        onClick={() => hasSaju && setShowSaju((v) => !v)}
        className={cn(
          "w-full text-left mb-3 p-2.5 rounded-xl border transition-all",
          hasSaju
            ? "border-primary/20 bg-primary/5 hover:bg-primary/10 hover:border-primary/30 cursor-pointer"
            : "border-primary/10 bg-primary/3 cursor-default"
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <SajuInfoBar snap={inquiry.sajuSnapshot as Inquiry["sajuSnapshot"]} />
          {hasSaju && (
            <div className={cn(
              "flex items-center gap-1 text-xs font-medium transition-colors shrink-0",
              showSaju ? "text-primary" : "text-muted-foreground hover:text-primary"
            )}>
              <Sparkles className="w-3.5 h-3.5" />
              {showSaju ? "사주 접기" : "사주 분석 보기"}
              {showSaju ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </div>
          )}
        </div>

        <AnimatePresence>
          {showSaju && inquiry.sajuSnapshot && (
            <div onClick={(e) => e.stopPropagation()}>
              <SajuAnalysisPanel snap={inquiry.sajuSnapshot as InquirySajuSnapshot} />
            </div>
          )}
        </AnimatePresence>
      </button>

      {/* 문의 내용 */}
      <div className="mb-4">
        <p className="text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">문의 내용</p>
        <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">{inquiry.message}</p>
      </div>

      {/* 기존 답변 */}
      {inquiry.adminReply && !showReplyForm && (
        <div className="mb-3 p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
          <p className="text-xs font-semibold text-emerald-400 mb-1.5">답변 ({inquiry.repliedAt ? formatDate(inquiry.repliedAt) : ""})</p>
          <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">{inquiry.adminReply}</p>
        </div>
      )}

      {/* 답변 폼 */}
      {showReplyForm ? (
        <div className="mt-3 space-y-2">
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value.slice(0, 3000))}
            placeholder="답변을 작성해 주세요..."
            className="w-full h-32 resize-none rounded-xl border border-primary/20 bg-background/50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
            autoFocus
          />
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">{replyText.length}/3000</span>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowReplyForm(false)}>취소</Button>
              <Button
                size="sm"
                onClick={handleReplySubmit}
                disabled={!replyText.trim() || submitting}
                className="gap-1.5 bg-primary hover:bg-primary/90"
              >
                {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                답변 저장
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <Button
          variant="outline" size="sm"
          onClick={() => setShowReplyForm(true)}
          className="mt-2 gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
        >
          <MessageSquare className="w-4 h-4" />
          {inquiry.adminReply ? "답변 수정" : "답변 작성"}
        </Button>
      )}
    </motion.div>
  );
}

/* ─── 회원 관리 탭 ──────────────────────────── */
function formatJoinDate(iso: string) {
  return new Date(iso).toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" });
}

function UserRow({
  member,
  currentUserId,
  currentUserRole,
  onRoleChange,
  pending,
}: {
  member: AdminUser;
  currentUserId: string;
  currentUserRole: string;
  onRoleChange: (id: string, role: "admin" | "user") => void;
  pending: boolean;
}) {
  const [confirm, setConfirm] = useState<"promote" | "demote" | "demote-super" | null>(null);
  const isMe = member.id === currentUserId;
  const isAdmin = member.role === "admin";
  const isSuperAdmin = member.role === "superadmin";
  const canManage = currentUserRole === "superadmin" && !isMe && !isSuperAdmin;
  const canDemoteSuperAdmin = currentUserRole === "superadmin" && !isMe && isSuperAdmin;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "glass-panel border rounded-2xl px-5 py-4 flex flex-wrap items-center gap-4 transition-all",
        isSuperAdmin ? "border-amber-400/40 bg-amber-400/5"
        : isAdmin ? "border-primary/30 bg-primary/5"
        : "border-white/10"
      )}
    >
      {/* 아바타 + 이름 */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className={cn(
          "w-9 h-9 rounded-full flex items-center justify-center shrink-0 border",
          isSuperAdmin ? "bg-amber-400/20 border-amber-400/40"
          : isAdmin ? "bg-primary/20 border-primary/40"
          : "bg-white/8 border-white/15"
        )}>
          {isSuperAdmin
            ? <Crown className="w-4 h-4 text-amber-400" />
            : isAdmin
            ? <Crown className="w-4 h-4 text-primary" />
            : <User className="w-4 h-4 text-muted-foreground" />}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-foreground truncate">
              {member.firstName || member.lastName
                ? `${member.firstName ?? ""} ${member.lastName ?? ""}`.trim()
                : "이름 없음"}
            </span>
            {isSuperAdmin && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-400/20 text-amber-400 border border-amber-400/40 font-semibold">
                최고관리자
              </span>
            )}
            {!isSuperAdmin && isAdmin && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30 font-semibold">
                관리자
              </span>
            )}
            {isMe && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-sky-500/20 text-sky-400 border border-sky-500/30">
                나
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
            <Mail className="w-3 h-3 shrink-0" />
            <span className="truncate">{member.email ?? "이메일 없음"}</span>
          </div>
        </div>
      </div>

      {/* 가입일 */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
        <Calendar className="w-3.5 h-3.5" />
        {formatJoinDate(member.createdAt)}
      </div>

      {/* 최고관리자 → 관리자 다운그레이드 버튼 */}
      {canDemoteSuperAdmin && (
        <div className="shrink-0">
          {confirm !== "demote-super" ? (
            <Button
              variant="outline" size="sm"
              disabled={pending}
              onClick={() => setConfirm("demote-super")}
              className="gap-1.5 text-xs h-8 border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
            >
              <UserX className="w-3.5 h-3.5" />
              최고관리자 해제
            </Button>
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">관리자로 변경할까요?</span>
              <Button
                size="sm" variant="ghost"
                disabled={pending}
                onClick={() => { onRoleChange(member.id, "admin"); setConfirm(null); }}
                className="h-7 text-xs px-2 text-amber-400"
              >
                {pending ? <Loader2 className="w-3 h-3 animate-spin" /> : "확인"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirm(null)} className="h-7 text-xs px-2 text-muted-foreground">
                취소
              </Button>
            </div>
          )}
        </div>
      )}

      {/* 일반 관리자 승격/해제 버튼 — 최고관리자만 표시 */}
      {canManage && (
        <div className="shrink-0">
          {confirm === null ? (
            <Button
              variant="outline" size="sm"
              disabled={pending}
              onClick={() => setConfirm(isAdmin ? "demote" : "promote")}
              className={cn(
                "gap-1.5 text-xs h-8",
                isAdmin
                  ? "border-rose-500/30 text-rose-400 hover:bg-rose-500/10"
                  : "border-primary/30 text-primary hover:bg-primary/10"
              )}
            >
              {isAdmin ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
              {isAdmin ? "관리자 해제" : "관리자 승격"}
            </Button>
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">
                {confirm === "promote" ? "관리자로 승격할까요?" : "관리자를 해제할까요?"}
              </span>
              <Button
                size="sm" variant="ghost"
                disabled={pending}
                onClick={() => {
                  onRoleChange(member.id, confirm === "promote" ? "admin" : "user");
                  setConfirm(null);
                }}
                className={cn("h-7 text-xs px-2", confirm === "promote" ? "text-primary" : "text-rose-400")}
              >
                {pending ? <Loader2 className="w-3 h-3 animate-spin" /> : "확인"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirm(null)} className="h-7 text-xs px-2 text-muted-foreground">
                취소
              </Button>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

function UsersTab({ currentUserId, currentUserRole }: { currentUserId: string; currentUserRole: string }) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading, refetch } = useGetAdminUsers(page, debouncedSearch);
  const roleMut = useAdminSetUserRole();

  const handleRoleChange = (id: string, role: "admin" | "user") => {
    setPendingId(id);
    roleMut.mutate({ id, role }, {
      onSuccess: () => { refetch(); setPendingId(null); },
      onError: () => setPendingId(null),
    });
  };

  const totalPages = data ? Math.ceil(data.total / data.limit) : 1;

  return (
    <div className="space-y-4">
      {/* 검색 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="이름 또는 이메일 검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-white/5 border-white/10"
        />
      </div>

      {/* 통계 */}
      {data && (
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>전체 <strong className="text-foreground">{data.total}</strong>명</span>
          <span>관리자 <strong className="text-primary">{data.users.filter(u => u.role === "admin" || u.role === "superadmin").length}</strong>명</span>
        </div>
      )}

      {/* 목록 */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-7 h-7 animate-spin text-primary" />
        </div>
      ) : !data?.users?.length ? (
        <div className="text-center py-16 text-muted-foreground">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>{debouncedSearch ? "검색 결과가 없습니다." : "등록된 회원이 없습니다."}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {data.users.map((member) => (
            <UserRow
              key={member.id}
              member={member}
              currentUserId={currentUserId}
              currentUserRole={currentUserRole}
              onRoleChange={handleRoleChange}
              pending={pendingId === member.id}
            />
          ))}
        </div>
      )}

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm text-muted-foreground">{page} / {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

/* ─── 어드민 페이지 ───────────────────────────── */
function StatsCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = "primary",
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: number;
  hint: string;
  tone?: "primary" | "emerald" | "amber" | "sky";
}) {
  const toneClass =
    tone === "emerald"
      ? "border-emerald-500/30 bg-emerald-500/8 text-emerald-300"
      : tone === "amber"
        ? "border-amber-500/30 bg-amber-500/8 text-amber-300"
        : tone === "sky"
          ? "border-sky-500/30 bg-sky-500/8 text-sky-300"
          : "border-primary/30 bg-primary/8 text-primary";

  return (
    <div className={cn("glass-panel border rounded-2xl p-5", toneClass)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest opacity-70 mb-1">{label}</p>
          <p className="text-3xl font-semibold text-foreground">{value.toLocaleString("ko-KR")}</p>
        </div>
        <div className="w-10 h-10 rounded-2xl border border-current/20 bg-black/10 flex items-center justify-center">
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <p className="text-xs text-muted-foreground mt-3">{hint}</p>
    </div>
  );
}

function DashboardTab() {
  const { data, isLoading } = useGetAdminStats();

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-7 h-7 animate-spin text-primary" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="glass-panel border border-primary/20 rounded-2xl p-8 text-center text-muted-foreground">
        관리자 통계를 불러오지 못했습니다.
      </div>
    );
  }

  const inquiryTypeEntries: Array<{
    key: keyof AdminStatsResponse["inquiryTypes"];
    label: string;
    color: string;
  }> = [
    { key: "general", label: "일반", color: "bg-sky-400" },
    { key: "saju", label: "사주", color: "bg-primary" },
    { key: "gungap", label: "궁합", color: "bg-rose-400" },
  ];
  const inquiryTypeTotal = Object.values(data.inquiryTypes).reduce(
    (sum, value) => sum + value,
    0,
  );

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatsCard
          icon={Users}
          label="전체 회원"
          value={data.counts.totalUsers}
          hint={`오늘 신규 ${data.counts.newUsersToday}명`}
        />
        <StatsCard
          icon={MessageSquare}
          label="전체 문의"
          value={data.counts.totalInquiries}
          hint={`오늘 접수 ${data.counts.inquiriesToday}건`}
          tone="sky"
        />
        <StatsCard
          icon={Clock}
          label="미처리 문의"
          value={data.counts.pendingInquiries}
          hint={`미확인 ${data.counts.unreadInquiries}건`}
          tone="amber"
        />
        <StatsCard
          icon={Database}
          label="저장된 사주"
          value={data.counts.totalSavedSaju}
          hint={`오늘 답변 ${data.counts.answeredToday}건`}
          tone="emerald"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_0.95fr] gap-4">
        <div className="glass-panel border border-primary/20 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h3 className="font-medium text-foreground">문의 유형 비중</h3>
          </div>

          <div className="space-y-3">
            {inquiryTypeEntries.map((entry) => {
              const value = data.inquiryTypes[entry.key];
              const ratio =
                inquiryTypeTotal > 0
                  ? Math.round((value / inquiryTypeTotal) * 100)
                  : 0;

              return (
                <div key={entry.key} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-foreground/85">{entry.label}</span>
                    <span className="text-muted-foreground">
                      {value}건 ({ratio}%)
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-white/8 overflow-hidden">
                    <div
                      className={cn("h-full rounded-full", entry.color)}
                      style={{ width: `${Math.max(ratio, value > 0 ? 8 : 0)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-2 gap-3 mt-5 text-sm">
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="text-[11px] text-muted-foreground mb-1">관리자 계정</div>
              <div className="font-semibold text-foreground">{data.counts.adminUsers}명</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="text-[11px] text-muted-foreground mb-1">오늘 답변</div>
              <div className="font-semibold text-foreground">{data.counts.answeredToday}건</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <div className="glass-panel border border-primary/20 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-4 h-4 text-primary" />
              <h3 className="font-medium text-foreground">최근 가입</h3>
            </div>

            <div className="space-y-3">
              {data.recentUsers.length === 0 ? (
                <div className="text-sm text-muted-foreground">최근 가입 사용자가 없습니다.</div>
              ) : (
                data.recentUsers.map((member) => (
                  <div key={member.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-foreground truncate">
                          {member.firstName || member.email || "이름 없음"}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {member.email ?? "이메일 없음"}
                        </div>
                      </div>
                      <span className="text-[11px] text-primary bg-primary/15 border border-primary/25 px-2 py-0.5 rounded-full">
                        {member.role}
                      </span>
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-2">
                      {formatDate(member.createdAt)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="glass-panel border border-primary/20 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="w-4 h-4 text-primary" />
              <h3 className="font-medium text-foreground">최근 문의</h3>
            </div>

            <div className="space-y-3">
              {data.recentInquiries.length === 0 ? (
                <div className="text-sm text-muted-foreground">최근 문의가 없습니다.</div>
              ) : (
                data.recentInquiries.map((inquiry) => (
                  <div key={inquiry.id} className="rounded-xl border border-white/10 bg-white/5 p-3 space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-medium text-foreground">
                        {inquiry.userLabel || inquiry.userEmail || `문의 #${inquiry.id}`}
                      </div>
                      <StatusBadge status={inquiry.status} />
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <InquiryTypeBadge type={inquiry.inquiryType} />
                      <span>{formatDate(inquiry.createdAt)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<"dashboard" | "inquiries" | "users">("dashboard");
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);

  const { data, refetch, isLoading: listLoading } = useGetAdminInquiries(page, statusFilter);
  const replyMut = useAdminReplyInquiry();
  const markReadMut = useAdminMarkRead();
  const deleteMut = useAdminDeleteInquiry();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated || (user?.role !== "admin" && user?.role !== "superadmin")) {
    return (
      <div className="max-w-md mx-auto text-center py-20">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center">
          <AlertTriangle className="w-8 h-8 text-rose-400" />
        </div>
        <h2 className="text-xl font-semibold mb-2">접근 권한 없음</h2>
        <p className="text-muted-foreground mb-6">관리자 전용 페이지입니다.</p>
        <Button onClick={() => navigate("/")} variant="outline">홈으로</Button>
      </div>
    );
  }

  const handleReply = async (id: number, reply: string) => {
    await replyMut.mutateAsync({ id, reply });
    refetch();
  };

  const handleDelete = (id: number) => {
    deleteMut.mutate(id, { onSuccess: () => refetch() });
  };

  const handleMarkRead = (id: number) => {
    markReadMut.mutate(id, { onSuccess: () => refetch() });
  };

  const totalPages = data ? Math.ceil(data.total / data.limit) : 1;

  return (
    <div className="max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        {/* 헤더 */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-11 h-11 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-serif text-primary">관리자 대시보드</h1>
            <p className="text-sm text-muted-foreground">명해원 운영 관리</p>
          </div>
        </div>

        {/* 탭 */}
        <div className="flex gap-1 p-1 rounded-2xl bg-white/5 border border-white/10 mb-8 w-fit">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={cn(
              "flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium transition-all",
              activeTab === "dashboard"
                ? "bg-primary/20 text-primary border border-primary/30"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <TrendingUp className="w-4 h-4" />
            운영 현황
          </button>
          <button
            onClick={() => setActiveTab("inquiries")}
            className={cn(
              "flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium transition-all",
              activeTab === "inquiries"
                ? "bg-primary/20 text-primary border border-primary/30"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <MessageSquare className="w-4 h-4" />
            문의 관리
            {data && data.total > 0 && (
              <span className="ml-1 text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded-full border border-primary/20">
                {data.total}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={cn(
              "flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium transition-all",
              activeTab === "users"
                ? "bg-primary/20 text-primary border border-primary/30"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Users className="w-4 h-4" />
            회원 관리
          </button>
        </div>

        {/* 탭 콘텐츠 */}
        <AnimatePresence mode="wait">
          {activeTab === "dashboard" ? (
            <motion.div key="dashboard" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} transition={{ duration: 0.2 }}>
              <DashboardTab />
            </motion.div>
          ) : activeTab === "inquiries" ? (
            <motion.div key="inquiries" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }}>
              {/* 문의 필터 */}
              <div className="flex gap-2 mb-6">
                {[
                  { label: "전체", value: undefined },
                  { label: "대기중", value: "pending" },
                  { label: "답변완료", value: "answered" },
                ].map((f) => (
                  <button
                    key={f.label}
                    onClick={() => { setStatusFilter(f.value); setPage(1); }}
                    className={cn(
                      "px-4 py-1.5 rounded-full text-sm font-medium border transition-all",
                      statusFilter === f.value
                        ? "bg-primary/20 border-primary/50 text-primary"
                        : "border-primary/20 text-muted-foreground hover:text-primary hover:border-primary/30"
                    )}
                  >
                    {f.label}
                  </button>
                ))}
                {data && (
                  <span className="ml-auto text-sm text-muted-foreground self-center">
                    총 {data.total}건
                  </span>
                )}
              </div>

              {/* 문의 목록 */}
              {listLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-7 h-7 animate-spin text-primary" />
                </div>
              ) : !data?.inquiries?.length ? (
                <div className="text-center py-20 text-muted-foreground">
                  <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>문의가 없습니다.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {data.inquiries.map((inq) => (
                    <InquiryCard
                      key={inq.id}
                      inquiry={inq}
                      onReply={handleReply}
                      onDelete={handleDelete}
                      onMarkRead={handleMarkRead}
                    />
                  ))}
                </div>
              )}

              {/* 페이지네이션 */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-3 mt-8">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground">{page} / {totalPages}</span>
                  <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div key="users" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.2 }}>
              <UsersTab currentUserId={String(user?.id ?? "")} currentUserRole={user?.role ?? "user"} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
