export interface TimezoneDetection {
  name: string | null;
  offset: number | null;
}

export function detectDeviceTimezone(): TimezoneDetection {
  let name: string | null = null;
  let offset: number | null = null;

  try {
    name = Intl.DateTimeFormat().resolvedOptions().timeZone ?? null;
  } catch {
    name = null;
  }

  try {
    offset = -new Date().getTimezoneOffset();
  } catch {
    offset = null;
  }

  return { name, offset };
}

export function formatTimezoneOffset(offsetMin: number | null | undefined): string {
  if (typeof offsetMin !== "number" || Number.isNaN(offsetMin)) {
    return "";
  }
  const hours = Math.trunc(offsetMin / 60);
  const minutes = Math.abs(offsetMin % 60);
  const sign = hours >= 0 ? "+" : "-";
  const absHours = Math.abs(hours).toString().padStart(2, "0");
  const mins = minutes === 0 ? "" : `:${minutes.toString().padStart(2, "0")}`;
  return `UTC${sign}${absHours}${mins}`;
}

export function formatTimezoneLabel(
  name: string | null | undefined,
  offsetMin: number | null | undefined,
  fallback = "Не указан"
): string {
  if (!name) return fallback;
  const pretty = name.split("/").pop()?.replace(/_/g, " ") ?? name;
  const offset = formatTimezoneOffset(offsetMin);
  return offset ? `${pretty} (${offset})` : pretty;
}
