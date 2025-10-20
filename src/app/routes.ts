import type { LucideIcon } from "lucide-react";
import { HeartHandshake, LayoutList, Sparkles, User, Home } from "lucide-react";

export type TabRoute = {
  id: "home" | "spreads" | "compatibility" | "astrology" | "profile";
  label: string;
  icon: LucideIcon;
};

export const routes: TabRoute[] = [
  { id: "home", label: "Главная", icon: Home },
  { id: "spreads", label: "Расклады", icon: LayoutList },
  { id: "compatibility", label: "Совместимость", icon: HeartHandshake },
  { id: "astrology", label: "Астрология", icon: Sparkles },
  { id: "profile", label: "Профиль", icon: User }
];
