import { useCallback, useMemo, useRef, useState, useEffect } from "react";
import type { AnimationPlaybackControls } from "framer-motion";
import { motion, useAnimate } from "framer-motion";

import { Button } from "@/components/ui/button";
import DealtCard from "@/components/tarot/DealtCard";
import { DeckStack } from "@/components/tarot/DeckStack";
import { backUrl, faceUrl } from "@/lib/cardAsset";
import { useReadingState } from "@/stores/readingState";

const DEAL_OFFSET = 96;
const COLLECT_DURATION = 2.8;
const SHUFFLE_DURATION = 3.8;
const HINT_DURATION = 0.5;
const QUESTION_FLY_DURATION = 0.9;
const QUESTION_DISSOLVE_DURATION = 0.6;
const WAIT_AFTER_DEAL = 150;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default function SpreadPlayPage() {
  const stage = useReadingState((state) => state.stage);
  const cards = useReadingState((state) => state.cards);
  const question = useReadingState((state) => state.question);
  const setQuestion = useReadingState((state) => state.setQuestion);
  const start = useReadingState((state) => state.start);
  const openCard = useReadingState((state) => state.openCard);
  const storeReset = useReadingState((state) => state.reset);
  const setStage = useReadingState((state) => state.setStage);

  const [scope, animate] = useAnimate();
  const [isRunning, setIsRunning] = useState(false);
  const [deckKey, setDeckKey] = useState(0);
  const questionBubbleRef = useRef<HTMLDivElement | null>(null);
  const fanCenterRef = useRef<HTMLDivElement | null>(null);
  const timelineTokenRef = useRef(0);
  const activeAnimationRef = useRef<AnimationPlaybackControls | null>(null);

  const backSrc = useMemo(() => backUrl("rws"), []);
  const trimmedQuestion = question.trim();
  const dealtCard = cards[0];
  const faceSrc = dealtCard ? faceUrl("rws", dealtCard.name) : null;
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
      const controls = (animate as unknown as (...inner: any[]) => AnimationPlaybackControls)(
        ...args
      );
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
    storeReset();
    setStage("fan");
    setQuestion("");
    setDeckKey((value) => value + 1);
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
    const dx =
      targetRect.left + targetRect.width / 2 - (bubbleRect.left + bubbleRect.width / 2);
    const dy =
      targetRect.top + targetRect.height / 2 - (bubbleRect.top + bubbleRect.height / 2);

    await animateAndTrack([
      [
        bubble,
        { x: dx, y: dy, scale: 0.92 },
        { duration: QUESTION_FLY_DURATION, ease: "easeInOut" }
      ],
      [
        bubble,
        { opacity: 0, filter: "blur(6px)" },
        { duration: QUESTION_DISSOLVE_DURATION, ease: "easeInOut" }
      ],
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
    resetQuestionBubble();
    resetDealHost();
    resetHint();
    start(trimmedQuestion);
    await runTimeline();
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[radial-gradient(circle_at_top,_#2d1f58,_#0b0f1f)] text-white">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(circle at 15% 20%, rgba(255,255,255,0.12) 0%, transparent 40%), radial-gradient(circle at 80% 0%, rgba(177,111,255,0.25) 0%, transparent 45%)"
        }}
      />
      <div
        ref={scope}
        className="relative z-10 mx-auto flex min-h-screen w-full max-w-xl flex-col items-center gap-8 px-4 pb-16 pt-10"
        style={{ perspective: "1200px", pointerEvents: isRunning ? "none" : "auto" }}
      >
        <div className="relative flex w-full flex-col items-center" style={{ transformStyle: "preserve-3d" }}>
          <DeckStack key={deckKey} backSrc={backSrc} mode={stage} fanCenterRef={fanCenterRef} />
          <div className="dealt-layer pointer-events-auto absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[1100]">
            <motion.div
              key={`deal-host-${deckKey}`}
              className="deal-host"
              initial={{ y: -16, opacity: 0 }}
              style={{ willChange: "transform" }}
            >
              {dealtCard && faceSrc && (
                <DealtCard
                  backSrc={backSrc}
                  faceSrc={faceSrc}
                  isOpen={dealtCard.isOpen}
                  reversed={dealtCard.reversed}
                  onClick={() => stage === "await_open" && openCard(dealtCard.positionIndex)}
                />
              )}
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

        {showForm && (
          <div
            id="questionForm"
            className="w-full space-y-4 rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur"
          >
            <div className="space-y-1">
              <h1 className="text-wrap-anywhere text-xl font-semibold text-white">
                Одна карта (карта дня)
              </h1>
              <p className="text-wrap-anywhere text-sm text-white/70">
                Сформулируйте запрос и получите энергию дня.
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
          className={`text-wrap-anywhere text-sm ${
            hintVisible ? "text-white/80" : "text-transparent"
          }`}
        >
          Нажмите на карту, чтобы открыть послание
        </motion.p>

        {showActionButtons && (
          <div className="w-full space-y-3">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => alert("Интерпретация расклада появится здесь")}
            >
              Получить интерпретацию расклада
            </Button>
            <Button variant="ghost" className="w-full text-white/70" onClick={handleReset}>
              Начать заново
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
