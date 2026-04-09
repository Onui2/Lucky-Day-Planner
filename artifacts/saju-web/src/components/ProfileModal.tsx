import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUser, type UserProfile } from "@/contexts/UserContext";
import { useAuth } from "@workspace/replit-auth-web";
import { Loader2, UserCircle2, Trash2, Sparkles } from "lucide-react";

function getSiName(h: number): string {
  if (h === 23 || h === 0) return '자시';
  if (h <= 2)  return '축시';
  if (h <= 4)  return '인시';
  if (h <= 6)  return '묘시';
  if (h <= 8)  return '진시';
  if (h <= 10) return '사시';
  if (h <= 12) return '오시';
  if (h <= 14) return '미시';
  if (h <= 16) return '신시';
  if (h <= 18) return '유시';
  if (h <= 20) return '술시';
  return '해시';
}

export const BIRTH_HOURS = [
  { value: -1, label: "모름" },
  ...Array.from({ length: 24 }, (_, h) => ({
    value: h,
    label: `${h}시 (${getSiName(h)})`,
  })),
];

export function normalizeBirthHour(h: number): number {
  if (h < 0) return -1;
  if (h === 23) return 0;
  if (h % 2 === 0) return h;
  return h + 1;
}

export function getBirthHourLabel(h: number): string {
  const entry = BIRTH_HOURS.find(x => x.value === h);
  return entry?.label ?? `${h}시 (${getSiName(h)})`;
}

const HOURS = BIRTH_HOURS;

