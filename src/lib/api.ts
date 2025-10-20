export const API_BASE = "https://tarotapi.freakdev.site/api";

export interface InitWebAppPayload {
  telegram_id: number;
  username: string;
  first_name: string;
  last_name: string;
  language_code: string;
  session: string;
}

export interface InitWebAppResponse {
  user: {
    display_name: string;
    energy_balance: number;
    streak_days: number;
    birth_profile?: Record<string, unknown> | null;
  };
  settings: {
    notifications: boolean;
    theme: "light" | "dark" | string;
  };
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    throw new Error(`API Error: ${res.status}`);
  }

  return res.json() as Promise<T>;
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
