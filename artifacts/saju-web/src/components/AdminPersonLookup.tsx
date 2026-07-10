import { useState } from "react";
import { useCalculateSaju } from "@workspace/api-client-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ShieldCheck, X } from "lucide-react";
import { BIRTH_HOURS } from "@/components/ProfileModal";
import { sajuResultToProfile } from "@/lib/resolved-profile";
import type { UserProfile } from "@/contexts/UserContext";
import { cn } from "@/lib/utils";

export interface AdminLookupTarget {
  profile: UserProfile;
  label: string;
}

interface Props {
  active: AdminLookupTarget | null;
  onLoad: (target: AdminLookupTarget) => void;
  onClear: () => void;
  className?: string;
}

type Gender = "male" | "female";
type CalType = "solar" | "lunar";

/**
 * 관리자 전용: 임의의 생년월일을 입력해 그 사람의 사주를 계산하고,
 * 만세력을 그 사람 기준으로 렌더링하도록 프로필을 주입한다.
 */
export function AdminPersonLookup({ active, onLoad, onClear, className }: Props) {
  const [name, setName] = useState("");
  const [gender, setGender] = useState<Gender>("male");
  const [calendarType, setCalendarType] = useState<CalType>("solar");
  const [year, setYear] = useState("");
  const [month, setMonth] = useState("");
  const [day, setDay] = useState("");
  const [hour, setHour] = useState(-1);
  const [minute, setMinute] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const { mutate: calculateSaju, isPending } = useCalculateSaju();

  const canSubmit =
    Number(year) >= 1900 && Number(year) <= 2100 &&
    Number(month) >= 1 && Number(month) <= 12 &&
    Number(day) >= 1 && Number(day) <= 31 &&
    !isPending;

  const submit = () => {
    setLocalError(null);
    const y = Number(year);
    const m = Number(month);
    const d = Number(day);
    const min = Number(minute);
    calculateSaju(
      {
        data: {
          birthYear: y,
          birthMonth: m,
          birthDay: d,
          birthHour: hour,
          birthMinute: Number.isFinite(min) ? min : 0,
          gender,
          calendarType,
        },
      },
      {
        onSuccess: (result: any) => {
          const profile = sajuResultToProfile(result);
          if (!profile) {
            setLocalError("사주 계산 결과를 프로필로 변환하지 못했습니다.");
            return;
          }
          if (name.trim()) profile.name = name.trim();
          const hourLabel = hour < 0 ? "시간 미상" : `${hour}시`;
          const calLabel = calendarType === "lunar" ? "음력" : "양력";
          const genderLabel = gender === "female" ? "여성" : "남성";
          const who = name.trim() ? `${name.trim()} · ` : "";
          const label = `${who}${y}년 ${m}월 ${d}일 ${hourLabel} · ${genderLabel} · ${calLabel}`;
          onLoad({ profile, label });
        },
        onError: () => {
          setLocalError("사주 계산에 실패했습니다. 입력값을 확인해 주세요.");
        },
      },
    );
  };

  return (
    <Card className={cn("mb-5 border-amber-500/30 bg-amber-500/[0.04] p-4 md:p-5", className)}>
      <div className="flex items-center gap-2 mb-3">
        <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
        <h3 className="text-sm font-semibold text-amber-700">관리자 전용 · 다른 사람 만세력 조회</h3>
      </div>

      {active ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-background/60 px-4 py-3">
          <div className="text-sm">
            <span className="text-amber-700 font-medium">조회 중: </span>
            <span className="text-foreground">{active.label}</span>
          </div>
          <Button variant="outline" size="sm" onClick={onClear} className="shrink-0 gap-1">
            <X className="w-3.5 h-3.5" /> 내 사주로 돌아가기
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground/70">이름 (선택)</label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="예) 홍길동"
                className="h-11 placeholder:text-muted-foreground/40" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground/70">달력 · 성별</label>
              <div className="flex gap-1.5">
                {([["solar", "양력"], ["lunar", "음력"]] as const).map(([v, l]) => (
                  <button key={v} type="button" onClick={() => setCalendarType(v)}
                    className={`flex-1 h-11 rounded-xl border text-sm font-medium transition-colors ${calendarType === v ? "border-primary bg-primary/10 text-primary" : "border-primary/20 text-muted-foreground"}`}>{l}</button>
                ))}
                {([["male", "남"], ["female", "여"]] as const).map(([v, l]) => (
                  <button key={v} type="button" onClick={() => setGender(v)}
                    className={`flex-1 h-11 rounded-xl border text-sm font-medium transition-colors ${gender === v ? "border-primary bg-primary/10 text-primary" : "border-primary/20 text-muted-foreground"}`}>{l}</button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {([["year", "년", "1990", 1900, 2100], ["month", "월", "1~12", 1, 12], ["day", "일", "1~31", 1, 31]] as const).map(([key, label, ph, min, max]) => (
              <div key={key} className="space-y-1.5">
                <label className="text-xs font-medium text-foreground/70">{label}</label>
                <Input type="number" inputMode="numeric" placeholder={ph} min={min} max={max}
                  value={key === "year" ? year : key === "month" ? month : day}
                  onChange={e => (key === "year" ? setYear : key === "month" ? setMonth : setDay)(e.target.value)}
                  className="h-11 placeholder:text-muted-foreground/40" />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground/70">시 (Hour)</label>
              <Select value={String(hour)} onValueChange={v => setHour(Number(v))}>
                <SelectTrigger className="h-11 rounded-xl border-primary/20 bg-input text-foreground focus:ring-primary">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BIRTH_HOURS.map(h => (
                    <SelectItem key={h.value} value={String(h.value)}>{h.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground/70">분 (Minute)</label>
              <Input type="number" inputMode="numeric" placeholder="0~59" min={0} max={59}
                value={minute} onChange={e => setMinute(e.target.value)} disabled={hour === -1}
                className="h-11 placeholder:text-muted-foreground/40" />
            </div>
          </div>

          {localError && <p className="text-sm text-red-500">{localError}</p>}

          <Button onClick={submit} disabled={!canSubmit} className="w-full gap-2">
            {isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> 계산 중…</> : "이 사람 만세력 불러오기"}
          </Button>
        </div>
      )}
    </Card>
  );
}
