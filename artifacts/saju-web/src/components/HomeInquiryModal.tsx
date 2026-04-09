import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Sparkles, Heart, MessageCircle, ChevronDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useSubmitInquiry } from "@workspace/api-client-react";
import { useAuth } from "@workspace/replit-auth-web";
import { useLocation } from "wouter";

type InquiryType = "general" | "saju" | "gungap";

interface Props {
  open: boolean;
  type: InquiryType;
  onClose: () => void;
}

const TYPE_META: Record<InquiryType, { label: string; icon: React.ReactNode; color: string; borderColor: string; desc: string }> = {
  general: {
    label: "일반 문의",
    icon: <MessageCircle className="w-5 h-5" />,
    color: "text-sky-400",
    borderColor: "border-sky-400/40",
    desc: "궁금하신 점이나 기타 문의사항을 남겨주세요.",
  },
  saju: {
    label: "사주 문의",
    icon: <Sparkles className="w-5 h-5" />,
    color: "text-primary",
    borderColor: "border-primary/40",
    desc: "생년월일시를 알려주시면 사주를 바탕으로 상담해 드립니다.",
  },
  gungap: {
    label: "궁합 문의",
    icon: <Heart className="w-5 h-5" />,
    color: "text-rose-400",
    borderColor: "border-rose-400/40",
    desc: "두 분의 생년월일시를 알려주시면 궁합을 분석해 드립니다.",
  },
};

const HOUR_OPTIONS = [
  "모름/미입력",
  "子시 (23~01시)", "丑시 (01~03시)", "寅시 (03~05시)", "卯시 (05~07시)",
  "辰시 (07~09시)", "巳시 (09~11시)", "午시 (11~13시)", "未시 (13~15시)",
  "申시 (15~17시)", "酉시 (17~19시)", "戌시 (19~21시)", "亥시 (21~23시)",
];

interface BirthFields {
  name: string;
  year: string;
  month: string;
  day: string;
  hour: string;
  gender: string;
}

