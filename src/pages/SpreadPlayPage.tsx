import { useCallback, useMemo, useRef, useState, useEffect } from "react";
import { motion, useAnimate } from "framer-motion";

import { Button } from "@/components/ui/button";
import { CardSprite } from "@/components/tarot/CardSprite";
import { DeckStack } from "@/components/tarot/DeckStack";
import { backUrl } from "@/lib/cardAsset";
import { useReadingState } from "@/stores/readingState";

const DUR = {
  pause: 0.2,
  fly: 0.9,
  dissolve: 0.6,
  collect: 2.8,
  shuffle: 3.8,
  deal: 1.4,
  hint: 0.5
};

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

  const backSrc = useMemo(() => backUrl("rws"), []);
  const trimmedQuestion = question.trim();
  const showResultCard = stage === "await_open" || stage === "done";
  const showDealtCard = stage === "dealing" || showResultCard;
  const allCardsOpen = cards.every((card) => card.isOpen);
  const showActionButtons = stage === "done" || (stage === "await_open" && allCardsOpen);

  const resetQuestionBubble = () => {
    const bubble = questionBubbleRef.current;
    if (!bubble) return;
    bubble.style.opacity = "";
    bubble.style.filter = "";
    bubble.style.transform = "";
  };

  const handleReset = () => {
    storeReset();
    setStage("fan");
    setQuestion("");
    setIsRunning(false);
    setDeckKey((value) => value + 1);
    resetQuestionBubble();
    animate("#questionForm", { opacity: 1, y: 0 }, { duration: 0 });
  };

  useEffect(() => {
    if (stage === "fan" && !trimmedQuestion) {
      resetQuestionBubble();
    }
  }, [stage, trimmedQuestion]);

  const flyQuestion = useCallback(async () => {
    const bubble = questionBubbleRef.current;
    const target = fanCenterRef.current;
    if (!bubble || !target) {
      return;
    }
    const bubbleRect = bubble.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const dx =
      targetRect.left + targetRect.width / 2 - (bubbleRect.left + bubbleRect.width / 2);
    const dy =
      targetRect.top + targetRect.height / 2 - (bubbleRect.top + bubbleRect.height / 2);

    await animate(
      bubble,
      { x: dx, y: dy, scale: 0.92 },
      { duration: DUR.fly, ease: "easeInOut" }
    );
    await animate(
      bubble,
      { opacity: 0, filter: "blur(6px)" },
      { duration: DUR.dissolve, ease: "easeInOut" }
    );
    await animate(
      "#questionForm",
      { y: 40, opacity: 0 },
      { duration: DUR.dissolve, ease: "easeInOut" }
    );
  }, [animate]);

  const dealCard = useCallback(async () => {
    if (!scope.current?.querySelector(".dealt-card")) {
      return;
    }
    await animate(
      ".dealt-card",
      { y: 0, scale: 0.92, opacity: 0, zIndex: 20 },
      { duration: 0 }
    );
    await animate(
      ".dealt-card",
      { y: 90, scale: 1, opacity: 1, zIndex: 50 },
      { duration: 0.9, ease: "easeInOut" }
    );
  }, [animate, scope]);

  const runTimeline = useCallback(async () => {
    if (!scope.current || !trimmedQuestion) return;
    setIsRunning(true);
    try {
      await animate(scope.current, {}, { duration: DUR.pause });
      await flyQuestion();
      setStage("collecting");
      await wait(DUR.collect * 1000);
      setStage("shuffling");
      await wait(DUR.shuffle * 1000);
      setStage("dealing");
      await dealCard();
      await wait(300);
      setStage("await_open");
      await animate("#flipHint", { opacity: 1, y: 0 }, { duration: DUR.hint });
    } finally {
      setIsRunning(false);
    }
  }, [animate, dealCard, flyQuestion, scope, setStage, trimmedQuestion]);

  const handleStart = async () => {
    if (!trimmedQuestion || isRunning) {
      if (!trimmedQuestion) {
        alert("Введите вопрос к картам");
      }
      return;
    }
    resetQuestionBubble();
    start(trimmedQuestion);
    await runTimeline();
  };

  const showForm = stage === "fan" || stage === "sending";

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
          <div
            className="absolute left-1/2 top-1/2 flex"
            style={{ transform: "translate(-50%, -50%)" }}
          >
            <motion.div
              initial={false}
              animate={{
                opacity: showDealtCard ? 1 : 0,
                y: showDealtCard ? 0 : -24
              }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              {cards.map((card) => (
                <div
                  key={card.positionIndex}
                  className={`dealt-card transition-opacity ${
                    showDealtCard ? "opacity-100" : "opacity-0"
                  } ${showResultCard ? "pointer-events-auto" : "pointer-events-none"}`}
                  style={{ transformOrigin: "center top" }}
                >
                  <CardSprite
                    name={card.name}
                    reversed={card.reversed}
                    isOpen={card.isOpen}
                    onClick={() => openCard(card.positionIndex)}
                  />
                </div>
              ))}
            </motion.div>
          </div>
          <div
            id="questionBubble"
            ref={questionBubbleRef}
            className={`text-wrap-anywhere pointer-events-none mt-4 max-w-sm rounded-2xl border border-white/25 bg-white/10 px-4 py-2 text-center text-sm font-medium text-white/90 shadow-lg transition-opacity ${
              trimmedQuestion && (stage === "fan" || stage === "sending")
                ? "opacity-100"
                : "opacity-0"
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
            showResultCard ? "text-white/80" : "text-transparent"
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
