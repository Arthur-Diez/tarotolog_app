import { create } from "zustand";

import {
  DEFAULT_WIDGET_KEYS,
  WIDGET_KEYS,
  type ProfileResponse,
  type UpdateProfilePayload,
  type WidgetKey,
  getProfile,
  updateProfile
} from "@/lib/api";

type ProfileStatus = "idle" | "loading" | "ready";

interface ProfileState {
  loading: boolean;
  saving: boolean;
  error: string | null;
  saveError: string | null;
  profile: ProfileResponse | null;
  status: ProfileStatus;
  fetchProfile: () => Promise<void>;
  saveProfile: (payload: UpdateProfilePayload) => Promise<ProfileResponse | null>;
  clearSaveError: () => void;
}

const allowedWidgets = new Set<WidgetKey>(WIDGET_KEYS);

export function normalizeWidgets(widgets: WidgetKey[] | null | undefined): WidgetKey[] {
  if (!Array.isArray(widgets) || widgets.length === 0) {
    return [...DEFAULT_WIDGET_KEYS];
  }

  const filtered = widgets.filter((widget): widget is WidgetKey => allowedWidgets.has(widget));
  return filtered.length > 0 ? filtered : [...DEFAULT_WIDGET_KEYS];
}

export const useProfileState = create<ProfileState>((set) => ({
  loading: false,
  saving: false,
  error: null,
  saveError: null,
  profile: null,
  status: "idle",
  fetchProfile: async () => {
    set({ loading: true, error: null, status: "loading" });
    try {
      const response = await getProfile();
      set({ profile: response, loading: false, status: "ready", error: null });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Неизвестная ошибка";
      console.error("[Tarotolog] Не удалось получить профиль:", message);
      set({ loading: false, error: message, status: "idle" });
    }
  },
  saveProfile: async (payload: UpdateProfilePayload) => {
    set({ saving: true, saveError: null });
    try {
      const response = await updateProfile(payload);
      set({
        profile: response,
        saving: false,
        status: "ready",
        saveError: null,
        error: null
      });
      return response;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Неизвестная ошибка";
      console.error("[Tarotolog] Не удалось обновить профиль:", message);
      set({ saving: false, saveError: message });
      return null;
    }
  },
  clearSaveError: () => {
    set({ saveError: null });
  }
}));
