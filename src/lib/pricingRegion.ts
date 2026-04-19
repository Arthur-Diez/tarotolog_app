export function normalizeLangBase(code: string | null | undefined): string | null {
  if (!code) return null;
  const trimmed = code.trim();
  if (!trimmed) return null;
  const base = trimmed.toLowerCase().split(/[-_]/)[0];
  return base || null;
}

export function detectCountryBySignals(params: {
  telegramCountry?: string | null;
  ipCountry?: string | null;
  telegramLang?: string | null;
  deviceLang?: string | null;
}): string {
  if (params.telegramCountry) {
    return params.telegramCountry.toUpperCase();
  }
  if (params.ipCountry) {
    return params.ipCountry.toUpperCase();
  }

  const telegramLang = normalizeLangBase(params.telegramLang ?? null);
  const deviceLang = normalizeLangBase(params.deviceLang ?? null);
  if (telegramLang === "ru" || deviceLang === "ru") {
    return "RU";
  }
  return "Unknown";
}

export function detectPricingConfidence(params: {
  ipCountry?: string | null;
  detectedCountry?: string | null;
}): "low" | "medium" | "high" {
  if (params.ipCountry) return "high";
  if (params.detectedCountry && params.detectedCountry !== "Unknown") return "medium";
  return "low";
}

export function getPricingTierLabel(tier: string | null | undefined): string {
  const normalized = (tier || "").trim().toUpperCase();
  if (normalized === "A") return "Tier A";
  if (normalized === "B") return "Tier B";
  if (normalized === "C") return "Tier C";
  return "Не определён";
}

export function getPricingSourceLabel(source: string | null | undefined): string {
  const normalized = (source || "").trim().toLowerCase();
  if (normalized === "user_confirmed") return "Подтверждено вами";
  if (normalized === "admin_overridden") return "Зафиксировано администратором";
  if (normalized === "auto_detected" || normalized === "legacy_auto") return "Определено автоматически";
  return "Не определено";
}
