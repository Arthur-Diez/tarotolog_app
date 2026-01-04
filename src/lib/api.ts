import type { SpreadId } from "@/data/rws_spreads";

// api.ts
export const API_BASE = "https://tarotapi.freakdev.site/api";

export const WIDGET_KEYS = [
  "card_of_day",
  "daily_spread",
  "individual_horoscope",
  "astro_forecast",
  "numerology_forecast"
] as const;

export type WidgetKey = (typeof WIDGET_KEYS)[number];
export const DEFAULT_WIDGET_KEYS: WidgetKey[] = ["card_of_day", "astro_forecast"];

export class ApiError extends Error {
  code?: string;
  status?: number;
  payload?: unknown;

  constructor(message: string, options?: { code?: string; status?: number; payload?: unknown }) {
    super(message);
    this.name = "ApiError";
    this.code = options?.code;
    this.status = options?.status;
    this.payload = options?.payload;
  }
}

// ====== ВСПОМОГАТЕЛЬНОЕ ======
function getInitData(): string {
  const initData = window.Telegram?.WebApp?.initData;
  if (!initData) {
    throw new Error("Не удалось получить данные Telegram WebApp. Откройте приложение через Telegram.");
  }
  return initData;
}

function getTelegramId(): number | null {
  // @ts-ignore
  const user = window?.Telegram?.WebApp?.initDataUnsafe?.user;
  return user?.id ?? null;
}

function withAuthHeaders(headers?: HeadersInit, includeJson = false): HeadersInit {
  const base: Record<string, string> = {
    "X-Telegram-Init-Data": getInitData()
  };
  if (includeJson) {
    base["Content-Type"] = "application/json";
  }
  return {
    ...base,
    ...headers
  };
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
  const maybeObject = typeof data === "object" && data !== null ? (data as Record<string, unknown>) : null;

  if (!res.ok) {
    const detail = maybeObject?.detail;
    const code =
      (typeof maybeObject?.code === "string" && maybeObject.code) ||
      (typeof detail === "object" && detail !== null && typeof (detail as Record<string, unknown>).code === "string"
        ? ((detail as Record<string, unknown>).code as string)
        : undefined);
    const msg =
      typeof data === "string"
        ? data
        : (typeof detail === "object" && detail !== null && typeof (detail as Record<string, unknown>).message === "string"
            ? ((detail as Record<string, unknown>).message as string)
            : (maybeObject?.message as string | undefined)) ?? `API Error: ${res.status}`;

    throw new ApiError(msg, { code, status: res.status, payload: data });
  }

  if (!maybeObject) {
    throw new ApiError("Некорректный ответ сервера", { status: res.status, payload: data });
  }

  return maybeObject as T;
}

// ====== ТИПЫ ПОД РЕАЛЬНЫЙ БЭКЕНД ======

// /api/init_webapp (оставляем как было у тебя)
export interface AuthWebAppPayload {
  telegram_id: number;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  language_code: string | null;
}
export interface AuthWebAppResponse {
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
  detected_country?: string | null;
  interface_language?: string | null;
  current_tz_name?: string | null;
  current_tz_offset_min?: number | null;
  current_tz_confirmed?: boolean | null;
}

export interface ProfileResponse {
  user: {
    display_name: string | null;
    energy_balance: number;
    lang: string | null;
    current_tz_name: string | null;
    current_tz_offset_min: number | null;
    current_tz_confirmed?: boolean | null;
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
  current_tz_name?: string | null;
  current_tz_offset_min?: number | null;
  current_tz_confirmed?: boolean;
  detected_lang_device?: string | null;
  detected_lang_telegram?: string | null;
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
    detected_country?: string | null;
    interface_language?: string | null;
    current_tz_name?: string | null;
    current_tz_offset_min?: number | null;
    current_tz_confirmed?: boolean | null;
  };
}

export type BackendReadingStatus = "pending" | "queued" | "processing" | "ready" | "error";

export interface ReadingViewCard {
  position_index: number;
  card_code: string;
  reversed: boolean;
  image_path?: string | null;
}