function BirthSection({ label, fields, onChange }: {
  label: string;
  fields: BirthFields;
  onChange: (f: Partial<BirthFields>) => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <div className="grid grid-cols-2 gap-3">
        <Input
          placeholder="이름"
          value={fields.name}
          onChange={e => onChange({ name: e.target.value })}
          className="bg-white/5 border-white/10"
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onChange({ gender: "male" })}
            className={`flex-1 rounded-lg border text-sm py-2 transition-colors ${fields.gender === "male" ? "border-primary bg-primary/20 text-primary" : "border-white/10 bg-white/5 text-muted-foreground hover:border-white/20"}`}
          >
            남
          </button>
          <button
            type="button"
            onClick={() => onChange({ gender: "female" })}
            className={`flex-1 rounded-lg border text-sm py-2 transition-colors ${fields.gender === "female" ? "border-rose-400 bg-rose-400/20 text-rose-400" : "border-white/10 bg-white/5 text-muted-foreground hover:border-white/20"}`}
          >
            여
          </button>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Input
          placeholder="출생연도"
          value={fields.year}
          onChange={e => onChange({ year: e.target.value })}
          maxLength={4}
          className="bg-white/5 border-white/10 text-center"
        />
        <Input
          placeholder="월"
          value={fields.month}
          onChange={e => onChange({ month: e.target.value })}
          maxLength={2}
          className="bg-white/5 border-white/10 text-center"
        />
        <Input
          placeholder="일"
          value={fields.day}
          onChange={e => onChange({ day: e.target.value })}
          maxLength={2}
          className="bg-white/5 border-white/10 text-center"
        />
      </div>
      <div className="relative">
        <select
          value={fields.hour}
          onChange={e => onChange({ hour: e.target.value })}
          className="w-full rounded-lg border border-white/10 bg-white/5 text-sm px-3 py-2 appearance-none text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
        >
          {HOUR_OPTIONS.map(h => (
            <option key={h} value={h} className="bg-[#0d1b33] text-foreground">{h}</option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
      </div>
    </div>
  );
}

const defaultBirth = (): BirthFields => ({ name: "", year: "", month: "", day: "", hour: HOUR_OPTIONS[0], gender: "male" });

export default function HomeInquiryModal({ open, type, onClose }: Props) {
  const meta = TYPE_META[type];
  const { user } = useAuth();
  const [, navigate] = useLocation();

  const [person1, setPerson1] = useState<BirthFields>(defaultBirth);
  const [person2, setPerson2] = useState<BirthFields>(defaultBirth);
  const [message, setMessage] = useState("");
  const [done, setDone] = useState(false);

  const submit = useSubmitInquiry();

  function buildUserLabel(): string {
    if (type === "general") return "";
    const p1 = person1.name || "의뢰인";
    if (type === "saju") return p1;
    const p2 = person2.name || "상대방";
    return `${p1} & ${p2}`;
  }

  function buildSnapshot() {
    if (type === "general") return null;
    const p1Info = `[${person1.name || "의뢰인"} / ${person1.gender === "male" ? "남" : "여"} / ${person1.year}년 ${person1.month}월 ${person1.day}일 / ${person1.hour}]`;
    if (type === "saju") return { summary: p1Info };
    const p2Info = `[${person2.name || "상대방"} / ${person2.gender === "male" ? "남" : "여"} / ${person2.year}년 ${person2.month}월 ${person2.day}일 / ${person2.hour}]`;
    return { summary: `${p1Info}\n${p2Info}` };
  }

  async function handleSubmit() {
    if (!user) {
      navigate("/login");
      return;
    }
    if (!message.trim()) return;

    await submit.mutateAsync({
      message: message.trim(),
      userLabel: buildUserLabel(),
      sajuSnapshot: buildSnapshot() as Parameters<typeof submit.mutateAsync>[0]["sajuSnapshot"],
      inquiryType: type,
    });
    setDone(true);
  }

  function handleClose() {
    setDone(false);
    setMessage("");
    setPerson1(defaultBirth());
    setPerson2(defaultBirth());
    onClose();
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
          />
          <motion.div
            className={`relative w-full max-w-lg glass-panel rounded-3xl border ${meta.borderColor} shadow-2xl overflow-y-auto max-h-[90vh]`}
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
          >
            <div className="p-6 md:p-8">
              {/* 헤더 */}
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center ${meta.color}`}>
                    {meta.icon}
                  </div>
                  <div>
                    <h2 className={`text-xl font-serif font-bold ${meta.color}`}>{meta.label}</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">{meta.desc}</p>
                  </div>
                </div>
                <button onClick={handleClose} className="text-muted-foreground hover:text-foreground transition-colors mt-1">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {done ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center mx-auto mb-4">
                    <Send className="w-7 h-7 text-green-400" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">문의가 접수되었습니다</h3>
                  <p className="text-sm text-muted-foreground mb-6">빠른 시일 내에 답변 드리겠습니다.</p>
                  <Button onClick={handleClose} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                    확인
                  </Button>
                </div>
              ) : (
                <div className="space-y-5">
                  {/* 생년월일 정보 */}
                  {type === "saju" && (
                    <BirthSection
                      label="본인 정보"
                      fields={person1}
                      onChange={f => setPerson1(prev => ({ ...prev, ...f }))}
                    />
                  )}
                  {type === "gungap" && (
                    <>
                      <BirthSection
                        label="본인 정보"
                        fields={person1}
                        onChange={f => setPerson1(prev => ({ ...prev, ...f }))}
                      />
                      <div className="border-t border-white/10" />
                      <BirthSection
                        label="상대방 정보"
                        fields={person2}
                        onChange={f => setPerson2(prev => ({ ...prev, ...f }))}
                      />
                    </>
                  )}

                  {/* 문의 내용 */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">문의 내용</p>
                    <Textarea
                      placeholder="궁금하신 내용을 자유롭게 작성해주세요..."
                      value={message}
                      onChange={e => setMessage(e.target.value)}
                      rows={5}
                      maxLength={2000}
                      className="bg-white/5 border-white/10 resize-none"
                    />
                    <p className="text-xs text-muted-foreground text-right">{message.length}/2000</p>
                  </div>

                  {/* 비로그인 안내 */}
                  {!user && (
                    <p className="text-xs text-amber-400/80 bg-amber-400/10 border border-amber-400/20 rounded-lg px-3 py-2">
                      문의를 남기려면 로그인이 필요합니다. 제출 시 로그인 페이지로 이동합니다.
                    </p>
                  )}

                  <Button
                    onClick={handleSubmit}
                    disabled={!message.trim() || submit.isPending}
                    className="w-full h-11 font-semibold bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
                  >
                    {submit.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    {submit.isPending ? "접수 중..." : "문의 접수하기"}
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
