import { useCallback, useMemo, useRef, useState, useEffect, useLayoutEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { AnimationPlaybackControls } from "framer-motion";
import { motion, useAnimate } from "framer-motion";

import { Button } from "@/components/ui/button";
import DealtCard from "@/components/tarot/DealtCard";
import { DeckStack } from "@/components/tarot/DeckStack";
import { LoadingTarot } from "@/components/tarot/LoadingTarot";
import { useAdsgram } from "@/hooks/useAdsgram";
import { useEnergyBalance } from "@/hooks/useEnergyBalance";
import { useSpreadScale } from "@/hooks/useSpreadScale";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";
import {
  ApiError,
  createReading,
  getReading,
  viewReading,
  type BackendReadingStatus,
  type ViewReadingResponse
} from "@/lib/api";
import { backUrl } from "@/lib/cardAsset";
import { mapCardNameToCode } from "@/lib/cardCode";
import { isDeckWithReversals } from "@/lib/tarotOrientation";
import { useSpreadStore } from "@/stores/spreadStore";
import { SPREAD_SCHEMAS, SpreadOneCard, type SpreadSchema } from "@/data/spreadSchemas";
import type { SpreadId } from "@/data/rws_spreads";
import { DECKS } from "@/data/decks";
import { useDeckTheme } from "@/ui/useDeckTheme";
import "./SpreadPlayPage.css";

const DEAL_OFFSET = 96;
const COLLECT_DURATION = 2.8;
const SHUFFLE_DURATION = 3.8;
const HINT_DURATION = 0.5;
const QUESTION_FLY_DURATION = 0.9;
const QUESTION_DISSOLVE_DURATION = 0.6;
const WAIT_AFTER_DEAL = 150;
const VIEW_POLL_INTERVAL = 2000;
const LONG_WAIT_THRESHOLD = 15000;
const READY_WITHOUT_PAYLOAD_RETRY_LIMIT = 3;
const LOADING_HINT_ROTATE_INTERVAL = 4500;
const KEYBOARD_VISIBLE_THRESHOLD_PX = 140;
const INTERPRETATION_LOADING_HINTS = [
  {
    message: "Читаем связи между картами",
    subMessage: "Собираем общий сюжет расклада и ключевые акценты"
  },
  {
    message: "Формируем интерпретацию",
    subMessage: "Учитываем позиции карт, вопрос и динамику расклада"
  },
  {
    message: "Уточняем практический совет",
    subMessage: "Подбираем ясные выводы без воды и драматизации"
  }
] as const;
const INTERPRETATION_LOADING_HINTS_LONG_WAIT = [
  {
    message: "Интерпретация требует больше времени",
    subMessage: "Расклад в работе, продолжаем ждать результат"
  },
  {
    message: "Детализируем ответ",
    subMessage: "Проверяем связность и глубину трактовки карт"
  },
  {
    message: "Почти готово",
    subMessage: "Скоро откроем финальную интерпретацию расклада"
  }
] as const;
const ADSGRAM_INTERSTITIAL_BLOCK_ID =
  (import.meta as { env?: Record<string, string> }).env?.VITE_ADSGRAM_INTERSTITIAL_ID ?? "int-22108";
const DEALT_CARD_HEIGHT = 240;
const DEALT_SPACER_MIN = 64;
const DEALT_SPACER_MAX_RATIO = 0.16;
const DECK_RISE_OFFSET = -24;
const QUESTION_BUBBLE_OFFSET = 0;
const QUESTION_BUBBLE_HEIGHT = 64;
const FLIP_HINT_GAP = 40;
const ORDER_WARNING_GAP = 26;
const ACTION_BUTTONS_GAP = 24;
const MAX_CONTAINER_WIDTH = 420;
const CONTAINER_PADDING = 32;
const MIN_AVAILABLE_WIDTH = 200;
const FAN_TARGET_WIDTH = 420;
const FAN_TARGET_FILL = 0.96;
const FAN_STAGE_MIN_SCALE = 0.7;
const FAN_STAGE_MAX_SCALE = 3;
const DEAL_STAGE_MAX_SCALE = 1.15;
const SCALE_EPSILON = 0.01;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const nextFrame = () =>
  new Promise<void>((resolve) => {
    if (typeof window === "undefined") {
      resolve();
      return;
    }
    window.requestAnimationFrame(() => resolve());
  });
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const isCoarsePointerDevice = () =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(pointer: coarse)").matches;
const isTelegramMiniAppClient = () =>
  typeof window !== "undefined" && Boolean(window.Telegram?.WebApp);
const isAndroidClient = () =>
  typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent);
const normalizeLocale = (value: string | null | undefined): string => {
  if (!value) return "ru";
  const normalized = value.trim().toLowerCase();
  if (!normalized) return "ru";
  const short = normalized.split(/[-_]/)[0];
  return short || "ru";
};

