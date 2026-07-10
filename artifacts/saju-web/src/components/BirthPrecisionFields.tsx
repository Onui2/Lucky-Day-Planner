import { Clock3, MapPin, Sun } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  BIRTHPLACE_PRESETS,
  type BirthPrecisionValues,
} from "@/lib/birth-precision";
import { cn } from "@/lib/utils";

interface BirthPrecisionFieldsProps {
  values: BirthPrecisionValues;
  calendarType: "solar" | "lunar";
  onChange: (next: BirthPrecisionValues) => void;
  compact?: boolean;
}

export default function BirthPrecisionFields({
  values,
  calendarType,
  onChange,
  compact = false,
}: BirthPrecisionFieldsProps) {
  const preset = BIRTHPLACE_PRESETS.find((item) => (
    item.timeZone === values.timeZone &&
    Math.abs(item.longitude - Number(values.longitude)) < 0.001
  ));

  const update = <K extends keyof BirthPrecisionValues>(key: K, value: BirthPrecisionValues[K]) => {
    onChange({ ...values, [key]: value });
  };

  const selectPreset = (key: string) => {
    const selected = BIRTHPLACE_PRESETS.find((item) => item.key === key);
    if (!selected) return;
    onChange({
      ...values,
      birthPlace: selected.label,
      timeZone: selected.timeZone,
      longitude: String(selected.longitude),
      latitude: String(selected.latitude),
    });
  };

  return (
    <div className={cn("space-y-4 border border-primary/15 rounded-lg p-4", compact && "space-y-3 p-3")}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Sun className="w-4 h-4 text-primary shrink-0" />
          <Label htmlFor="true-solar-time" className="text-sm font-medium">진태양시 보정</Label>
        </div>
        <Switch
          id="true-solar-time"
          checked={values.applyTrueSolarTime}
          onCheckedChange={(checked) => update("applyTrueSolarTime", checked)}
        />
      </div>

      {values.applyTrueSolarTime && (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" />출생지
            </Label>
            <Select value={preset?.key ?? "custom"} onValueChange={selectPreset}>
              <SelectTrigger className="bg-input/40 border-primary/20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BIRTHPLACE_PRESETS.map((item) => (
                  <SelectItem key={item.key} value={item.key}>{item.label}</SelectItem>
                ))}
                <SelectItem value="custom">직접 입력</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {!preset && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">도시</Label>
                <Input value={values.birthPlace} onChange={(event) => update("birthPlace", event.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">IANA 시간대</Label>
                <Input value={values.timeZone} onChange={(event) => update("timeZone", event.target.value)} placeholder="Asia/Seoul" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">경도</Label>
                <Input type="number" step="0.0001" min={-180} max={180} value={values.longitude} onChange={(event) => update("longitude", event.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">위도</Label>
                <Input type="number" step="0.0001" min={-90} max={90} value={values.latitude} onChange={(event) => update("latitude", event.target.value)} />
              </div>
            </div>
          )}
        </div>
      )}

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Clock3 className="w-3.5 h-3.5" />일주 변경 기준
        </Label>
        <div className="grid grid-cols-2 border border-primary/20 rounded-lg overflow-hidden">
          {([
            ["midnight", "자정 00:00"],
            ["late-zi", "야자시 23:00"],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => update("dayBoundary", value)}
              className={cn(
                "min-h-9 px-2 text-xs font-medium transition-colors",
                values.dayBoundary === value
                  ? "bg-primary text-primary-foreground"
                  : "bg-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {calendarType === "lunar" && (
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="lunar-leap-month" className="text-sm">윤달</Label>
          <Switch
            id="lunar-leap-month"
            checked={values.isLeapMonth}
            onCheckedChange={(checked) => update("isLeapMonth", checked)}
          />
        </div>
      )}
    </div>
  );
}
