import { create } from "zustand";

import {
  DEFAULT_WIDGET_KEYS,
  type UpdateProfilePayload,
  type UserProfile,
  type WidgetKey,
  getProfile,
  updateProfile
} from "@/lib/api";

const ALLOWED_WIDGETS = new Set<WidgetKey>([
  "card_of_day",
  "daily_spread",
  "individual_horoscope",
  "astro_forecast",
  "numerology_forecast"
]);

interface ProfileState {
  status: "idle" | "loading" | "ready" | "error";
  saving: boolean;
  error: string | null;
  profile: UserProfile | null;
  widgets: WidgetKey[];
  fetchProfile: () => Promise<void>;
  saveProfile: (payload: UpdateProfilePayload) => Promise<UserProfile | null>;
}

function normalizeWidgets(widgets: WidgetKey[] | null | undefined): WidgetKey[] {
  if (!Array.isArray(widgets) || widgets.length === 0) {
    return [...DEFAULT_WIDGET_KEYS];
  }
  const filtered = widgets.filter((widget): widget is WidgetKey => ALLOWED_WIDGETS.has(widget));
  return filtered.length > 0 ? filtered : [...DEFAULT_WIDGET_KEYS];
}

export const useProfileState = create<ProfileState>((set) => ({
  status: "idle",
  saving: false,
  error: null,
  profile: null,
  widgets: [...DEFAULT_WIDGET_KEYS],
  fetchProfile: async () => {
    set({ status: "loading", error: null });
    try {
      const response = await getProfile();
      set({
        status: "ready",
        profile: response.profile,
        widgets: normalizeWidgets(response.widgets),
        error: null
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Неизвестная ошибка";
      set({ status: "error", error: message });
    }
  },
  saveProfile: async (payload: UpdateProfilePayload) => {
    set({ saving: true, error: null });
    try {
      const response = await updateProfile(payload);
      set({
        profile: response.profile,
        widgets: normalizeWidgets(response.widgets),
        saving: false,
        status: "ready",
        error: null
      });
      return response.profile;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Неизвестная ошибка";
      set({ saving: false, error: message });
      return null;
    }
  }
}));
