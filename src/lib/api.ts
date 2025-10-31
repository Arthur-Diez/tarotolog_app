export const API_BASE = "https://tarotapi.freakdev.site/api";

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
