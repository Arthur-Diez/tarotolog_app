import { useCallback, useMemo, useState } from "react";
import { motion, stagger, useAnimate } from "framer-motion";

import { Button } from "@/components/ui/button";
import { CardSprite } from "@/components/tarot/CardSprite";
import { backUrl } from "@/lib/cardAsset";
import { useReadingState } from "@/stores/readingState";
import { DeckStack } from "@/components/tarot/DeckStack";

const DUR = {
  send: 1.2,
  pause: 0.2,
  collapse: 1.1,
  stackFade: 0.4,
  shuffle: 4.2,
  merge: 0.6,
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
  const reset = useReadingState((state) => state.reset);
  const setStage = useReadingState((state) => state.setStage);

  const [scope, animate] = useAnimate();
  const [isRunning, setIsRunning] = useState(false);
  const backSrc = useMemo(() => backUrl("rws"), []);

  const trimmedQuestion = question.trim();

  const runTimeline = useCallback(async () => {
    if (!scope.current) return;
    setIsRunning(true);
    try {
      // 1. Question ascends into deck
      await Promise.all([
        animate(
          "#questionText",
          { y: -120, opacity: 0, scale: 0.9, filter: "blur(4px)" },
          { duration: DUR.send, ease: "easeInOut" }
        ),
        animate(
          "#questionForm",
          { y: 40, opacity: 0 },
          { duration: DUR.send * 0.7, ease: "easeInOut" }
        )
      ]);
      await animate(scope.current, { opacity: 1 }, { duration: DUR.pause });
      setStage("fan");

      // 2. Collapse fan into stack
      await animate(
        ".fan-card",
        { x: 0, y: 0, rotateZ: 0 },
        { duration: DUR.collapse, ease: "easeInOut", delay: stagger(0.03) }
      );
      await animate("#fan", { opacity: 0 }, { duration: DUR.stackFade });
      setStage("stacking");
      await animate(
        "#stack",
        { opacity: 1, scale: 1 },
        { duration: DUR.stackFade, ease: "easeInOut" }
      );

      // 3. Split & shuffle
      setStage("shuffling");
      await Promise.all([
        animate(
          ".pile-left",
          { x: [0, -50, -20, 0], rotateZ: [0, -6, -2, 0] },
          { duration: DUR.shuffle, ease: "easeInOut" }
        ),
        animate(
          ".pile-right",
          { x: [0, 50, 20, 0], rotateZ: [0, 6, 2, 0] },
          { duration: DUR.shuffle, ease: "easeInOut" }
        ),
        animate(
          ".stack-edge",
          { scaleY: [1, 1.05, 1] },
          { duration: DUR.shuffle, ease: "easeInOut", delay: stagger(0.05) }
        ),
        animate(
          "#stack",
          { rotateX: [5, 8, 6, 5], y: [0, -6, -2, 0] },
          { duration: DUR.shuffle, ease: "easeInOut" }
        )
      ]);
      await animate("#stack", { x: 0, rotateZ: 0 }, { duration: DUR.merge });

      // 4. Lift & deal
      setStage("dealing");
      await animate("#stack", { y: -80 }, { duration: DUR.rise, ease: "easeInOut" });
      await animate(
        ".deal-card",
        { opacity: 1, y: 120 },
        { duration: DUR.deal, ease: "easeInOut", delay: stagger(0.2) }
      );

      // 5. Hint
      setStage("await_open");
      await animate(".deal-card", { opacity: 0 }, { duration: 0.2 });
      await animate("#flipHint", { opacity: 1, y: 0 }, { duration: DUR.hint });
    } finally {
      setIsRunning(false);
    }
  }, [animate, scope, setStage]);

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

  const showForm = stage === "ask" || stage === "sending";

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
        style={{ perspective: "1200px" }}
      >
        <div className="relative flex w-full items-center justify-center" style={{ transformStyle: "preserve-3d" }}>
          <DeckStack backSrc={backSrc} />
          {(stage === "await_open" || stage === "done") && (
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
        </div>

        {showForm && (
          <div
            id="questionForm"
            className="w-full space-y-4 rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur"
          >
            <div className="space-y-1">
              <h1 className="text-xl font-semibold text-white">Одна карта (карта дня)</h1>
              <p className="text-sm text-white/70">Сформулируйте запрос и получите энергию дня.</p>
            </div>
            <motion.div
              id="questionText"
              className="text-base font-medium text-secondary"
            >
              {trimmedQuestion || " "}
            </motion.div>
            <textarea
              placeholder="Введите ваш вопрос к картам..."
              className="h-28 w-full rounded-2xl border border-white/20 bg-white/5 p-3 text-sm text-white placeholder:text-white/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/70"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
            />
            <Button onClick={handleStart} className="w-full text-base" disabled={stage !== "ask" || isRunning}>
              Подтвердить вопрос
            </Button>
          </div>
        )}

        <motion.p
          id="flipHint"
          initial={{ opacity: 0, y: 12 }}
          className={`text-sm ${stage === "await_open" || stage === "done" ? "text-white/80" : "text-transparent"}`}
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
            <Button variant="ghost" className="w-full text-white/70" onClick={reset}>
              Начать заново
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
