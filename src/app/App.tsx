import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";

import HomeScreen from "@/pages/HomeScreen";
import CalendarPage from "@/pages/CalendarPage";
import DiaryPage from "@/pages/DiaryPage";
import EnergyPage from "@/pages/EnergyPage";
import ProfilePage from "@/pages/ProfilePage";
import { TabBar } from "@/components/layout/TabBar";
import { ErrorScreen } from "@/components/layout/ErrorScreen";
import { LoadingScreen } from "@/components/layout/LoadingScreen";
import { routes } from "./routes";
import { useAppInit } from "@/hooks/useAppInit";
import { useProfile } from "@/hooks/useProfile";

export default function App() {
  const { status, user, settings, error, retry, telegramUser } = useAppInit();
  const settingsTheme = settings?.theme;
  const location = useLocation();
  const { loading: profileLoading, error: profileError, profile, refresh } = useProfile();

  useEffect(() => {
    if (settingsTheme === "light" || settingsTheme === "dark") {
      document.documentElement.classList.toggle("dark", settingsTheme === "dark");
    } else if (settingsTheme === "system") {
      document.documentElement.classList.remove("dark");
    }
  }, [settingsTheme]);

  const isInitLoading = status === "idle" || status === "loading";
  const isProfileLoading = profileLoading && !profile;

  if (isInitLoading || isProfileLoading) {
    return <LoadingScreen />;
  }

  if (status === "error") {
    return (
      <ErrorScreen
        message="Нет соединения с сервером Tarotolog"
        description={error ?? "Недостаточно данных для инициализации"}
        onRetry={() => {
          void retry();
        }}
      />
    );
  }

  if (profileError && !profile) {
    return (
      <ErrorScreen
        message="Не удалось загрузить профиль"
        description={profileError}
        onRetry={() => {
          void refresh();
        }}
      />
    );
  }

  if (!user || !settings) {
    return (
      <ErrorScreen
        message="Недостаточно данных для инициализации"
        description="API ответил без обязательных полей user/settings"
      />
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-[420px] flex-col overflow-hidden bg-background px-4 pb-24 pt-6">
      <main className="flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="space-y-6 pb-6"
          >
            <Routes location={location}>
              <Route path="/" element={<HomeScreen telegramUser={telegramUser} />} />
              <Route path="/calendar" element={<CalendarPage />} />
              <Route path="/energy" element={<EnergyPage />} />
              <Route path="/diary" element={<DiaryPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </motion.div>
        </AnimatePresence>
      </main>
      <TabBar routes={routes} />
    </div>
  );
}
