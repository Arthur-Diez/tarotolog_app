import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";

export interface TimezoneOption {
  label: string;
  value: string;
  offset: number;
}

const POPULAR_TIMEZONES: TimezoneOption[] = [
  { label: "Москва (UTC+3)", value: "Europe/Moscow", offset: 180 },
  { label: "Ереван (UTC+4)", value: "Asia/Yerevan", offset: 240 },
  { label: "Алматы (UTC+6)", value: "Asia/Almaty", offset: 360 },
  { label: "Минск (UTC+3)", value: "Europe/Minsk", offset: 180 },
  { label: "Киев (UTC+2)", value: "Europe/Kyiv", offset: 120 }
];

function getAllTimezones(): string[] {
  const intlWithSupport = Intl as typeof Intl & {
    supportedValuesOf?: (key: string) => string[];
  };
  if (typeof intlWithSupport.supportedValuesOf === "function") {
    try {
      return intlWithSupport.supportedValuesOf("timeZone");
    } catch {
      // ignore
    }
  }
  return POPULAR_TIMEZONES.map((tz) => tz.value);
}

function calculateOffsetMinutes(zone: string): number {
  try {
    const now = new Date();
    const zonedString = now.toLocaleString("en-US", { timeZone: zone });
    const zonedDate = new Date(zonedString);
    return Math.round((zonedDate.getTime() - now.getTime()) / 60000);
  } catch {
    return -new Date().getTimezoneOffset();
  }
}

function formatOffset(offset: number) {
  const hours = Math.trunc(offset / 60);
  const minutes = Math.abs(offset % 60);
  const sign = hours >= 0 ? "+" : "-";
  const absHours = Math.abs(hours).toString().padStart(2, "0");
  const mins = minutes === 0 ? "" : `:${minutes.toString().padStart(2, "0")}`;
  return `UTC${sign}${absHours}${mins}`;
}

function buildOptionFromZone(zone: string): TimezoneOption {
  const offset = calculateOffsetMinutes(zone);
  const prettyName = zone.split("/").pop()?.replace(/_/g, " ") ?? zone;
  return {
    label: `${prettyName} (${formatOffset(offset)})`,
    value: zone,
    offset
  };
}

export interface TimezoneSelectorProps {
  open: boolean;
  currentTimezone?: { name: string | null; offset: number | null };
  onClose: () => void;
  onSelect: (option: TimezoneOption) => void;
}

export function TimezoneSelector({ open, onClose, onSelect, currentTimezone }: TimezoneSelectorProps) {
  const [showAll, setShowAll] = useState(false);

  const fullTimezoneOptions = useMemo(() => {
    if (!showAll) return [];
    const zones = getAllTimezones();
    return zones.map((zone) => buildOptionFromZone(zone));
  }, [showAll]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6 backdrop-blur-lg">
      <div className="relative w-full max-w-[420px] rounded-[28px] border border-white/10 bg-[var(--bg-card)]/95 p-6 shadow-[0_40px_80px_rgba(0,0,0,0.65)]">
        <div className="space-y-2 text-center">
          <p className="text-xs uppercase tracking-[0.35em] text-[var(--text-tertiary)]">Времена</p>
          <h3 className="text-2xl font-semibold text-[var(--text-primary)]">Выберите ваш часовой пояс</h3>
          {currentTimezone?.name ? (
            <p className="text-sm text-[var(--text-secondary)]">
              Сейчас: {buildOptionFromZone(currentTimezone.name).label}
            </p>
          ) : null}
        </div>

        <div className="mt-6 space-y-3">
          {POPULAR_TIMEZONES.map((tz) => (
            <button
              key={tz.value}
              type="button"
              className="w-full rounded-[22px] border border-white/10 bg-white/5 px-4 py-3 text-left text-[var(--text-primary)] transition hover:border-white/30 hover:bg-white/10"
              onClick={() => onSelect(tz)}
            >
              <p className="text-lg font-semibold">{tz.label.split(" (")[0]}</p>
              <p className="text-sm text-[var(--text-secondary)]">{tz.label.match(/\(.*\)/)?.[0]}</p>
            </button>
          ))}
        </div>

        {!showAll ? (
          <Button className="mt-5 w-full" variant="outline" onClick={() => setShowAll(true)}>
            Показать полный список
          </Button>
        ) : (
          <div className="mt-5 max-h-64 overflow-y-auto rounded-[22px] border border-white/10 bg-white/5 p-3">
            <div className="space-y-2">
              {fullTimezoneOptions.map((tz) => (
                <button
                  key={tz.value}
                  type="button"
                  className="w-full rounded-[18px] px-3 py-2 text-left text-sm text-[var(--text-primary)] transition hover:bg-white/10"
                  onClick={() => onSelect(tz)}
                >
                  {tz.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <Button className="mt-6 w-full" variant="ghost" onClick={onClose}>
          Закрыть
        </Button>
      </div>
    </div>
  );
}