function usePrefersReducedMotion(): boolean {
  const [reducedMotion, setReducedMotion] = useState(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return undefined;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReducedMotion(media.matches);
    onChange();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  return reducedMotion;
}

const STATUS_TEXT: Record<BackendReadingStatus, string> = {
  pending: "Готовим расклад",
  queued: "Расклад в очереди",
  processing: "Расклад обрабатывается",
  ready: "Расклад готов",
  error: "Ошибка при подготовке"
};

export default function SpreadPlayPage() {
  const { spreadId } = useParams<{ spreadId?: SpreadId }>();
  const schema: SpreadSchema = (spreadId && SPREAD_SCHEMAS[spreadId]) || SpreadOneCard;

  const adsgram = useAdsgram();
  const { hasSubscription } = useSubscriptionStatus();
  const interstitialShownRef = useRef(false);
  const [viewportHeight, setViewportHeight] = useState(
    typeof window !== "undefined" ? window.innerHeight : 740
  );
  const [viewportWidth, setViewportWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : MAX_CONTAINER_WIDTH
  );

  const stage = useSpreadStore((state) => state.stage);
  const cards = useSpreadStore((state) => state.cards);
  const question = useSpreadStore((state) => state.question);
  const setQuestion = useSpreadStore((state) => state.setQuestion);
  const start = useSpreadStore((state) => state.startSpread);
  const openCard = useSpreadStore((state) => state.openCard);
  const hasOrderWarningShown = useSpreadStore((state) => state.hasOrderWarningShown);
  const highlightEnabled = useSpreadStore((state) => state.highlightEnabled);
  const expectedNextCardIndex = useSpreadStore((state) => state.expectedNextCardIndex);
  const checkOpeningAllowed = useSpreadStore((state) => state.checkOpeningAllowed);
  const markOrderWarningShown = useSpreadStore((state) => state.markOrderWarningShown);
  const disableHighlight = useSpreadStore((state) => state.disableHighlight);
  const resetStore = useSpreadStore((state) => state.reset);
  const setStage = useSpreadStore((state) => state.setStage);
  const setSchema = useSpreadStore((state) => state.setSchema);
  const readingId = useSpreadStore((state) => state.readingId);
  const backendStatus = useSpreadStore((state) => state.backendStatus);
  const setBackendMeta = useSpreadStore((state) => state.setBackendMeta);
  const setReadingResult = useSpreadStore((state) => state.setReadingResult);

  const [scope, animate] = useAnimate();
  const [isRunning, setIsRunning] = useState(false);
  const [isCinematicPause, setIsCinematicPause] = useState(false);
  const [burstVisible, setBurstVisible] = useState(false);
  const [burstKey, setBurstKey] = useState(0);
  const [energyFlash, setEnergyFlash] = useState(false);
  const [deckKey, setDeckKey] = useState(0);
  const [isViewLoading, setIsViewLoading] = useState(false);
  const [isLongWait, setIsLongWait] = useState(false);
  const [loadingHintIndex, setLoadingHintIndex] = useState(0);
  const [viewError, setViewError] = useState<string | null>(null);
  const [orderWarning, setOrderWarning] = useState<string | null>(null);
  const [isQuestionInputFocused, setIsQuestionInputFocused] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [isCoarsePointer, setIsCoarsePointer] = useState<boolean>(() => isCoarsePointerDevice());
  const [actionButtonsOffsetPx, setActionButtonsOffsetPx] = useState(0);
  const [bubbleTopInSpread, setBubbleTopInSpread] = useState(0);
  const [spreadCenterPx, setSpreadCenterPx] = useState<{ x: number; y: number } | null>(null);
  const questionBubbleRef = useRef<HTMLDivElement | null>(null);
  const questionFormRef = useRef<HTMLDivElement | null>(null);
  const spreadAreaRef = useRef<HTMLDivElement | null>(null);
  const fanCenterRef = useRef<HTMLDivElement | null>(null);
  const timelineTokenRef = useRef(0);
  const activeAnimationRef = useRef<AnimationPlaybackControls | null>(null);
  const pauseTimerRef = useRef<number | null>(null);
  const burstTimerRef = useRef<number | null>(null);
  const energyFlashTimerRef = useRef<number | null>(null);
  const prevEnergyRef = useRef<number | null>(null);
  const { energy, loading: energyLoading, error: energyError, reload: reloadEnergy, setEnergyBalance } =
    useEnergyBalance();
  const navigate = useNavigate();
  const showActionButtons = stage === "done";
  const hasOpenedAnyCard = cards.some((card) => card.isOpen);
  const hintVisible = stage === "await_open" && !hasOpenedAnyCard;
  const showForm = stage === "fan";
  const isLikelyMobileViewport = viewportWidth <= 900;
  const isTelegramMiniApp = isTelegramMiniAppClient();
  const isAndroid = isAndroidClient();
  const useForcedLiteFanByPlatform = isTelegramMiniApp && isAndroid;
  const useUltraLiteFanStage =
    showForm && !isRunning && (useForcedLiteFanByPlatform || isLikelyMobileViewport);
  const isInputPerformanceMode =
    showForm &&
    !isRunning &&
    (useForcedLiteFanByPlatform || isLikelyMobileViewport || isQuestionInputFocused || isKeyboardVisible);
  const useHardMobileInputMode = showForm && !isRunning && isLikelyMobileViewport && isInputPerformanceMode;
  const useSimplifiedQuestionStage =
    showForm && !isRunning && (isCoarsePointer || isLikelyMobileViewport);
  const showQuestionBubble = showForm && (!isInputPerformanceMode || isRunning);
  const prefersReducedMotion = usePrefersReducedMotion();
  const scale = useSpreadScale(schema, viewportHeight, showForm ? 360 : 260);
  const sceneScale = isInputPerformanceMode ? 1 : scale;
  const availableWidth = Math.max(
    MIN_AVAILABLE_WIDTH,
    Math.min(viewportWidth, MAX_CONTAINER_WIDTH) - CONTAINER_PADDING
  );
  const normalizedScale = Math.max(scale, SCALE_EPSILON);
  const fanVisualScale = (availableWidth * FAN_TARGET_FILL) / FAN_TARGET_WIDTH;
  const fanOuterScale = fanVisualScale / normalizedScale;
  const deckFitScale = availableWidth / (normalizedScale * FAN_TARGET_WIDTH);
  const dealOuterScale = deckFitScale >= 1 ? Math.min(DEAL_STAGE_MAX_SCALE, deckFitScale) : deckFitScale;
  const deckBaseScale =
    stage === "fan" || stage === "collecting" || stage === "shuffling"
      // Fan size is standardized across spreads by targeting fixed visible width.
      ? clamp(fanOuterScale, FAN_STAGE_MIN_SCALE, FAN_STAGE_MAX_SCALE)
      : dealOuterScale;
  const effectiveDeckScale = isInputPerformanceMode ? 1 : deckBaseScale;

  useDeckTheme(schema.deckType);

  const isFocusMode =
    isCinematicPause || stage === "collecting" || stage === "shuffling" || stage === "dealing";
  const shouldBlockInteractions = isFocusMode && stage !== "await_open" && stage !== "done";
  const interpretationHints = isLongWait ? INTERPRETATION_LOADING_HINTS_LONG_WAIT : INTERPRETATION_LOADING_HINTS;
  const loadingHint = interpretationHints[loadingHintIndex % interpretationHints.length];

  useEffect(() => {
    setSchema(schema);
  }, [schema, setSchema]);

  useEffect(() => {
    return () => {
      if (pauseTimerRef.current !== null) {
        window.clearTimeout(pauseTimerRef.current);
      }
      if (burstTimerRef.current !== null) {
        window.clearTimeout(burstTimerRef.current);
      }
      if (energyFlashTimerRef.current !== null) {
        window.clearTimeout(energyFlashTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (typeof energy !== "number") return;
    if (prevEnergyRef.current !== null && energy < prevEnergyRef.current) {
      setEnergyFlash(true);
      if (energyFlashTimerRef.current !== null) {
        window.clearTimeout(energyFlashTimerRef.current);
      }
      energyFlashTimerRef.current = window.setTimeout(() => {
        setEnergyFlash(false);
        energyFlashTimerRef.current = null;
      }, 420);
    }
    prevEnergyRef.current = energy;
  }, [energy]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const media = window.matchMedia("(pointer: coarse)");
    const onChange = () => setIsCoarsePointer(media.matches);
    onChange();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!isViewLoading) {
      setLoadingHintIndex(0);
      return;
    }
    setLoadingHintIndex(0);
    const timer = window.setInterval(() => {
      setLoadingHintIndex((value) => value + 1);
    }, LOADING_HINT_ROTATE_INTERVAL);
    return () => window.clearInterval(timer);
  }, [isViewLoading]);

  useEffect(() => {
    if (!isViewLoading || !isLongWait) return;
    setLoadingHintIndex(0);
  }, [isLongWait, isViewLoading]);

  const finishReading = useCallback(
    (response: ViewReadingResponse) => {
      if (!response.output_payload) {
        throw new Error("Интерпретация ещё не сформирована");
      }
      setReadingResult({
        summaryText: response.summary_text ?? "",
        outputPayload: response.output_payload,
        energySpent: response.energy_spent,
        balance: response.balance
      });
      setEnergyBalance(response.balance);
      navigate(`/reading/${response.id}`, { state: { reading: response } });
    },
    [navigate, setEnergyBalance, setReadingResult]
  );

  const backSrc = useMemo(() => backUrl(schema.deckType), [schema.deckType]);
  const trimmedQuestion = question.trim();

  const resetQuestionBubble = () => {
    const bubble = questionBubbleRef.current;
    if (!bubble) return;
    bubble.style.opacity = "";
    bubble.style.filter = "";
    bubble.style.transform = "";
  };

  const clearCinematicPause = useCallback(() => {
    if (pauseTimerRef.current !== null) {
      window.clearTimeout(pauseTimerRef.current);
      pauseTimerRef.current = null;
    }
    setIsCinematicPause(false);
  }, []);

  const triggerBurst = useCallback(() => {
    setBurstKey((value) => value + 1);
    setBurstVisible(true);
    if (burstTimerRef.current !== null) {
      window.clearTimeout(burstTimerRef.current);
    }
    burstTimerRef.current = window.setTimeout(() => {
      setBurstVisible(false);
      burstTimerRef.current = null;
    }, prefersReducedMotion ? 120 : 380);
  }, [prefersReducedMotion]);

  const stopActiveAnimation = useCallback(() => {
    if (!activeAnimationRef.current) return;
    activeAnimationRef.current.stop();
    activeAnimationRef.current = null;
  }, []);

  const animateAndTrack = useCallback(
    (...args: any[]) => {
      const controls = (animate as unknown as (...inner: any[]) => AnimationPlaybackControls)(...args);
      activeAnimationRef.current = controls;
      return controls;
    },
    [animate]
  );

  const cancelTimeline = useCallback(() => {
    timelineTokenRef.current += 1;
    stopActiveAnimation();
    setIsRunning(false);
    clearCinematicPause();
  }, [clearCinematicPause, stopActiveAnimation]);

  const resetDealHost = useCallback(() => {
    const host = scope.current?.querySelector(".deal-host") as HTMLElement | null;
    if (!host) return;
    void animateAndTrack(host, { y: -16, opacity: 0 }, { duration: 0 });
  }, [animateAndTrack, scope]);

  const resetHint = useCallback(() => {
    void animateAndTrack("#flipHint", { opacity: 0, y: 12 }, { duration: 0 });
    void animateAndTrack("#orderWarningHint", { opacity: 0, y: 8 }, { duration: 0 });
  }, [animateAndTrack]);

  const resetQuestionForm = useCallback(() => {
    void animateAndTrack("#questionForm", { opacity: 1, y: 0 }, { duration: 0 });
  }, [animateAndTrack]);

  const resetDeckScale = useCallback(() => {
    void animateAndTrack(".deck-outer", { scale: deckBaseScale }, { duration: 0 });
  }, [animateAndTrack, deckBaseScale]);

  const handleReset = () => {
    cancelTimeline();
    resetStore();
    setStage("fan");
    setQuestion("");
    setDeckKey((value) => value + 1);
    setViewError(null);
    setOrderWarning(null);
    setIsLongWait(false);
    setIsViewLoading(false);
    setBurstVisible(false);
    resetQuestionBubble();
    resetDealHost();
    resetHint();
    resetQuestionForm();
    resetDeckScale();
    void animateAndTrack(".deck", { y: 0 }, { duration: 0 });
  };

  useEffect(() => {
    if (stage === "fan" && !trimmedQuestion) {
      resetQuestionBubble();
    }
  }, [stage, trimmedQuestion]);

  useLayoutEffect(() => {
    const spreadRect = spreadAreaRef.current?.getBoundingClientRect();
    if (!spreadRect) return;
    setSpreadCenterPx({ x: spreadRect.width / 2, y: spreadRect.height / 2 });
  }, [scale, viewportHeight, viewportWidth, deckKey]);

  useLayoutEffect(() => {
    if (isInputPerformanceMode && !isRunning) {
      return;
    }
    if (!showForm) {
      return;
    }
    const spreadRect = spreadAreaRef.current?.getBoundingClientRect();
    const formRect = questionFormRef.current?.getBoundingClientRect();
    const deckEl = spreadAreaRef.current?.querySelector<HTMLElement>(".deck");
    const deckRect = deckEl?.getBoundingClientRect();
    if (!spreadRect || !formRect) return;
    const baseY = deckRect ? deckRect.bottom : spreadRect.bottom;
    const targetY = (baseY + formRect.top) / 2;
    const nextTop = targetY - spreadRect.top;
    if (Math.abs(nextTop - bubbleTopInSpread) > 1) {
      setBubbleTopInSpread(nextTop);
    }
  }, [bubbleTopInSpread, isInputPerformanceMode, isRunning, showForm, scale, viewportHeight, viewportWidth, trimmedQuestion]);

  const dissolveQuestion = useCallback(async () => {
    const bubble = questionBubbleRef.current;
    const target = fanCenterRef.current;
    if (!bubble || !target) {
      await animateAndTrack("#questionForm", { opacity: 0 }, { duration: 0 });
      return;
    }

    const bubbleRect = bubble.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const dx = targetRect.left + targetRect.width / 2 - (bubbleRect.left + bubbleRect.width / 2);
    const dy = targetRect.top + targetRect.height / 2 - (bubbleRect.top + bubbleRect.height / 2);

    await animateAndTrack([
      [
        bubble,
        { x: dx, y: dy, scale: 0.8, opacity: 0.85 },
        { duration: QUESTION_FLY_DURATION, ease: "easeInOut" }
      ],
      [bubble, { opacity: 0, filter: "blur(6px)" }, { duration: QUESTION_DISSOLVE_DURATION, ease: "easeInOut" }],
      [
        "#questionForm",
        { y: 40, opacity: 0 },
        { duration: QUESTION_DISSOLVE_DURATION, ease: "easeInOut", at: "<" }
      ]
    ]);
  }, [animateAndTrack]);

  useEffect(() => {
    if (stage === "fan" || stage === "collecting" || stage === "shuffling") {
      resetDeckScale();
    }
  }, [resetDeckScale, stage]);

  const runDealSequence = useCallback(async () => {
    await animateAndTrack([
      [".deck", { y: -32 }, { duration: 0.25, ease: "easeOut" }],
      [".deal-host", { y: DEAL_OFFSET, opacity: 1 }, { duration: 0.9, ease: "easeInOut" }],
      [".deck", { y: 0 }, { duration: 0.25, ease: "easeOut" }],
      [".deal-host", { y: DEAL_OFFSET }, { duration: 0 }]
    ]);
  }, [animateAndTrack]);

  const runTimeline = useCallback(async () => {
    if (!scope.current || !trimmedQuestion) return;
    const runToken = ++timelineTokenRef.current;
    setIsRunning(true);
    setIsQuestionInputFocused(false);
    setIsKeyboardVisible(false);
    await nextFrame();
    await nextFrame();

    const isActive = () => timelineTokenRef.current === runToken;

    try {
      await dissolveQuestion();
      if (!isActive()) return;

      setStage("collecting");
      await wait(COLLECT_DURATION * 1000);
      if (!isActive()) return;

      setStage("shuffling");
      await wait(SHUFFLE_DURATION * 1000);
      if (!isActive()) return;

      if (deckBaseScale > 1) {
        await animateAndTrack(
          ".deck-outer",
          { scale: 1 },
          { duration: 0.35, ease: "easeOut" }
        );
      }

      setStage("dealing");
      await runDealSequence();
      if (!isActive()) return;

      await wait(WAIT_AFTER_DEAL);
      if (!isActive()) return;

      if (!prefersReducedMotion) {
        setIsCinematicPause(true);
        await wait(320);
        if (!isActive()) return;
        setIsCinematicPause(false);
      }

      setStage("await_open");
      await animateAndTrack("#flipHint", { opacity: 1, y: 0 }, { duration: HINT_DURATION, ease: "easeOut" });
    } finally {
      if (isActive()) {
        setIsRunning(false);
        setIsCinematicPause(false);
        activeAnimationRef.current = null;
      }
    }
  }, [animateAndTrack, dissolveQuestion, prefersReducedMotion, runDealSequence, scope, setStage, trimmedQuestion]);

  const handleStart = async () => {
    if (!trimmedQuestion || isRunning) {
      if (!trimmedQuestion) {
        alert("Введите вопрос к картам");
      }
      return;
    }

    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    (document.activeElement as HTMLElement | null)?.blur?.();

    cancelTimeline();
    setViewError(null);
    setOrderWarning(null);
    setIsLongWait(false);
    setIsViewLoading(false);
    resetQuestionBubble();
    resetDealHost();
    resetHint();
    start(trimmedQuestion);

    await runTimeline();
  };

  const handleCardClick = async (positionIndex: number) => {
    if (isCinematicPause) return;
    if (stage !== "await_open" && stage !== "done") return;
    const { allowed, expected } = checkOpeningAllowed(positionIndex);
    if (!allowed) {
      const expectedCard = typeof expected === "number" ? `№${expected}` : "карту по порядку";
      setOrderWarning(`Сначала откройте ${expectedCard}. Дальше можно в любом порядке.`);
      if (!hasOrderWarningShown) {
        markOrderWarningShown();
      }
      return;
    }
    if (
      highlightEnabled &&
      hasOrderWarningShown &&
      typeof expected === "number" &&
      positionIndex !== expected
    ) {
      disableHighlight();
    }
    setOrderWarning(null);

    if (!prefersReducedMotion) {
      clearCinematicPause();
      setIsCinematicPause(true);
      await wait(320);
      setIsCinematicPause(false);
    }

    triggerBurst();
    openCard(positionIndex);
  };

  const handleInterpretationRequest = async () => {
    setViewError(null);
    setIsLongWait(false);
    setIsViewLoading(true);

    const startedAt = Date.now();
    let longWaitNotified = false;
    let readyWithoutPayloadRetries = 0;
    let retriedAfterProcessingTimeout = false;
    let ensuredReadingId = readingId;

    try {
      while (true) {
        if (!ensuredReadingId) {
          const snapshot = useSpreadStore.getState();
          const deckTitle =
            DECKS.find((deck) => deck.id === snapshot.schema.deckType)?.title ?? snapshot.schema.deckType;
          const interfaceLocale = normalizeLocale(
            window.Telegram?.WebApp?.initDataUnsafe?.user?.language_code ?? navigator.language ?? "ru"
          );
          const cardsPayload = snapshot.cards.map((card) => {
            const code = mapCardNameToCode(card.name, snapshot.schema.deckType);
            if (!code) {
              throw new Error("Не удалось определить код карты. Попробуйте заново.");
            }
            const positionLabel = snapshot.schema.positions.find(
              (position) => position.id === card.positionIndex
            )?.label;
            return {
              position_index: card.positionIndex,
              card_code: code,
              reversed: card.reversed,
              position_label: positionLabel,
              card_name: card.name
            };
          });

          const response = await createReading({
            type: "tarot",
            spread_id: snapshot.schema.id,
            spread_title: snapshot.schema.name,
            deck_id: snapshot.schema.deckType,
            deck_title: deckTitle,
            question: snapshot.question.trim(),
            locale: interfaceLocale,
            cards: cardsPayload
          });
          ensuredReadingId = response.id;
          setBackendMeta({ readingId: response.id, backendStatus: response.status });
        }

        if (!ensuredReadingId) {
          throw new Error("Не удалось создать расклад. Попробуйте снова.");
        }

        const reading = await getReading(ensuredReadingId);
        setBackendMeta({ backendStatus: reading.status, readingId: ensuredReadingId });

        if (reading.status === "ready") {
          const viewResponse = await viewReading(ensuredReadingId);
          if (viewResponse.output_payload) {
            finishReading({
              ...viewResponse,
              summary_text: viewResponse.summary_text ?? ""
            });
            return;
          }
          readyWithoutPayloadRetries += 1;
          if (readyWithoutPayloadRetries >= READY_WITHOUT_PAYLOAD_RETRY_LIMIT) {
            throw new Error(
              "Расклад помечен как готовый, но интерпретация пустая. Нажмите «Начать заново» и повторите расклад."
            );
          }
        } else {
          readyWithoutPayloadRetries = 0;
        }

        if (reading.status === "error") {
          const backendError = (reading.error || "").trim();
          const normalizedBackendError = backendError.toLowerCase();
          const isRetryableTimeout =
            normalizedBackendError === "reading_processing_timeout" ||
            normalizedBackendError.startsWith("processing_timeout_") ||
            normalizedBackendError.startsWith("openai_request_timeout_after_");

          if (isRetryableTimeout && !retriedAfterProcessingTimeout) {
            retriedAfterProcessingTimeout = true;
            ensuredReadingId = undefined;
            readyWithoutPayloadRetries = 0;
            setBackendMeta({ readingId: undefined, backendStatus: "pending" });
            await wait(900);
            continue;
          }

          throw new Error(backendError || "Произошла ошибка при подготовке расклада");
        }

        if (!longWaitNotified && Date.now() - startedAt >= LONG_WAIT_THRESHOLD) {
          longWaitNotified = true;
          setIsLongWait(true);
        }

        await wait(VIEW_POLL_INTERVAL);
      }
    } catch (error) {
      console.error(error);
      setBackendMeta({ backendStatus: "error", readingId: ensuredReadingId });
      if (error instanceof ApiError) {
        if (error.code === "not_enough_energy") {
          setViewError("Недостаточно энергии. Пополните баланс и попробуйте снова.");
        } else if (error.status === 401) {
          setViewError("Сессия невалидна. Перезапустите мини-приложение через Telegram.");
        } else {
          setViewError(error.message || "Не удалось получить интерпретацию");
        }
      } else {
        setViewError(error instanceof Error ? error.message : "Не удалось получить интерпретацию");
      }
    } finally {
      setIsViewLoading(false);
    }
  };

  const energyLabel = energyLoading ? "…" : energy ?? "—";
  const statusLabel = backendStatus ? STATUS_TEXT[backendStatus] : null;
  const deckSupportsReversals = isDeckWithReversals(schema.deckType);

  const orderMap = useMemo(() => {
    const map = new Map<number, number>();
    schema.openOrder.forEach((positionId, index) => {
      map.set(positionId, index + 1);
    });
    return map;
  }, [schema]);

  const cardsWithPosition = schema.positions.map((position, index) => ({
    position,
    card: cards[index],
    orderNumber: orderMap.get(position.id)
  }));

  const spreadLayoutHeight = useMemo(() => {
    if (!schema.positions.length) return DEALT_CARD_HEIGHT;
    const ys = schema.positions.map((position) => position.y);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const height = maxY - minY + DEALT_CARD_HEIGHT;
    return Math.max(DEALT_CARD_HEIGHT, height);
  }, [schema.positions]);

  const spreadMaxY = useMemo(() => {
    if (!schema.positions.length) return 0;
    return Math.max(...schema.positions.map((position) => position.y));
  }, [schema.positions]);
  const spreadMinY = useMemo(() => {
    if (!schema.positions.length) return 0;
    return Math.min(...schema.positions.map((position) => position.y));
  }, [schema.positions]);
  const spreadMaxX = useMemo(() => {
    if (!schema.positions.length) return 0;
    return Math.max(...schema.positions.map((position) => position.x));
  }, [schema.positions]);
  const spreadMinX = useMemo(() => {
    if (!schema.positions.length) return 0;
    return Math.min(...schema.positions.map((position) => position.x));
  }, [schema.positions]);
  const spreadCenterOffsetX = useMemo(() => (spreadMinX + spreadMaxX) / 2, [spreadMinX, spreadMaxX]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let rafId = 0;
    const handleResize = () => {
      if (rafId) {
        window.cancelAnimationFrame(rafId);
      }
      rafId = window.requestAnimationFrame(() => {
        setViewportWidth(window.innerWidth);
        if (!isInputPerformanceMode) {
          setViewportHeight(window.innerHeight);
        }
      });
    };
    window.addEventListener("resize", handleResize, { passive: true });
    return () => {
      window.removeEventListener("resize", handleResize);
      if (rafId) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, [isInputPerformanceMode]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport) return;
    const viewport = window.visualViewport;
    let rafId = 0;
    const updateKeyboardState = () => {
      if (rafId) {
        window.cancelAnimationFrame(rafId);
      }
      rafId = window.requestAnimationFrame(() => {
        const keyboardHeight = window.innerHeight - viewport.height;
        setIsKeyboardVisible(keyboardHeight > KEYBOARD_VISIBLE_THRESHOLD_PX);
      });
    };
    updateKeyboardState();
    viewport.addEventListener("resize", updateKeyboardState, { passive: true });
    viewport.addEventListener("scroll", updateKeyboardState, { passive: true });
    return () => {
      viewport.removeEventListener("resize", updateKeyboardState);
      viewport.removeEventListener("scroll", updateKeyboardState);
      if (rafId) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, []);

  const spreadSpacerHeight = useMemo(() => {
    if (showForm || showActionButtons) return 0;
    const target = Math.round(spreadLayoutHeight * scale + 24);
    const maxSpacer = Math.max(80, Math.round(viewportHeight * DEALT_SPACER_MAX_RATIO));
    return Math.min(Math.max(target, DEALT_SPACER_MIN), maxSpacer);
  }, [scale, showForm, showActionButtons, spreadLayoutHeight, viewportHeight]);

  const updateActionButtonsOffset = useCallback(() => {
    if (!showActionButtons) {
      if (actionButtonsOffsetPx !== 0) setActionButtonsOffsetPx(0);
      return;
    }
    const spreadRect = spreadAreaRef.current?.getBoundingClientRect();
    if (!spreadRect) return;
    const cards = spreadAreaRef.current?.querySelectorAll<HTMLElement>(".dealt-card");
    const slots = spreadAreaRef.current?.querySelectorAll<HTMLElement>(".spread-card-slot");
    const nodes = cards && cards.length > 0 ? cards : slots;
    if (!nodes || nodes.length === 0) return;
    let maxBottom = 0;
    nodes.forEach((node) => {
      const rect = node.getBoundingClientRect();
      if (rect.bottom > maxBottom) {
        maxBottom = rect.bottom;
      }
    });
    const desiredTop = maxBottom + ACTION_BUTTONS_GAP;
    const nextOffset = Math.max(0, desiredTop - spreadRect.bottom);
    if (Math.abs(nextOffset - actionButtonsOffsetPx) > 1) {
      setActionButtonsOffsetPx(nextOffset);
    }
  }, [actionButtonsOffsetPx, showActionButtons]);

  useLayoutEffect(() => {
    updateActionButtonsOffset();
    const target = spreadAreaRef.current;
    if (!target) return;
    const observer = new ResizeObserver(() => {
      updateActionButtonsOffset();
    });
    observer.observe(target);
    return () => observer.disconnect();
  }, [updateActionButtonsOffset]);

  const formGap = useMemo(() => {
    return showForm ? "clamp(4px, 1.5vh, 12px)" : "1.5rem";
  }, [showForm]);

  useEffect(() => {
    if (!isViewLoading) {
      interstitialShownRef.current = false;
      return;
    }
    if (hasSubscription) return;
    if (interstitialShownRef.current) return;

    interstitialShownRef.current = true;
    void adsgram
      .show({ blockId: ADSGRAM_INTERSTITIAL_BLOCK_ID })
      .then((result) => {
        console.info("interpretation: interstitial_result", result);
      })
      .catch((error) => {
        console.info("interpretation: interstitial_error", error);
      });
  }, [adsgram, hasSubscription, isViewLoading]);

  const questionHintText =
    schema.id === "one_card"
      ? "Сформулируйте запрос и получите энергию дня."
      : `${schema.cardCount} карт(ы) помогут раскрыть ваш вопрос и показать ключевые акценты.`;

  const questionFormNode = (
    <div
      id="questionForm"
      ref={questionFormRef}
      className={
        useUltraLiteFanStage
          ? "w-full space-y-4 rounded-2xl border border-[#24304a] bg-[#11182a] p-4"
          : `ritual-bottom-panel ritual-question-panel w-full space-y-4 rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur ${
              useSimplifiedQuestionStage ? "ritual-question-panel-simplified" : ""
            }`
      }
      style={{
        marginTop: useUltraLiteFanStage ? "0" : useSimplifiedQuestionStage ? "0" : "clamp(-10px, -2vh, -4px)"
      }}
    >
      <div className="space-y-1">
        <h1 className="text-wrap-anywhere text-xl font-semibold text-white">{schema.name}</h1>
        <p className="text-wrap-anywhere text-sm text-white/70">
          {questionHintText}
        </p>
      </div>
      <textarea
        placeholder="Введите ваш вопрос к картам..."
        className={
          useUltraLiteFanStage
            ? "h-32 w-full resize-none rounded-lg border border-[#2d3854] bg-[#0c1322] p-3 text-base leading-6 text-white placeholder:text-white/60 outline-none"
            : `ritual-question-input text-wrap-anywhere h-28 w-full rounded-2xl border border-white/20 bg-white/5 p-3 text-sm text-white placeholder:text-white/60 focus-visible:outline-none ${
                useSimplifiedQuestionStage ? "resize-none" : "resize-y"
              } ${useHardMobileInputMode ? "ritual-question-input-hard" : ""}`
        }
        value={question}
        onChange={(event) => setQuestion(event.target.value)}
        onFocus={() => setIsQuestionInputFocused(true)}
        onBlur={() => setIsQuestionInputFocused(false)}
      />
      {useUltraLiteFanStage ? (
        <button
          type="button"
          onClick={handleStart}
          disabled={isRunning || !trimmedQuestion}
          className="w-full rounded-xl border border-[#384766] bg-[#1a2338] px-4 py-3 text-base font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          Подтвердить вопрос
        </button>
      ) : (
        <Button onClick={handleStart} className="w-full text-base" disabled={isRunning || !trimmedQuestion}>
          Подтвердить вопрос
        </Button>
      )}
    </div>
  );

  if (useUltraLiteFanStage) {
    return (
      <div className="relative min-h-screen w-full overflow-hidden bg-[#0b1220] text-white">
        <div
          ref={scope}
          className="relative z-10 mx-auto flex min-h-[100svh] w-full max-w-xl flex-col items-center gap-3 px-4 pb-10 pt-4"
        >
          <div className="w-full rounded-2xl border border-white/10 bg-[#11192a] px-4 py-2 text-sm text-white/85">
            Энергия: {energyLabel} <span className="text-white/90">⚡</span>
            {energyError && (
              <button
                type="button"
                className="ml-3 text-xs font-semibold text-secondary underline"
                onClick={() => {
                  void reloadEnergy();
                }}
              >
                Обновить
              </button>
            )}
            {energyError && <p className="mt-1 text-xs text-red-200">{energyError}</p>}
          </div>
          <div className="w-full">{questionFormNode}</div>
          {viewError && <p className="text-center text-sm text-amber-300">{viewError}</p>}
        </div>
        {isViewLoading && (
          <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/70 px-6">
            <LoadingTarot message={loadingHint.message} subMessage={loadingHint.subMessage} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={`ritual-screen relative min-h-screen w-full overflow-hidden text-white ${isFocusMode ? "focusMode" : ""} ${isCinematicPause ? "cinematicPause" : ""} ${isInputPerformanceMode ? "performanceMode" : ""} ${useSimplifiedQuestionStage ? "questionStageSimplified" : ""} ${useHardMobileInputMode ? "hardInputMode" : ""}`}
    >
      <div className="ritual-environment pointer-events-none absolute inset-0" aria-hidden>
        <div className="ritual-haze" />
        <div className="ritual-vignette" />
        <div className="ritual-stardust">
          <span className="ritual-stardust-dot dot-1" />
          <span className="ritual-stardust-dot dot-2" />
          <span className="ritual-stardust-dot dot-3" />
          <span className="ritual-stardust-dot dot-4" />
          <span className="ritual-stardust-dot dot-5" />
          <span className="ritual-stardust-dot dot-6" />
        </div>
      </div>
      <div
        ref={scope}
        className="ritual-shell relative z-10 mx-auto flex min-h-[100svh] w-full max-w-xl flex-col items-center px-4 pb-10 pt-4"
        style={{
          perspective: useHardMobileInputMode ? "none" : "1200px",
          gap: formGap
        }}
      >
        <div className="ritual-topbar w-full">
          <div className={`ritual-topbar-inner rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 shadow-inner ${energyFlash ? "is-flash" : ""}`}>
            Энергия: {energyLabel} <span className="ritual-energy-icon">⚡</span>
            {energyError && (
              <button
                type="button"
                className="ml-3 text-xs font-semibold text-secondary underline"
                onClick={() => {
                  void reloadEnergy();
                }}
              >
                Обновить
              </button>
            )}
            {energyError && <p className="mt-1 text-xs text-red-200">{energyError}</p>}
          </div>
        </div>
        <div
          ref={spreadAreaRef}
          className="ritual-scene relative"
          style={{
            width: "100%",
            display: "flex",
            justifyContent: "center",
            marginTop: showForm ? `${6 / scale}px` : `${16 / scale}px`,
            pointerEvents: shouldBlockInteractions ? "none" : "auto"
          }}
        >
          <div
            className="ritual-scene-frame relative flex w-full flex-col items-center"
            style={{
              transform: useSimplifiedQuestionStage ? "none" : `scale(${sceneScale})`,
              transformOrigin: "center top",
              transformStyle: useSimplifiedQuestionStage ? "flat" : "preserve-3d"
            }}
          >
            <div className="ritual-scene-halo" aria-hidden />
            <div className="relative" style={{ transform: `translateY(${DECK_RISE_OFFSET}px)` }}>
              <div
                className="deck-outer ritual-deck-shell"
                style={{ transform: `scale(${effectiveDeckScale})`, transformOrigin: "center top" }}
              >
                <DeckStack
                  key={deckKey}
                  backSrc={backSrc}
                  mode={useSimplifiedQuestionStage ? "fan" : stage}
                  fanCenterRef={fanCenterRef}
                />
              </div>
            </div>
            <div className="dealt-layer pointer-events-none absolute left-1/2 top-1/2 z-[1100]">
              <motion.div
                className="deal-host absolute left-1/2 top-1/2 h-0 w-0 -translate-x-1/2 -translate-y-1/2"
                initial={{ y: -16, opacity: 0 }}
                style={{ willChange: "transform" }}
              >
                {cardsWithPosition.map(({ position, card, orderNumber }) => {
                    const isCelticCrossObstacle = schema.id === "celtic_cross" && position.id === 2;
                    const isWheelOfYear = schema.id === "wheel_of_year" || schema.id === "lenormand_wheel_of_year";
                    const isLenormandSquare = schema.id === "lenormand_square_9";
                    const isLenormandGrandTableau = schema.id === "lenormand_grand_tableau";
                    const isLenormandCenterFocus =
                      (schema.id === "lenormand_his_intentions" || schema.id === "lenormand_feelings_actions") &&
                      position.id === 3;
                    const lockCelticObstacleClick =
                      isCelticCrossObstacle &&
                      stage === "await_open" &&
                      !card?.isOpen &&
                      expectedNextCardIndex === 1;
                    const showOrderLabel =
                      !card?.isOpen &&
                      schema.openOrder.length > 1 &&
                      typeof orderNumber === "number" &&
                      !isLenormandGrandTableau;
                    const shouldHighlight =
                      stage === "await_open" &&
                      schema.openingRules === "in-order" &&
                      highlightEnabled &&
                      !card?.isOpen &&
                      typeof expectedNextCardIndex === "number" &&
                      expectedNextCardIndex === position.id;
                  return (
                    <div
                      key={position.id}
                      className="spread-card-slot pointer-events-auto absolute flex flex-col items-center"
                      style={{
                        left: position.x,
                        top: position.y,
                        transform: "translate(-50%, -50%)",
                        pointerEvents: lockCelticObstacleClick ? "none" : "auto",
                        zIndex: isLenormandCenterFocus ? 1210 : undefined
                      }}
                    >
                      {card && (
                        <div className="relative">
                          {showOrderLabel && (
                            <motion.div
                              initial={{ opacity: 0, y: -4 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="absolute -top-8 left-1/2 z-[1200] -translate-x-1/2 rounded-full bg-white/90 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-black shadow-[0_5px_15px_rgba(0,0,0,0.25)]"
                            >
                              №{orderNumber}
                            </motion.div>
                          )}
                          <div style={isCelticCrossObstacle ? { transform: "rotate(90deg)", transformOrigin: "center center" } : undefined}>
                            <DealtCard
                              backSrc={backSrc}
                              deckId={schema.deckType}
                              faceName={card.name}
                              isOpen={card.isOpen}
                              reversed={card.reversed}
                              className={
                                [
                                  shouldHighlight
                                    ? "ring-2 ring-emerald-400/90 shadow-[0_0_26px_rgba(52,211,153,0.65)]"
                                    : "",
                                  isWheelOfYear ? "h-36 w-22" : "",
                                  isLenormandSquare ? "h-52 w-31" : "",
                                  isLenormandGrandTableau ? "h-[116px] w-[72px]" : ""
                                ].join(" ")
                              }
                              onClick={() => handleCardClick(position.id)}
                            />
                          </div>
                        </div>
                      )}
                      {card?.isOpen && position.label.trim() ? (
                        <div className="mt-2 flex flex-col items-center gap-1">
                          <p className="text-xs text-white/70">{position.label}</p>
                          {deckSupportsReversals && card.reversed ? (
                            <p className="text-[11px] uppercase tracking-[0.18em] text-amber-200/85">Перевёрнутая</p>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </motion.div>
            </div>
            {burstVisible ? (
              <div className="ritual-burst-layer pointer-events-none absolute inset-0 z-[1120]" aria-hidden>
                <span key={burstKey} className="ritual-burst" />
              </div>
            ) : null}
          </div>
          <div className="pointer-events-none absolute inset-0 z-[1250]">
            <div
              className="absolute text-wrap-anywhere text-center text-white/85"
              style={{
                left: "50%",
                top: spreadCenterPx
                  ? `${spreadCenterPx.y + (spreadMinY - DEALT_CARD_HEIGHT / 2 - FLIP_HINT_GAP) * scale}px`
                  : "50%",
                transform: "translate(-50%, -50%)"
              }}
            >
              <motion.p
                id="flipHint"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: hintVisible ? 1 : 0, y: hintVisible ? 0 : 12 }}
                transition={{ duration: 0.25 }}
              >
                <span className="inline-block rounded-full bg-black/55 px-3 py-1 text-base sm:text-lg shadow-[0_8px_24px_rgba(0,0,0,0.35)]">
                  {deckSupportsReversals
                    ? "Нажмите на карту, чтобы открыть послание. Перевёрнутые карты учитываются."
                    : "Нажмите на карту, чтобы открыть послание"}
                </span>
              </motion.p>
            </div>
            <motion.p
              id="orderWarningHint"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: orderWarning ? 1 : 0, y: orderWarning ? 0 : 8 }}
              transition={{ duration: 0.2 }}
              className="absolute text-center text-amber-200"
              style={{
                left: spreadCenterPx ? `${spreadCenterPx.x + spreadCenterOffsetX * scale}px` : "50%",
                top: spreadCenterPx
                  ? `${spreadCenterPx.y + (spreadMaxY + DEALT_CARD_HEIGHT / 2 + ORDER_WARNING_GAP) * scale}px`
                  : "50%",
                transform: "translate(-50%, -50%)"
              }}
            >
              <span className="inline-block rounded-full bg-black/55 px-3 py-1 text-sm shadow-[0_8px_24px_rgba(0,0,0,0.35)]">
                {orderWarning || ""}
              </span>
            </motion.p>
            {showQuestionBubble && (
              <div
                id="questionBubble"
                className={`absolute text-wrap-anywhere text-center text-sm font-medium leading-snug text-white/90 transition-opacity ${
                  trimmedQuestion && showForm ? "opacity-100" : "opacity-0"
                }`}
                style={{
                  left: "50%",
                  top: `${bubbleTopInSpread}px`,
                  transform: "translate(-50%, -50%)"
                }}
              >
                <div ref={questionBubbleRef} className="inline-block">
                  <span className="inline-block max-w-[260px] rounded-2xl border border-white/25 bg-white/10 px-4 py-2 shadow-lg">
                    {trimmedQuestion || "Введите вопрос, чтобы начать"}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
        {showActionButtons && (
          <div className="ritual-bottom-panel ritual-action-panel w-full space-y-3" style={{ marginTop: `${actionButtonsOffsetPx}px` }}>
            <Button
              variant="outline"
              className="w-full"
              disabled={isViewLoading}
              onClick={handleInterpretationRequest}
            >
              {isViewLoading ? "Загружаем интерпретацию..." : "Получить интерпретацию расклада"}
            </Button>
            {statusLabel && <p className="text-center text-sm text-white/70">Статус расклада: {statusLabel}</p>}
            <Button variant="ghost" className="w-full text-white/70" onClick={handleReset}>
              Начать заново
            </Button>
          </div>
        )}
        {showQuestionBubble && null}
        <div aria-hidden className="w-full" style={{ height: `${spreadSpacerHeight}px` }} />

        {showForm && !useSimplifiedQuestionStage && questionFormNode}
        {showForm && useSimplifiedQuestionStage && (
          <div className="w-full max-w-xl pt-2">
            {questionFormNode}
          </div>
        )}

        {viewError && <p className="text-center text-sm text-amber-300">{viewError}</p>}

      </div>
      {shouldBlockInteractions ? <div className="ritual-focus-blocker" aria-hidden /> : null}
      {isViewLoading && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/70 px-6 backdrop-blur">
          <LoadingTarot
            message={loadingHint.message}
            subMessage={loadingHint.subMessage}
          />
        </div>
      )}
    </div>
  );
}