export interface ReadingOutputPayload {
  interpretation: string;
  cards: ReadingViewCard[];
  question: string;
  generated_at: string;
}

export interface CreateReadingCardInput {
  position_index: number;
  card_code: string;
  reversed: boolean;
}

export interface CreateReadingPayload {
  type: "tarot";
  spread_id: SpreadId;
  deck_id: "rws";
  question: string;
  cards: CreateReadingCardInput[];
  locale: string;
}

export interface CreateReadingResponse {
  id: string;
  status: BackendReadingStatus;
}

export interface ReadingResponse {
  id: string;
  status: BackendReadingStatus;
  input_payload: unknown;
  output_payload: ReadingOutputPayload | null;
  summary_text: string | null;
  energy_spent: number;
  balance?: number;
  error: string | null;
}

export interface ViewReadingResponse {
  id: string;
  status: BackendReadingStatus;
  output_payload: ReadingOutputPayload | null;
  summary_text: string | null;
  energy_spent: number;
  balance: number;
}

export interface EnergyBalanceResponse {
  energy_balance: number;
}

// ====== ВЫЗОВЫ API ======

export async function authWebApp(payload: AuthWebAppPayload): Promise<AuthWebAppResponse> {
  const res = await fetch(`${API_BASE}/webapp/auth`, {
    method: "POST",
    headers: withAuthHeaders(undefined, true),
    body: JSON.stringify(payload)
  });
  return handleResponse<AuthWebAppResponse>(res);
}

export async function getProfile(): Promise<ProfileResponse> {
  const res = await fetch(`${API_BASE}/profile`, {
    method: "GET",
    headers: withAuthHeaders()
  });
  return handleResponse<ProfileResponse>(res);
}

export async function updateProfile(payload: UpdateProfilePayload): Promise<ProfileResponse> {
  const telegram_id = getTelegramId();
  if (!telegram_id) throw new Error("Не найдены данные Telegram пользователя");

  const bodyPayload: Record<string, unknown> = {
    telegram_id
  };

  if (payload.display_name !== undefined) {
    bodyPayload.display_name = payload.display_name;
  }

  if (payload.lang !== undefined) {
    bodyPayload.lang = payload.lang;
  }

  if (payload.current_tz_name !== undefined) {
    bodyPayload.current_tz_name = payload.current_tz_name;
  }

  if (payload.current_tz_offset_min !== undefined) {
    bodyPayload.current_tz_offset_min = payload.current_tz_offset_min;
  }

  if (payload.current_tz_confirmed !== undefined) {
    bodyPayload.current_tz_confirmed = payload.current_tz_confirmed;
  }

  if (payload.detected_lang_device !== undefined) {
    bodyPayload.detected_lang_device = payload.detected_lang_device;
  }

  if (payload.detected_lang_telegram !== undefined) {
    bodyPayload.detected_lang_telegram = payload.detected_lang_telegram;
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
    headers: withAuthHeaders(undefined, true),
    body: JSON.stringify(bodyPayload)
  });
  return handleResponse<ProfileResponse>(res);
}

export async function createReading(payload: CreateReadingPayload): Promise<CreateReadingResponse> {
  const res = await fetch(`${API_BASE}/readings`, {
    method: "POST",
    headers: withAuthHeaders(undefined, true),
    body: JSON.stringify(payload)
  });
  return handleResponse<CreateReadingResponse>(res);
}

export async function getReading(readingId: string): Promise<ReadingResponse> {
  const res = await fetch(`${API_BASE}/readings/${readingId}`, {
    method: "GET",
    headers: withAuthHeaders()
  });
  return handleResponse<ReadingResponse>(res);
}

export async function viewReading(readingId: string): Promise<ViewReadingResponse> {
  const res = await fetch(`${API_BASE}/readings/${readingId}/view`, {
    method: "POST",
    headers: withAuthHeaders()
  });
  return handleResponse<ViewReadingResponse>(res);
}

export async function getEnergy(): Promise<EnergyBalanceResponse> {
  const res = await fetch(`${API_BASE}/profile/energy`, {
    method: "GET",
    headers: withAuthHeaders()
  });
  return handleResponse<EnergyBalanceResponse>(res);
}
