import { useEffect, useMemo, useRef, useState } from "react";
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
import { DeckTransitionOverlay } from "@/ui/DeckTransitionOverlay";

const KEYBOARD_OPEN_THRESHOLD_PX = 140;

function isEditableElement(target: Element | null): target is HTMLElement {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  if (target.tagName === "TEXTAREA") return true;
  if (target.tagName !== "INPUT") return false;
  const input = target as HTMLInputElement;
  const blockedTypes = new Set([
    "button",
    "checkbox",
    "color",
    "file",
    "hidden",
    "image",
    "radio",
    "range",
    "reset",
    "submit"
  ]);
  return !blockedTypes.has(input.type);
}

export default function App() {
  const { status, user, settings, error, retry, telegramUser } = useAppInit();
  const settingsTheme = settings?.theme;
  const location = useLocation();
  const isSpreadPlayRoute = location.pathname.startsWith("/spreads/play/");
  const maxInnerHeightRef = useRef(typeof window !== "undefined" ? window.innerHeight : 0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
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

  useEffect(() => {
    if (!isSpreadPlayRoute || typeof window === "undefined") {
      setIsKeyboardVisible(false);
      return;
    }
    maxInnerHeightRef.current = window.innerHeight;
    const viewport = window.visualViewport;
    let rafId = 0;

    const updateKeyboardVisibility = () => {
      if (rafId) {
        window.cancelAnimationFrame(rafId);
      }
      rafId = window.requestAnimationFrame(() => {
        const activeElement = document.activeElement;
        const hasEditableFocus = isEditableElement(activeElement);
        const visualViewportDelta = viewport ? Math.max(0, window.innerHeight - viewport.height) : 0;
        maxInnerHeightRef.current = Math.max(maxInnerHeightRef.current, window.innerHeight);
        const layoutViewportDelta = Math.max(0, maxInnerHeightRef.current - window.innerHeight);
        const keyboardHeight = viewport ? visualViewportDelta : layoutViewportDelta;
        setIsKeyboardVisible(hasEditableFocus && keyboardHeight > KEYBOARD_OPEN_THRESHOLD_PX);
      });
    };

    updateKeyboardVisibility();
    window.addEventListener("focusin", updateKeyboardVisibility, { passive: true });
    window.addEventListener("focusout", updateKeyboardVisibility, { passive: true });
    window.addEventListener("resize", updateKeyboardVisibility, { passive: true });
    viewport?.addEventListener("resize", updateKeyboardVisibility, { passive: true });
    viewport?.addEventListener("scroll", updateKeyboardVisibility, { passive: true });

    return () => {
      window.removeEventListener("focusin", updateKeyboardVisibility);
      window.removeEventListener("focusout", updateKeyboardVisibility);
      window.removeEventListener("resize", updateKeyboardVisibility);
      viewport?.removeEventListener("resize", updateKeyboardVisibility);
      viewport?.removeEventListener("scroll", updateKeyboardVisibility);
      if (rafId) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, [isSpreadPlayRoute]);

  useEffect(() => {
    document.body.classList.toggle("spread-play-fullbleed", isSpreadPlayRoute);
    return () => {
      document.body.classList.remove("spread-play-fullbleed");
    };
  }, [isSpreadPlayRoute]);

  useEffect(() => {
    const shouldEnableKeyboardMode = isSpreadPlayRoute && isKeyboardVisible;
    document.body.classList.toggle("keyboard-open", shouldEnableKeyboardMode);
    return () => {
      document.body.classList.remove("keyboard-open");
    };
  }, [isKeyboardVisible, isSpreadPlayRoute]);

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

  const hideTabBar = isSpreadPlayRoute && isKeyboardVisible;

  return (
    <div
      className={`mx-auto flex min-h-screen max-w-[420px] flex-col overflow-hidden text-[var(--text-primary)] ${
        isSpreadPlayRoute ? "px-0 pt-0" : "px-4 pt-8"
      }`}
    >
      <main className="flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className={isSpreadPlayRoute ? "app-scroll" : "app-scroll space-y-6"}
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
      {!hideTabBar ? <TabBar routes={routes} /> : null}
      <DeckTransitionOverlay />
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
