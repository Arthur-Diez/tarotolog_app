import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { formatTimezoneLabel, formatTimezoneOffset } from "@/lib/timezone";

interface TimezoneOption {
  id: string;
  offsetMin: number;
  offsetLabel: string;
  cityLabel: string;
  searchText: string;
}

const CITY_NAME_OVERRIDES: Record<string, { ru?: string; en?: string }> = {
  "Europe/Moscow": { ru: "Москва", en: "Moscow" },
  "Europe/Minsk": { ru: "Минск", en: "Minsk" },
  "Asia/Yerevan": { ru: "Ереван", en: "Yerevan" },
  "Asia/Almaty": { ru: "Алматы", en: "Almaty" },
  "Europe/Kyiv": { ru: "Киев", en: "Kyiv" },
  "Europe/Berlin": { ru: "Берлин", en: "Berlin" },
  "Europe/Paris": { ru: "Париж", en: "Paris" },
  "Europe/London": { ru: "Лондон", en: "London" },
  "America/New_York": { ru: "Нью-Йорк", en: "New York" },
  "America/Los_Angeles": { ru: "Лос-Анджелес", en: "Los Angeles" },
  "Asia/Dubai": { ru: "Дубай", en: "Dubai" },
  "Asia/Tokyo": { ru: "Токио", en: "Tokyo" }
};

function getAllTimezones(): string[] {
  const intl = Intl as typeof Intl & { supportedValuesOf?: (key: string) => string[] };
  if (typeof intl.supportedValuesOf === "function") {
    try {
      return intl.supportedValuesOf("timeZone");
    } catch {
      // ignore
    }
  }

  return [
    "Europe/Moscow",
    "Europe/Minsk",
    "Asia/Yerevan",
    "Asia/Almaty",
    "Asia/Tokyo",
    "Europe/London",
    "Europe/Berlin",
    "Europe/Paris",
    "America/New_York",
    "America/Los_Angeles",
    "Asia/Dubai",
    "Pacific/Honolulu",
    "Etc/GMT"
  ];
}

function calculateOffsetMinutes(zone: string): number {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: zone,
      timeZoneName: "short"
    });
    const parts = formatter.formatToParts(new Date());
    const tz = parts.find((part) => part.type === "timeZoneName")?.value ?? "";
    const match = tz.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
    if (match) {
      const sign = match[1] === "-" ? -1 : 1;
      const hours = parseInt(match[2] ?? "0", 10);
      const minutes = parseInt(match[3] ?? "0", 10);
      return sign * (hours * 60 + minutes);
    }
  } catch {
    // ignore
  }
  return -new Date().getTimezoneOffset();
}

function buildCityLabel(timezone: string): string {
  const override = CITY_NAME_OVERRIDES[timezone];
  const segment = timezone.split("/").pop()?.replace(/_/g, " ") ?? timezone;
  const english = override?.en ?? segment;
  const russian = override?.ru;

  if (russian && russian.toLowerCase() !== english.toLowerCase()) {
    return `${russian} / ${english}`;
  }
  return english;
}

function buildTimezoneOptions(): TimezoneOption[] {
  const zones = getAllTimezones();
  return zones
    .map((zone) => {
      const offsetMin = calculateOffsetMinutes(zone);
      const offsetLabel = formatTimezoneOffset(offsetMin) || "UTC";
      const cityLabel = buildCityLabel(zone);
      const normalized = `${cityLabel} ${zone} ${offsetLabel}`.toLowerCase();
      return {
        id: zone,
        offsetMin,
        offsetLabel,
        cityLabel,
        searchText: normalized
      };
    })
    .sort((a, b) => {
      if (a.offsetMin === b.offsetMin) {
        return a.cityLabel.localeCompare(b.cityLabel, "en");
      }
      return a.offsetMin - b.offsetMin;
    });
}

export interface TimezoneSelectorUnifiedProps {
  open: boolean;
  currentTimezoneName?: string | null;
  currentTimezoneOffset?: number | null;
  onClose: () => void;
  onSelect: (name: string, offsetMin: number) => void;
}

export function TimezoneSelectorUnified({
  open,
  currentTimezoneName,
  currentTimezoneOffset,
  onClose,
  onSelect
}: TimezoneSelectorUnifiedProps) {
  const [search, setSearch] = useState("");
  const listRef = useRef<HTMLDivElement | null>(null);
  const options = useMemo(() => buildTimezoneOptions(), []);
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return options;
    return options.filter((option) => option.searchText.includes(query));
  }, [options, search]);

  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => {
      const container = listRef.current;
      if (!container) return;
      const activeId = currentTimezoneName ?? null;
      if (!activeId) return;
      const escaped =
        typeof window !== "undefined" && window.CSS && typeof window.CSS.escape === "function"
          ? window.CSS.escape(activeId)
          : activeId.replace(/"/g, '\\"');
      const target = container.querySelector<HTMLElement>(`[data-timezone="${escaped}"]`);
      if (!target) return;
      const offsetTop = target.offsetTop - container.clientHeight / 2 + target.clientHeight / 2;
      container.scrollTo({
        top: Math.max(offsetTop, 0),
        behavior: "smooth"
      });
    });
  }, [open, currentTimezoneName, filtered]);

  useEffect(() => {
    if (!open) {
      setSearch("");
    }
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6 backdrop-blur-lg">
      <div className="relative w-full max-w-[460px] rounded-[32px] border border-white/10 bg-[var(--bg-card)]/95 p-6 shadow-[0_40px_80px_rgba(0,0,0,0.65)]">
        <div className="space-y-3 text-center">
          <p className="text-xs uppercase tracking-[0.35em] text-[var(--text-tertiary)]">Время</p>
          <h3 className="text-2xl font-semibold text-[var(--text-primary)]">Выберите ваш часовой пояс</h3>
          {currentTimezoneName ? (
            <p className="text-sm text-[var(--text-secondary)]">
              Сейчас: {formatTimezoneLabel(currentTimezoneName, currentTimezoneOffset)}
            </p>
          ) : null}
        </div>

        <div className="mt-6">
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Найти город, UTC или ID…"
              className="w-full rounded-[20px] border border-white/15 bg-white/5 px-4 py-3 text-base text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-pink)]"
            />
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]">
              🔍
            </span>
          </div>
        </div>

        <div
          ref={listRef}
          className="mt-5 max-h-[60vh] overflow-y-auto pr-1"
        >
          <div className="space-y-3">
            {filtered.map((option) => {
              const isActive = currentTimezoneName === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  data-timezone={option.id}
                  onClick={() => onSelect(option.id, option.offsetMin)}
                  className={`w-full rounded-[20px] border px-4 py-3 text-left transition ${
                    isActive
                      ? "border-[rgba(217,194,163,0.45)] bg-white/10 shadow-[inset_0_0_18px_rgba(217,194,163,0.18)]"
                      : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/8"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-lg font-semibold text-[var(--text-primary)]">{option.cityLabel}</p>
                    <span className="text-sm font-semibold text-[var(--accent-gold)]">{option.offsetLabel}</span>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)]">{option.id}</p>
                </button>
              );
            })}
          </div>
        </div>

        <Button className="mt-6 w-full" variant="ghost" onClick={onClose}>
          Закрыть
        </Button>
      </div>
    </div>
  );
}
