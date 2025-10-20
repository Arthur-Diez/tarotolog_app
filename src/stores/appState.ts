import { create } from "zustand";

import { initWebApp, type InitWebAppResponse } from "@/lib/api";
import { getTelegramWebApp, type TelegramUser } from "@/lib/telegram";

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
      const webApp = getTelegramWebApp();
      const tgUser = webApp?.initDataUnsafe?.user;
      const session =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("session")
          : null;

      if (!tgUser || !session) {
        throw new Error("Недостаточно данных для инициализации");
      }

      const response = await initWebApp({
        telegram_id: tgUser.id,
        username: tgUser.username ?? "",
        first_name: tgUser.first_name ?? "",
        last_name: tgUser.last_name ?? "",
        language_code: tgUser.language_code ?? "",
        session
      });

      set({
        status: "ready",
        user: response.user,
        settings: response.settings,
        telegramUser: tgUser,
        error: null
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Неизвестная ошибка";
      set({ status: "error", error: message });
    }
  }
}));
