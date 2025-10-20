import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import HomeScreen from "@/pages/HomeScreen";
import { TabBar } from "@/components/layout/TabBar";
import { ErrorScreen } from "@/components/layout/ErrorScreen";
import { LoadingScreen } from "@/components/layout/LoadingScreen";
import type { TabRoute } from "./routes";
import { routes } from "./routes";
import { useAppState } from "@/stores/appState";

export default function App() {
  const [activeRoute, setActiveRoute] = useState<TabRoute["id"]>("home");
  const status = useAppState((state) => state.status);
  const error = useAppState((state) => state.error);
  const initialize = useAppState((state) => state.initialize);
  const settingsTheme = useAppState((state) => state.settings?.theme);

  useEffect(() => {
    if (!settingsTheme) return;
    if (settingsTheme === "light" || settingsTheme === "dark") {
      document.documentElement.classList.toggle("dark", settingsTheme === "dark");
    }
  }, [settingsTheme]);

  useEffect(() => {
    if (status === "idle") {
      void initialize();
    }
  }, [initialize, status]);

  if (status === "idle" || status === "loading") {
    return <LoadingScreen />;
  }

  if (status === "error") {
    return (
      <ErrorScreen
        message="Нет соединения с сервером Tarotolog"
        description={error ?? undefined}
        onRetry={() => {
          void initialize();
        }}
      />
    );
  }

  const content = useMemo(() => {
    switch (activeRoute) {
      case "home":
        return <HomeScreen />;
      case "spreads":
        return (
          <div className="glass-panel rounded-3xl p-6 text-center text-muted-foreground">
            Скоро тут появятся новые расклады ✨
          </div>
        );
      case "compatibility":
        return (
          <div className="glass-panel rounded-3xl p-6 text-center text-muted-foreground">
            Раздел совместимости в разработке 💞
          </div>
        );
      case "astrology":
        return (
          <div className="glass-panel rounded-3xl p-6 text-center text-muted-foreground">
            Здесь вскоре появятся астрологические прогнозы 🔮
          </div>
        );
      case "profile":
        return (
          <div className="glass-panel rounded-3xl p-6 text-center text-muted-foreground">
            Профиль и настройки будут доступны позже ⚙️
          </div>
        );
      default:
        return null;
    }
  }, [activeRoute]);

  return (
    <div className="mx-auto flex min-h-screen max-w-[420px] flex-col overflow-hidden bg-background px-4 pb-24 pt-6">
      <main className="flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeRoute}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="space-y-6 pb-6"
          >
            {content}
          </motion.div>
        </AnimatePresence>
      </main>
      <TabBar routes={routes} activeRouteId={activeRoute} onRouteChange={setActiveRoute} />
    </div>
  );
}
