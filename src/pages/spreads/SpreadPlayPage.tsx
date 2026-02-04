import { useCallback, useMemo, useRef, useState, useEffect } from "react";
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
import { backUrl, faceUrl } from "@/lib/cardAsset";
import { mapCardNameToCode } from "@/lib/cardCode";
import { useSpreadStore } from "@/stores/spreadStore";
import { SPREAD_SCHEMAS, SpreadOneCard, type SpreadSchema } from "@/data/spreadSchemas";
import type { SpreadId } from "@/data/rws_spreads";

const DEAL_OFFSET = 96;
const COLLECT_DURATION = 2.8;
const SHUFFLE_DURATION = 3.8;
const HINT_DURATION = 0.5;
const QUESTION_FLY_DURATION = 0.9;
const QUESTION_DISSOLVE_DURATION = 0.6;
const WAIT_AFTER_DEAL = 150;
const VIEW_POLL_INTERVAL = 2000;
const VIEW_POLL_TIMEOUT = 30000;
const LONG_WAIT_THRESHOLD = 15000;
const ADSGRAM_INTERSTITIAL_BLOCK_ID =
  (import.meta as { env?: Record<string, string> }).env?.VITE_ADSGRAM_INTERSTITIAL_ID ?? "int-22108";
const DEALT_CARD_HEIGHT = 240;
const DEALT_SPACER_MIN = 90;
const DEALT_SPACER_MAX_RATIO = 0.22;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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

  const stage = useSpreadStore((state) => state.stage);
  const cards = useSpreadStore((state) => state.cards);
  const question = useSpreadStore((state) => state.question);
  const setQuestion = useSpreadStore((state) => state.setQuestion);
  const start = useSpreadStore((state) => state.startSpread);
  const openCard = useSpreadStore((state) => state.openCard);
  const hasOrderWarningShown = useSpreadStore((state) => state.hasOrderWarningShown);
  const checkOpeningAllowed = useSpreadStore((state) => state.checkOpeningAllowed);
  const markOrderWarningShown = useSpreadStore((state) => state.markOrderWarningShown);
  const resetStore = useSpreadStore((state) => state.reset);
  const setStage = useSpreadStore((state) => state.setStage);
  const setSchema = useSpreadStore((state) => state.setSchema);
  const readingId = useSpreadStore((state) => state.readingId);
  const backendStatus = useSpreadStore((state) => state.backendStatus);
  const setBackendMeta = useSpreadStore((state) => state.setBackendMeta);
  const setReadingResult = useSpreadStore((state) => state.setReadingResult);

  const [scope, animate] = useAnimate();
  const [isRunning, setIsRunning] = useState(false);
  const [deckKey, setDeckKey] = useState(0);
  const [isViewLoading, setIsViewLoading] = useState(false);
  const [isLongWait, setIsLongWait] = useState(false);
  const [viewError, setViewError] = useState<string | null>(null);
  const [orderWarning, setOrderWarning] = useState<string | null>(null);
  const questionBubbleRef = useRef<HTMLDivElement | null>(null);
  const fanCenterRef = useRef<HTMLDivElement | null>(null);
  const timelineTokenRef = useRef(0);
  const activeAnimationRef = useRef<AnimationPlaybackControls | null>(null);
  const { energy, loading: energyLoading, error: energyError, reload: reloadEnergy, setEnergyBalance } =
    useEnergyBalance();
  const navigate = useNavigate();
  const scale = useSpreadScale(schema);

  useEffect(() => {
    setSchema(schema);
  }, [schema, setSchema]);

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
  const showActionButtons = stage === "done";
  const hintVisible = stage === "await_open";
  const showForm = stage === "fan";

  const resetQuestionBubble = () => {
    const bubble = questionBubbleRef.current;
    if (!bubble) return;
    bubble.style.opacity = "";
    bubble.style.filter = "";
    bubble.style.transform = "";
  };

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
  }, [stopActiveAnimation]);

  const resetDealHost = useCallback(() => {
    const host = scope.current?.querySelector(".deal-host") as HTMLElement | null;
    if (!host) return;
    void animateAndTrack(host, { y: -16, opacity: 0 }, { duration: 0 });
  }, [animateAndTrack, scope]);

  const resetHint = useCallback(() => {
    void animateAndTrack("#flipHint", { opacity: 0, y: 12 }, { duration: 0 });
  }, [animateAndTrack]);

  const resetQuestionForm = useCallback(() => {
    void animateAndTrack("#questionForm", { opacity: 1, y: 0 }, { duration: 0 });
  }, [animateAndTrack]);

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
    resetQuestionBubble();
    resetDealHost();
    resetHint();
    resetQuestionForm();
    void animateAndTrack(".deck", { y: 0 }, { duration: 0 });
  };

  useEffect(() => {
    if (stage === "fan" && !trimmedQuestion) {
      resetQuestionBubble();
    }
  }, [stage, trimmedQuestion]);

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
      [bubble, { x: dx, y: dy, scale: 0.92 }, { duration: QUESTION_FLY_DURATION, ease: "easeInOut" }],
      [bubble, { opacity: 0, filter: "blur(6px)" }, { duration: QUESTION_DISSOLVE_DURATION, ease: "easeInOut" }],
      [
        "#questionForm",
        { y: 40, opacity: 0 },
        { duration: QUESTION_DISSOLVE_DURATION, ease: "easeInOut", at: "<" }
      ]
    ]);
  }, [animateAndTrack]);

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

      setStage("dealing");
      await runDealSequence();
      if (!isActive()) return;

      await wait(WAIT_AFTER_DEAL);
      if (!isActive()) return;

      setStage("await_open");
      await animateAndTrack("#flipHint", { opacity: 1, y: 0 }, { duration: HINT_DURATION, ease: "easeOut" });
    } finally {
      if (isActive()) {
        setIsRunning(false);
        activeAnimationRef.current = null;
      }
    }
  }, [animateAndTrack, dissolveQuestion, runDealSequence, scope, setStage, trimmedQuestion]);

  const handleStart = async () => {
    if (!trimmedQuestion || isRunning) {
      if (!trimmedQuestion) {
        alert("Введите вопрос к картам");
      }
      return;
    }

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

  const handleCardClick = (positionIndex: number) => {
    if (stage !== "await_open" && stage !== "done") return;
    const { allowed } = checkOpeningAllowed(positionIndex);
    if (!allowed) {
      setOrderWarning("Открывайте карты по порядку: сначала №1, затем №2, затем №3");
      if (!hasOrderWarningShown) {
        markOrderWarningShown();
      }
      return;
    }
    setOrderWarning(null);
    openCard(positionIndex);
  };

  const handleInterpretationRequest = async () => {
    setViewError(null);
    setIsLongWait(false);
    setIsViewLoading(true);

    const startedAt = Date.now();
    let ensuredReadingId = readingId;

    try {
      if (!ensuredReadingId) {
        const snapshot = useSpreadStore.getState();
        const cardsPayload = snapshot.cards.map((card) => {
          const code = mapCardNameToCode(card.name);
          if (!code) {
            throw new Error("Не удалось определить код карты. Попробуйте заново.");
          }
          return {
            position_index: card.positionIndex,
            card_code: code,
            reversed: card.reversed
          };
        });

        const response = await createReading({
          type: "tarot",
          spread_id: snapshot.schema.id,
          deck_id: snapshot.schema.deckType,
          question: snapshot.question.trim(),
          locale: "ru",
          cards: cardsPayload
        });
        ensuredReadingId = response.id;
        setBackendMeta({ readingId: response.id, backendStatus: response.status });
      }

      if (!ensuredReadingId) {
        throw new Error("Не удалось создать расклад. Попробуйте снова.");
      }

      const deadline = startedAt + VIEW_POLL_TIMEOUT;
      while (Date.now() < deadline) {
        const reading = await getReading(ensuredReadingId);
        setBackendMeta({ backendStatus: reading.status, readingId: ensuredReadingId });

        if (reading.status === "ready" && reading.output_payload) {
          const viewResponse = await viewReading(ensuredReadingId);
          if (!viewResponse.output_payload) {
            throw new Error("Интерпретация ещё не готова. Попробуйте позже.");
          }
          finishReading({
            ...viewResponse,
            summary_text: viewResponse.summary_text ?? ""
          });
          return;
        }

        if (reading.status === "error") {
          throw new Error(reading.error || "Произошла ошибка при подготовке расклада");
        }

        if (Date.now() - startedAt >= LONG_WAIT_THRESHOLD) {
          setIsLongWait(true);
        }

        await wait(VIEW_POLL_INTERVAL);
      }

      setIsLongWait(true);
      setViewError("Расклад готовится дольше обычного. Попробуйте позже.");
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

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleResize = () => setViewportHeight(window.innerHeight);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const spreadSpacerHeight = useMemo(() => {
    if (showForm) return 0;
    const target = Math.round(spreadLayoutHeight * scale + 24);
    const maxSpacer = Math.max(80, Math.round(viewportHeight * DEALT_SPACER_MAX_RATIO));
    return Math.min(Math.max(target, DEALT_SPACER_MIN), maxSpacer);
  }, [scale, showForm, spreadLayoutHeight, viewportHeight]);

  const formGap = useMemo(() => {
    return showForm ? "clamp(8px, 2vh, 20px)" : "2rem";
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

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[radial-gradient(circle_at_top,_#2d1f58,_#0b0f1f)] text-white">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(circle at 15% 20%, rgba(255,255,255,0.12) 0%, transparent 40%), radial-gradient(circle at 80% 0%, rgba(177,111,255,0.25) 0%, transparent 45%)",
          filter: scale < 0.85 ? "blur(1.5px)" : undefined
        }}
      />
      <div
        ref={scope}
        className="relative z-10 mx-auto flex min-h-screen w-full max-w-xl flex-col items-center px-4 pb-16 pt-6"
        style={{
          perspective: "1200px",
          pointerEvents: isRunning ? "none" : "auto",
          gap: formGap
        }}
      >
        <div className="w-full">
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 shadow-inner">
            Энергия: {energyLabel} ⚡
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
          style={{
            width: "100%",
            display: "flex",
            justifyContent: "center",
            marginTop: showForm ? `${12 / scale}px` : `${20 / scale}px`
          }}
        >
          <div
            className="relative flex w-full flex-col items-center"
            style={{ transform: `scale(${scale})`, transformOrigin: "center top", transformStyle: "preserve-3d" }}
          >
            <DeckStack key={deckKey} backSrc={backSrc} mode={stage} fanCenterRef={fanCenterRef} />
            <div className="dealt-layer pointer-events-auto absolute left-1/2 top-1/2 z-[1100]">
              <motion.div
                className="deal-host absolute left-1/2 top-1/2 h-0 w-0 -translate-x-1/2 -translate-y-1/2"
                initial={{ y: -16, opacity: 0 }}
                style={{ willChange: "transform" }}
              >
                {cardsWithPosition.map(({ position, card, orderNumber }) => {
                  const faceSrc = card ? faceUrl(schema.deckType, card.name) : null;
                  const showOrderLabel =
                    !card?.isOpen && schema.openOrder.length > 1 && typeof orderNumber === "number";
                  return (
                    <div
                      key={position.id}
                      className="absolute flex flex-col items-center"
                      style={{ left: position.x, top: position.y, transform: "translate(-50%, -50%)" }}
                    >
                      {card && faceSrc && (
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
                          <DealtCard
                            backSrc={backSrc}
                            faceSrc={faceSrc}
                            isOpen={card.isOpen}
                            reversed={card.reversed}
                            onClick={() => handleCardClick(position.id)}
                          />
                        </div>
                      )}
                      {card?.isOpen && <p className="mt-2 text-xs text-white/70">{position.label}</p>}
                    </div>
                  );
                })}
              </motion.div>
            </div>
            <div
              id="questionBubble"
              ref={questionBubbleRef}
              className={`text-wrap-anywhere pointer-events-none mt-4 max-w-sm rounded-2xl border border-white/25 bg-white/10 px-4 py-2 text-center text-sm font-medium text-white/90 shadow-lg transition-opacity ${
                trimmedQuestion && showForm ? "opacity-100" : "opacity-0"
              }`}
            >
              {trimmedQuestion || "Введите вопрос, чтобы начать"}
            </div>
          </div>
        </div>
        <div aria-hidden className="w-full" style={{ height: `${spreadSpacerHeight}px` }} />

        {showForm && (
          <div
            id="questionForm"
            className="w-full space-y-4 rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur"
            style={{ marginTop: "clamp(-12px, -1vh, -4px)" }}
          >
            <div className="space-y-1">
              <h1 className="text-wrap-anywhere text-xl font-semibold text-white">{schema.name}</h1>
              <p className="text-wrap-anywhere text-sm text-white/70">
                {schema.id === "one_card"
                  ? "Сформулируйте запрос и получите энергию дня."
                  : "Три карты покажут факторы ДА/НЕТ и итог."}
              </p>
            </div>
            <textarea
              placeholder="Введите ваш вопрос к картам..."
              className="text-wrap-anywhere h-28 w-full resize-y rounded-2xl border border-white/20 bg-white/5 p-3 text-sm text-white placeholder:text-white/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/70"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
            />
            <Button onClick={handleStart} className="w-full text-base" disabled={isRunning || !trimmedQuestion}>
              Подтвердить вопрос
            </Button>
          </div>
        )}

        <motion.p
          id="flipHint"
          initial={{ opacity: 0, y: 12 }}
          className={`text-wrap-anywhere text-sm ${hintVisible ? "text-white/80" : "text-transparent"}`}
        >
          Нажмите на карту, чтобы открыть послание
        </motion.p>

        {(orderWarning || viewError) && (
          <p className="text-center text-sm text-amber-300">{orderWarning || viewError}</p>
        )}

        {showActionButtons && (
          <div className="w-full space-y-3">
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
      </div>
      {isViewLoading && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/70 px-6 backdrop-blur">
          <LoadingTarot
            message={isLongWait ? "Расклад готовится дольше обычного" : "Получаем интерпретацию"}
            subMessage={
              isLongWait
                ? "Колода всё ещё работает... немного терпения"
                : "Собираем карты и ждём подсказку мастера"
            }
          />
        </div>
      )}
    </div>
  );
}
