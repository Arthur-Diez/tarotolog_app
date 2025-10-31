import WebApp from "@twa-dev/sdk";
import { create } from "zustand";

import { initWebApp, type InitWebAppResponse } from "@/lib/api";
import type { TelegramUser } from "@/lib/telegram";

interface AppState {
  status: "idle" | "loading" | "ready" | "error";
  error: string | null;
  user: InitWebAppResponse["user"] | null;
  settings: InitWebAppResponse["settings"] | null;
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
      // 1. Достаём юзера из Telegram WebApp
      const tgUser = WebApp?.initDataUnsafe?.user ?? null;

      // 2. Достаём session из query-параметра
      const session =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("session")
          : null;

      // 3. Минимальная валидация
      const missing: string[] = [];
      if (!session) {
        missing.push("session");
      }
      if (!tgUser) {
        missing.push("telegram user");
      } else if (!tgUser.id) {
        missing.push("telegram_id");
      }

      if (missing.length > 0) {
        throw new Error(
          `Недостаточно данных для инициализации: ${missing.join(", ")}`
        );
      }

      // 4. Запрос к нашему API /api/init_webapp
      const response = await initWebApp({
        telegram_id: tgUser!.id,
        username: tgUser!.username ?? null,
        first_name: tgUser!.first_name ?? null,
        last_name: tgUser!.last_name ?? null,
        language_code: tgUser!.language_code ?? "ru",
        session,
      });

      // 5. Кладём всё в стор
      set({
        status: "ready",
        user: response.user,
        settings: response.settings,
        telegramUser: {
          id: tgUser!.id,
          username: tgUser!.username ?? undefined,
          first_name: tgUser!.first_name ?? undefined,
          last_name: tgUser!.last_name ?? undefined,
          language_code: tgUser!.language_code ?? undefined,
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
