// api.ts
export const API_BASE = "https://tarotapi.freakdev.site/api";

export const WIDGET_KEYS = [
  "card_of_day",
  "daily_spread",
  "individual_horoscope",
  "astro_forecast",
  "numerology_forecast",
] as const;

export type WidgetKey = (typeof WIDGET_KEYS)[number];
export const DEFAULT_WIDGET_KEYS: WidgetKey[] = ["card_of_day", "astro_forecast"];

// ====== ВСПОМОГАТЕЛЬНОЕ ======
function getSessionFromUrl(): string | null {
  const u = new URL(window.location.href);
  return u.searchParams.get("session");
}

function getTelegramId(): number | null {
  // @ts-ignore
  const user = window?.Telegram?.WebApp?.initDataUnsafe?.user;
  return user?.id ?? null;
}

async function parseResponse(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  const data = await parseResponse(res);
  if (!res.ok) {
    const msg =
      typeof data === "string"
        ? data
        : (data as any)?.detail ?? (data as any)?.message ?? `API Error: ${res.status}`;
    throw new Error(msg);
  }
  if (typeof data !== "object" || data === null) {
    throw new Error("Некорректный ответ сервера");
  }
  return data as T;
}

// ====== ТИПЫ ПОД РЕАЛЬНЫЙ БЭКЕНД ======

// /api/init_webapp (оставляем как было у тебя)
export interface InitWebAppPayload {
  telegram_id: number;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  language_code: string | null;
  session: string; // UUID
}
export interface InitWebAppResponse {
  user: {
    display_name: string;
    energy_balance: number;
    lang: string | null;
  };
  settings: {
    notifications: boolean;
    theme: "light" | "dark" | "system";
  };
}

// /api/profile — то, что реально отдаёт бэкенд
export interface BirthProfile {
  full_name: string | null;
  birth_date: string | null;
  birth_time_local: string | null;
  birth_time_known: boolean;
  birth_place_text: string | null;
  birth_lat: number | null;
  birth_lon: number | null;
  birth_tz_name: string | null;
  birth_tz_offset_min: number | null;
  gender: "male" | "female" | "other" | null;
}

export interface ProfileResponse {
  user: {
    display_name: string | null;
    energy_balance: number;
    lang: string | null;
    telegram: {
      username: string | null;
      first_name: string | null;
      last_name: string | null;
      is_premium: boolean;
    };
  };
  preferences: {
    widgets: WidgetKey[];
  };
  birth_profile?: BirthProfile | null;
}

// /api/profile/update — то, что реально принимает бэкенд
export interface UpdateProfilePayload {
  display_name?: string | null;
  lang?: string | null;
  widgets?: WidgetKey[]; // массив строк!
  birth_profile?: {
    full_name?: string | null;
    birth_date?: string | null;
    birth_time_local?: string | null;
    birth_time_known?: boolean;
    birth_place_text?: string | null;
    birth_lat?: number | null;
    birth_lon?: number | null;
    birth_tz_name?: string | null;
    birth_tz_offset_min?: number | null;
    gender?: "male" | "female" | "other" | null;
  };
}

// ====== ВЫЗОВЫ API ======

export async function initWebApp(payload: InitWebAppPayload): Promise<InitWebAppResponse> {
  const res = await fetch(`${API_BASE}/init_webapp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleResponse<InitWebAppResponse>(res);
}

export async function getProfile(): Promise<ProfileResponse> {
  const session = getSessionFromUrl();
  const telegram_id = getTelegramId();
  if (!session || !telegram_id) throw new Error("Не найдены session или telegram_id");

  const url = `${API_BASE}/profile?telegram_id=${telegram_id}&session=${encodeURIComponent(
    session
  )}`;

  const res = await fetch(url, {
    method: "GET",
    // Origin браузер подставит сам; Content-Type на GET не нужен
  });
  return handleResponse<ProfileResponse>(res);
}

export async function updateProfile(payload: UpdateProfilePayload): Promise<ProfileResponse> {
  const session = getSessionFromUrl();
  const telegram_id = getTelegramId();
  if (!session || !telegram_id) throw new Error("Не найдены session или telegram_id");

  const bodyPayload: Record<string, unknown> = {
    telegram_id,
    session,
  };

  if (payload.display_name !== undefined) {
    bodyPayload.display_name = payload.display_name;
  }

  if (payload.lang !== undefined) {
    bodyPayload.lang = payload.lang;
  }

  if (payload.widgets !== undefined) {
    bodyPayload.widgets = payload.widgets;
  }

  if (payload.birth_profile) {
    const birthProfile = payload.birth_profile;

    const birthProfilePayload: Record<string, unknown> = {};
    ([
      "full_name",
      "birth_date",
      "birth_time_local",
      "birth_time_known",
      "birth_place_text",
      "birth_lat",
      "birth_lon",
      "birth_tz_name",
      "birth_tz_offset_min",
      "gender",
    ] as const).forEach((key) => {
      const v = (birthProfile as Record<string, unknown>)[key];
      if (v !== undefined) {
        birthProfilePayload[key] = v;
      }
    });

  if (Object.keys(birthProfilePayload).length > 0) {
    (bodyPayload as Record<string, unknown>).birth_profile = birthProfilePayload;
  }
}

  const res = await fetch(`${API_BASE}/profile/update`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(bodyPayload),
  });
  return handleResponse<ProfileResponse>(res);
}
