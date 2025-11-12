import { useCallback, useMemo, useRef, useState } from "react";
import { motion, stagger, useAnimate } from "framer-motion";

import { Button } from "@/components/ui/button";
import { CardSprite } from "@/components/tarot/CardSprite";
import { DeckStack } from "@/components/tarot/DeckStack";
import { backUrl } from "@/lib/cardAsset";
import { useReadingState } from "@/stores/readingState";

const FAN_COUNT = 21;
const DUR = {
  pause: 0.2,
  fly: 0.9,
  dissolve: 0.6,
  collapseSingle: 0.12,
  stackFade: 0.3,
  shuffle: 4.2,
  merge: 0.4,
  rise: 0.5,
  deal: 1,
  hint: 0.5
};

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
  const [deckMode, setDeckMode] = useState<"fan" | "stack">("fan");
  const [deckKey, setDeckKey] = useState(0);
  const questionTextRef = useRef<HTMLDivElement | null>(null);
  const fanCenterRef = useRef<HTMLDivElement | null>(null);

  const backSrc = useMemo(() => backUrl("rws"), []);
  const trimmedQuestion = question.trim();
  const showResultCard = stage === "await_open" || stage === "done";

  const resetQuestionBubble = () => {
    const bubble = questionTextRef.current;
    if (!bubble) return;
    bubble.style.opacity = "1";
    bubble.style.filter = "none";
    bubble.style.transform = "translate3d(0,0,0) scale(1)";
  };

  const handleReset = () => {
    storeReset();
    setDeckMode("fan");
    setDeckKey((value) => value + 1);
    setIsRunning(false);
    resetQuestionBubble();
    animate("#questionForm", { opacity: 1, y: 0 }, { duration: 0 });
  };

  const flyQuestion = useCallback(async () => {
    const bubble = questionTextRef.current;
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

  const collapseFan = useCallback(async () => {
    for (let i = 0; i < FAN_COUNT; i += 1) {
      await animate(
        `.fan-card-${i}`,
        { x: 0, y: 0, rotateZ: 0 },
        { duration: DUR.collapseSingle, ease: "easeInOut" }
      );
    }
  }, [animate]);

  const shuffleStack = useCallback(async () => {
    await Promise.all([
      animate(
        ".pile-left",
        {
          x: [0, -60, -20, -50, 0],
          rotateZ: [0, -8, -3, -6, 0]
        },
        { duration: DUR.shuffle, ease: "easeInOut" }
      ),
      animate(
        ".pile-right",
        {
          x: [0, 60, 20, 50, 0],
          rotateZ: [0, 8, 3, 6, 0]
        },
        { duration: DUR.shuffle, ease: "easeInOut" }
      ),
      animate(
        ".stack-edge",
        { scaleY: [1, 1.05, 1] },
        { duration: DUR.shuffle, ease: "easeInOut", delay: stagger(0.05) }
      ),
      animate(
        "#stackCore",
        { rotateX: [4, 7, 5, 4], y: [0, -6, -2, 0] },
        { duration: DUR.shuffle, ease: "easeInOut" }
      )
    ]);
  }, [animate]);

  const mergePiles = useCallback(async () => {
    await Promise.all([
      animate(".pile-left", { x: 0, rotateZ: 0, opacity: 0 }, { duration: DUR.merge }),
      animate(".pile-right", { x: 0, rotateZ: 0, opacity: 0 }, { duration: DUR.merge })
    ]);
  }, [animate]);

  const dealCards = useCallback(
    async (count = 1) => {
      for (let i = 0; i < count; i += 1) {
        await animate(
          `.deal-card-${i}`,
          { opacity: 1, y: 70 + i * 6 },
          { duration: DUR.deal, ease: "easeInOut" }
        );
      }
      await animate(".deal-card", { opacity: 0 }, { duration: 0.2 });
    },
    [animate]
  );

  const runTimeline = useCallback(async () => {
    if (!scope.current || !trimmedQuestion) return;
    setIsRunning(true);
    try {
      await animate(scope.current, {}, { duration: DUR.pause });
      await flyQuestion();
      setStage("fan");
      await collapseFan();
      setDeckMode("stack");
      setStage("stacking");
      await animate("#fan", { opacity: 0 }, { duration: DUR.stackFade, ease: "easeInOut" });
      await animate(
        "#stack",
        { opacity: 1 },
        { duration: DUR.stackFade, ease: "easeInOut" }
      );

      setStage("shuffling");
      await animate(".pile-left", { opacity: 1 }, { duration: 0 });
      await animate(".pile-right", { opacity: 1 }, { duration: 0 });
      await shuffleStack();
      await mergePiles();

      setStage("dealing");
      await animate(
        "#stackCore",
        { y: -80 },
        { duration: DUR.rise, ease: "easeInOut" }
      );
      await dealCards(1);

      setStage("await_open");
      await animate("#flipHint", { opacity: 1, y: 0 }, { duration: DUR.hint });
    } finally {
      setIsRunning(false);
    }
  }, [
    animate,
    collapseFan,
    dealCards,
    flyQuestion,
    mergePiles,
    scope,
    setStage,
    shuffleStack,
    trimmedQuestion
  ]);

  const handleStart = async () => {
    if (!trimmedQuestion || isRunning) {
      if (!trimmedQuestion) {
        alert("Введите вопрос к картам");
      }
      return;
    }
    start(trimmedQuestion);
    await runTimeline();
  };

  const showForm = stage === "fan";

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
          <DeckStack
            key={deckKey}
            backSrc={backSrc}
            mode={deckMode}
            fanCenterRef={fanCenterRef}
          />
          {showResultCard && (
            <motion.div
              className="pointer-events-auto absolute inset-0 flex items-end justify-center pb-6"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {cards.map((card) => (
                <CardSprite
                  key={card.positionIndex}
                  name={card.name}
                  reversed={card.reversed}
                  isOpen={card.isOpen}
                  onClick={() => openCard(card.positionIndex)}
                />
              ))}
            </motion.div>
          )}
          <div
            id="questionText"
            ref={questionTextRef}
            className={`text-wrap-anywhere pointer-events-none mt-4 max-w-sm rounded-2xl border border-white/25 bg-white/10 px-4 py-2 text-center text-sm font-medium text-white/90 shadow-lg transition-opacity ${
              trimmedQuestion ? "opacity-100" : "opacity-0"
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
            <div className="text-wrap-anywhere text-base font-medium text-secondary">
              {trimmedQuestion || " "}
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

        {stage === "done" && (
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