const ELEM_KOR: Record<string, string> = { 목: "木 (목)", 화: "火 (화)", 토: "土 (토)", 금: "金 (금)", 수: "水 (수)" };
const ELEM_COLOR: Record<string, string> = { 목: "text-green-400", 화: "text-red-400", 토: "text-yellow-400", 금: "text-gray-300", 수: "text-blue-400" };

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function ProfileModal({ open, onClose }: Props) {
  const { profile, setProfile, clearProfile, isLoading } = useUser();
  const { user } = useAuth();

  const [form, setForm] = useState({
    name: "",
    gender: "male" as "male" | "female",
    birthYear: "",
    birthMonth: "",
    birthDay: "",
    birthHour: -1,
    calendarType: "solar" as "solar" | "lunar",
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (open) {
      setSuccess(false);
      setError(null);
      if (profile) {
        setForm({
          name: profile.name ?? "",
          gender: profile.gender,
          birthYear: String(profile.birthYear),
          birthMonth: String(profile.birthMonth),
          birthDay: String(profile.birthDay),
          birthHour: profile.birthHour,
          calendarType: profile.calendarType,
        });
      } else {
        // 프로필 없을 때: 회원가입 이름 자동 입력
        const autoName = user?.firstName ?? "";
        setForm(f => ({ ...f, name: autoName }));
      }
    }
  }, [open, profile, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    const year = Number(form.birthYear);
    const month = Number(form.birthMonth);
    const day = Number(form.birthDay);
    if (!form.birthYear || isNaN(year) || year < 1900 || year > 2050) { setError("년도를 올바르게 입력해주세요. (1900~2050)"); return; }
    if (!form.birthMonth || isNaN(month) || month < 1 || month > 12) { setError("월을 올바르게 입력해주세요. (1~12)"); return; }
    if (!form.birthDay || isNaN(day) || day < 1 || day > 31) { setError("일을 올바르게 입력해주세요. (1~31)"); return; }

    const p: UserProfile = {
      name: form.name || undefined,
      gender: form.gender,
      birthYear: year,
      birthMonth: month,
      birthDay: day,
      birthHour: form.birthHour,
      calendarType: form.calendarType,
    };
    await setProfile(p);
    setSuccess(true);
    setTimeout(() => onClose(), 800);
  };

  const handleClear = () => {
    clearProfile();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md bg-background/95 backdrop-blur-xl border-primary/30 text-foreground">
        <DialogHeader>
          <DialogTitle className="text-2xl font-serif text-gradient-gold flex items-center gap-2">
            <UserCircle2 className="w-6 h-6 text-primary" />
            내 사주 등록
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            생년월일을 한 번만 등록하면 만세력·오늘의 일진에 개인화 분석이 적용됩니다.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-2">
          {/* 이름 */}
          <div className="space-y-1.5">
            <Label className="text-sm text-muted-foreground">이름 (선택)</Label>
            <Input
              placeholder="예) 홍길동"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="bg-input/40 border-primary/20"
            />
          </div>

          {/* 달력 종류 + 성별 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm text-muted-foreground">달력 종류</Label>
              <div className="flex rounded-lg overflow-hidden border border-primary/20">
                {(["solar","lunar"] as const).map(t => (
                  <button key={t} type="button"
                    className={`flex-1 py-2 text-sm font-medium transition-colors ${form.calendarType === t ? "bg-primary text-primary-foreground" : "bg-transparent text-muted-foreground hover:text-foreground"}`}
                    onClick={() => setForm(f => ({ ...f, calendarType: t }))}
                  >{t === "solar" ? "양력" : "음력"}</button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm text-muted-foreground">성별</Label>
              <div className="flex rounded-lg overflow-hidden border border-primary/20">
                {(["male","female"] as const).map(g => (
                  <button key={g} type="button"
                    className={`flex-1 py-2 text-sm font-medium transition-colors ${form.gender === g ? "bg-primary text-primary-foreground" : "bg-transparent text-muted-foreground hover:text-foreground"}`}
                    onClick={() => setForm(f => ({ ...f, gender: g }))}
                  >{g === "male" ? "남성" : "여성"}</button>
                ))}
              </div>
            </div>
          </div>

          {/* 년/월/일 */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "년도", key: "birthYear", ph: "예) 1990" },
              { label: "월", key: "birthMonth", ph: "1~12" },
              { label: "일", key: "birthDay", ph: "1~31" },
            ].map(({ label, key, ph }) => (
              <div key={key} className="space-y-1.5">
                <Label className="text-sm text-muted-foreground">{label}</Label>
                <Input
                  type="number"
                  placeholder={ph}
                  value={(form as any)[key]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  className="bg-input/40 border-primary/20"
                />
              </div>
            ))}
          </div>

          {/* 출생 시간 */}
          <div className="space-y-1.5">
            <Label className="text-sm text-muted-foreground">출생 시간 (선택)</Label>
            <Select value={String(form.birthHour)} onValueChange={v => setForm(f => ({ ...f, birthHour: Number(v) }))}>
              <SelectTrigger className="bg-input/40 border-primary/20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HOURS.map(h => (
                  <SelectItem key={h.value} value={String(h.value)}>{h.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error && <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">{error}</p>}

          {profile?.dayMasterElement && (
            <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 flex items-center gap-3">
              <span className="text-sm text-muted-foreground">현재 일주:</span>
              <span className={`font-serif font-bold text-lg ${ELEM_COLOR[profile.dayMasterElement] ?? ""}`}>
                {profile.dayMasterStem}{profile.dayMasterBranch ?? ""}
              </span>
              <span className="text-sm text-muted-foreground">
                — {ELEM_KOR[profile.dayMasterElement] ?? profile.dayMasterElement} 일간
              </span>
            </div>
          )}

          {success ? (
            <div className="flex items-center justify-center gap-2 py-3 text-emerald-400 font-medium text-sm">
              <Sparkles className="w-4 h-4" />
              사주 등록 완료! 잠시 후 닫힙니다…
            </div>
          ) : (
            <div className="flex gap-3 pt-1">
              <Button type="submit" className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-medium" disabled={isLoading}>
                {isLoading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />분석 중…</> : "사주 등록하기"}
              </Button>
              {profile && (
                <Button type="button" variant="outline" size="icon" className="border-destructive/40 text-destructive hover:bg-destructive/10" onClick={handleClear}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
