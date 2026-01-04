import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";

import HomeScreen from "@/pages/HomeScreen";
import CalendarPage from "@/pages/CalendarPage";
import DiaryPage from "@/pages/DiaryPage";
import EnergyPage from "@/pages/EnergyPage";
import ProfilePage from "@/pages/ProfilePage";
import HoroscopePage from "@/pages/HoroscopePage";
import InterpretationPage from "@/pages/InterpretationPage";
import SpreadPlayPage from "@/pages/spreads/SpreadPlayPage";
import { TabBar } from "@/components/layout/TabBar";
import { ErrorScreen } from "@/components/layout/ErrorScreen";
import { LoadingScreen } from "@/components/layout/LoadingScreen";
import { routes } from "./routes";
import { useAppInit } from "@/hooks/useAppInit";
import { useProfile } from "@/hooks/useProfile";
import { useAutoTimezone } from "@/hooks/useAutoTimezone";
import { DecksScreen } from "@/screens/DecksScreen";
import { SpreadsScreen } from "@/screens/SpreadsScreen";
import { DECKS, type Deck, type DeckId } from "@/data/decks";

export default function App() {
  const { status, user, settings, error, retry, telegramUser } = useAppInit();
  const settingsTheme = settings?.theme;
  const location = useLocation();
  const { loading: profileLoading, error: profileError, profile, refresh } = useProfile();
  const [spreadsView, setSpreadsView] = useState<{ screen: "decks" | "spreads"; deckId?: DeckId }>(
    { screen: "decks" }
  );

  useAutoTimezone(profile);

  useEffect(() => {
    if (settingsTheme === "light" || settingsTheme === "dark") {
      document.documentElement.classList.toggle("dark", settingsTheme === "dark");
    } else if (settingsTheme === "system") {
      document.documentElement.classList.remove("dark");
    }
  }, [settingsTheme]);

  useEffect(() => {
    const applyTelegramTheme = () => {
      const scheme = window.Telegram?.WebApp?.colorScheme ?? "dark";
      document.documentElement.classList.toggle("tg-light", scheme === "light");
      document.documentElement.classList.toggle("tg-dark", scheme !== "light");
    };

    applyTelegramTheme();
    const tg = window.Telegram?.WebApp;
    tg?.onEvent?.("themeChanged", applyTelegramTheme);

    return () => {
      tg?.offEvent?.("themeChanged", applyTelegramTheme);
    };
  }, []);

  useEffect(() => {
    if (location.pathname !== "/spreads" && spreadsView.screen !== "decks") {
      setSpreadsView({ screen: "decks" });
    }
  }, [location.pathname, spreadsView.screen]);

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
    <div className="mx-auto flex min-h-screen max-w-[420px] flex-col overflow-hidden px-4 pb-28 pt-8 text-[var(--text-primary)]">
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
              <Route
                path="/spreads"
                element={
                  <SpreadsRoute
                    view={spreadsView}
                    onSelectDeck={(deckId) => setSpreadsView({ screen: "spreads", deckId })}
                    onBack={() => setSpreadsView({ screen: "decks" })}
                  />
                }
              />
              <Route path="/spreads/play/:spreadId" element={<SpreadPlayPage />} />
              <Route path="/reading/:id" element={<InterpretationPage />} />
              <Route path="/horoscope" element={<HoroscopePage />} />
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

interface SpreadsRouteProps {
  view: { screen: "decks" | "spreads"; deckId?: DeckId };
  onSelectDeck: (deckId: DeckId) => void;
  onBack: () => void;
}

function SpreadsRoute({ view, onSelectDeck, onBack }: SpreadsRouteProps) {
  const activeDeck: Deck | undefined = useMemo(
    () => (view.deckId ? DECKS.find((deck) => deck.id === view.deckId) : undefined),
    [view.deckId]
  );

  if (view.screen === "spreads" && activeDeck) {
    return <SpreadsScreen deck={activeDeck} onBack={onBack} />;
  }

  return <DecksScreen onSelectDeck={onSelectDeck} />;
}
