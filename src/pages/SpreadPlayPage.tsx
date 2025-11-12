import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { CardSprite } from "@/components/tarot/CardSprite";
import { backUrl } from "@/lib/cardAsset";
import { useReadingState } from "@/stores/readingState";

const STACK_SIZE = 6;

export default function SpreadPlayPage() {
  const stage = useReadingState((state) => state.stage);
  const cards = useReadingState((state) => state.cards);
  const question = useReadingState((state) => state.question);
  const setQuestion = useReadingState((state) => state.setQuestion);
  const start = useReadingState((state) => state.start);
  const openCard = useReadingState((state) => state.openCard);
  const reset = useReadingState((state) => state.reset);

  const trimmedQuestion = question.trim();
  const showDeckIdle = stage === "ask" || stage === "question_flight";
  const showShuffle = stage === "shuffling";
  const showCard =
    stage === "dealing" || stage === "await_open" || stage === "done";
  const showQuestionFlight = stage === "question_flight";

  const handleStart = () => {
    if (!trimmedQuestion) {
      alert("Введите вопрос к картам");
      return;
    }
    start(trimmedQuestion);
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[radial-gradient(circle_at_top,_#2b165b,_#0b1025)] text-white">
      <div className="pointer-events-none absolute inset-0 opacity-40 mix-blend-screen"
        style={{
          backgroundImage:
            "radial-gradient(circle at 10% 20%, rgba(255,255,255,0.15) 0%, transparent 45%), radial-gradient(circle at 80% 0%, rgba(132,56,255,0.2) 0%, transparent 40%)"
        }}
      />
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-xl flex-col items-center gap-6 px-4 pb-16 pt-10">
        <div className="relative flex h-72 w-full items-center justify-center">
          {showDeckIdle && <IdleDeck />}
          {showShuffle && <ShuffleStack />}
          {showQuestionFlight && trimmedQuestion ? (
            <motion.div
              key={trimmedQuestion}
              initial={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
              animate={{
                y: -80,
                opacity: 0,
                scale: 0.8,
                filter: "blur(4px)"
              }}
              transition={{ duration: 0.8, ease: "easeInOut" }}
              className="absolute bottom-12 text-lg font-semibold text-secondary"
            >
              <span className="animate-pulse">{trimmedQuestion}</span>
            </motion.div>
          ) : null}

          {showCard && (
            <div className="absolute inset-0 flex items-center justify-center">
              {cards.map((card) => (
                <CardSprite
                  key={card.positionIndex}
                  name={card.name}
                  reversed={card.reversed}
                  isOpen={card.isOpen}
                  onClick={() => openCard(card.positionIndex)}
                />
              ))}
            </div>
          )}
        </div>

        {stage === "ask" && (
          <div className="w-full space-y-4 rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur">
            <div className="space-y-1">
              <h1 className="text-xl font-semibold text-white">Одна карта (карта дня)</h1>
              <p className="text-sm text-white/70">
                Сформулируйте запрос и получите энергию дня.
              </p>
            </div>
            <textarea
              placeholder="Введите ваш вопрос к картам..."
              className="h-28 w-full rounded-2xl border border-white/20 bg-white/5 p-3 text-sm text-white placeholder:text-white/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/70"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
            />
            <Button onClick={handleStart} className="w-full text-base">
              Подтвердить вопрос
            </Button>
          </div>
        )}

        {showShuffle && (
          <p className="text-sm text-white/70">Карты настраиваются на ваш запрос…</p>
        )}

        {stage === "done" && (
          <div className="w-full space-y-3">
            <Button
              variant="secondary"
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

function IdleDeck() {
  const cards = Array.from({ length: STACK_SIZE });
  const backSrc = backUrl("rws");
  return (
    <div className="relative h-60 w-40">
      {cards.map((_, index) => (
        <motion.img
          key={index}
          src={backSrc}
          className="absolute inset-0 h-full w-full rounded-xl object-cover shadow-xl shadow-black/40"
          style={{
            transform: `translateY(${index * -2}px)`,
            zIndex: index,
            opacity: 1 - index * 0.08
          }}
          animate={{ y: [0, -4, 0] }}
          transition={{
            duration: 3,
            repeat: Infinity,
            delay: index * 0.15,
            ease: "easeInOut"
          }}
        />
      ))}
    </div>
  );
}

function ShuffleStack() {
  const cards = Array.from({ length: STACK_SIZE });
  const backSrc = backUrl("rws");
  return (
    <div className="relative h-60 w-48">
      {cards.map((_, index) => (
        <motion.img
          key={index}
          src={backSrc}
          className="absolute inset-0 h-full w-full rounded-xl object-cover shadow-xl shadow-black/40"
          variants={{
            shuffle: {
              rotate: [0, -15, 15, -10, 10, 0],
              x: [0, 20, -20, 10, -10, 0],
              y: [0, 10, -10, 6, -6, 0],
              transition: {
                duration: 3,
                ease: "easeInOut",
                delay: index * 0.1
              }
            }
          }}
          initial="shuffle"
          animate="shuffle"
        />
      ))}
    </div>
  );
}
