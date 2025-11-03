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

export interface InitWebAppPayload {
  telegram_id: number;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  language_code: string | null;
  session: string;
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

export interface UserProfile {
  first_name: string | null;
  last_name: string | null;
  birth_date: string | null;
  birth_time: string | null;
  birth_place: string | null;
  gender: "male" | "female" | "other" | null;
  is_premium: boolean;
  energy_balance: number;
}

export interface ProfileResponse {
  profile: UserProfile;
  widgets: WidgetKey[] | null;
}

export interface UpdateProfilePayload {
  first_name: string | null;
  last_name: string | null;
  birth_date: string | null;
  birth_time: string | null;
  birth_place: string | null;
  gender: "male" | "female" | "other" | null;
  is_premium: boolean;
  energy_balance: number;
  widgets: WidgetKey[];
}

async function parseResponse(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  const data = await parseResponse(res);

  if (!res.ok) {
    const message =
      typeof data === "string"
        ? data
        : typeof data === "object" && data !== null
          ? (data as { detail?: string; message?: string }).detail ??
            (data as { detail?: string; message?: string }).message
          : null;

    throw new Error(message || `API Error: ${res.status}`);
  }

  if (typeof data !== "object" || data === null) {
    throw new Error("Некорректный ответ сервера");
  }

  return data as T;
}

export async function initWebApp(payload: InitWebAppPayload): Promise<InitWebAppResponse> {
  try {
    const res = await fetch(`${API_BASE}/init_webapp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    return await handleResponse<InitWebAppResponse>(res);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(error.message || "API Error");
    }
    throw new Error("API Error");
  }
}

export async function getProfile(): Promise<ProfileResponse> {
  try {
    const res = await fetch(`${API_BASE}/profile`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json"
      }
    });

    return await handleResponse<ProfileResponse>(res);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(error.message || "API Error");
    }
    throw new Error("API Error");
  }
}

export async function updateProfile(payload: UpdateProfilePayload): Promise<ProfileResponse> {
  try {
    const res = await fetch(`${API_BASE}/profile/update`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    return await handleResponse<ProfileResponse>(res);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(error.message || "API Error");
    }
    throw new Error("API Error");
  }
}
