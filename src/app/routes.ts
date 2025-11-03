import type { LucideIcon } from "lucide-react";
import { CalendarDays, Home, NotebookPen, User, Zap } from "lucide-react";

export type TabRouteId = "home" | "calendar" | "energy" | "diary" | "profile";

export interface TabRoute {
  id: TabRouteId;
  label: string;
  icon: LucideIcon;
  path: string;
  isPrimary?: boolean;
}

export const routes: TabRoute[] = [
  { id: "home", label: "Главная", icon: Home, path: "/" },
  { id: "calendar", label: "Мой календарь", icon: CalendarDays, path: "/calendar" },
  { id: "energy", label: "Энергия", icon: Zap, path: "/energy", isPrimary: true },
  { id: "diary", label: "Дневник", icon: NotebookPen, path: "/diary" },
  { id: "profile", label: "Профиль", icon: User, path: "/profile" }
];
