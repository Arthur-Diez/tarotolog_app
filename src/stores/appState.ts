import WebApp from "@twa-dev/sdk";
import { create } from "zustand";

import { authWebApp, type AuthWebAppResponse } from "@/lib/api";
import type { TelegramUser } from "@/lib/telegram";

type InitStatus = "idle" | "loading" | "ready" | "error";

interface AppState {
  status: InitStatus;
  error: string | null;
  user: AuthWebAppResponse["user"] | null;
  settings: AuthWebAppResponse["settings"] | null;
  telegramUser: TelegramUser | null;
  initialize: () => Promise<void>;
}

export const useAppState = create<AppState>((set, get) => ({
  status: "idle",
  error: null,
  user: null,
  settings: null,
  telegramUser: null,
  initialize: async () => {
    const { status } = get();
    if (status === "loading" || status === "ready") {
      return;
    }

    set({ status: "loading", error: null });

    try {
      const tgUser = WebApp?.initDataUnsafe?.user ?? null;
      if (!tgUser?.id) {
        throw new Error("Пожалуйста, откройте приложение через Telegram");
      }

      const safeUser = tgUser as TelegramUser & { id: number };

      const response = await authWebApp({
        telegram_id: safeUser.id,
        username: safeUser.username ?? null,
        first_name: safeUser.first_name ?? null,
        last_name: safeUser.last_name ?? null,
        language_code: safeUser.language_code ?? "ru"
      });

      set({
        status: "ready",
        user: response.user,
        settings: response.settings,
        telegramUser: {
          id: safeUser.id,
          username: safeUser.username ?? undefined,
          first_name: safeUser.first_name ?? undefined,
          last_name: safeUser.last_name ?? undefined,
          language_code: safeUser.language_code ?? undefined
        },
        error: null,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Неизвестная ошибка";
      console.error("[Tarotolog] App initialization failed:", message);
      set({
        status: "error",
        error: message,
        user: null,
        settings: null,
        telegramUser: null,
      });
    }
  },
}));
