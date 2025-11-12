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

  const showCard = stage === "await_open" || stage === "done";
  const canInteract = stage === "await_open" || stage === "done";

  const handleStart = () => {
    if (!trimmedQuestion) {
      alert("Введите вопрос к картам");
      return;
    }
    start(trimmedQuestion);
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

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-xl flex-col items-center gap-8 px-4 pb-16 pt-10">
        <div className="relative flex h-[320px] w-full items-center justify-center">
          {stage === "ask" && <IdleDeck />}
          {stage === "question_flight" && (
            <>
              <IdleDeck dimmed />
              {trimmedQuestion ? <QuestionFlight text={trimmedQuestion} /> : null}
            </>
          )}
          {stage === "shuffling" && <SplitShuffle />}
          {stage === "dealing" && <DealAnimation />}
          {showCard && cards.length > 0 ? (
            <div className="pointer-events-auto">
              {cards.map((card) => (
                <CardSprite
                  key={card.positionIndex}
                  name={card.name}
                  reversed={card.reversed}
                  isOpen={card.isOpen}
                  onClick={() => (canInteract ? openCard(card.positionIndex) : undefined)}
                />
              ))}
            </div>
          ) : null}
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

        {stage === "shuffling" && (
          <p className="text-sm text-white/70">Колода прислушивается к вашему вопросу…</p>
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

interface IdleDeckProps {
  dimmed?: boolean;
}

function IdleDeck({ dimmed }: IdleDeckProps = {}) {
  const cards = Array.from({ length: STACK_SIZE });
  const backSrc = backUrl("rws");

  return (
    <div className="relative h-64 w-48">
      {cards.map((_, index) => (
        <motion.img
          key={index}
          src={backSrc}
          className="absolute inset-0 h-full w-full rounded-xl object-cover shadow-xl shadow-black/40"
          style={{
            transform: `translateY(${index * -3}px)`,
            zIndex: index,
            opacity: dimmed ? 0.45 - index * 0.04 : 0.9 - index * 0.05
          }}
          animate={{ y: dimmed ? 0 : [0, -4, 0] }}
          transition={{
            duration: 3,
            repeat: dimmed ? 0 : Infinity,
            delay: index * 0.15,
            ease: "easeInOut"
          }}
        />
      ))}
    </div>
  );
}

function QuestionFlight({ text }: { text: string }) {
  return (
    <motion.div
      key={text}
      initial={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
      animate={{ y: -80, opacity: 0, scale: 0.8, filter: "blur(4px)" }}
      transition={{ duration: 0.8, ease: "easeInOut" }}
      className="absolute bottom-10 text-lg font-semibold text-secondary"
    >
      <span className="animate-pulse">{text}</span>
    </motion.div>
  );
}

function SplitShuffle() {
  return (
    <div className="relative h-64 w-72">
      <HalfStack direction="left" />
      <HalfStack direction="right" />
    </div>
  );
}

function HalfStack({ direction }: { direction: "left" | "right" }) {
  const cards = Array.from({ length: STACK_SIZE });
  const backSrc = backUrl("rws");
  const sign = direction === "left" ? -1 : 1;

  return (
    <motion.div
      className={`absolute top-1/2 flex -translate-y-1/2 ${
        direction === "left" ? "justify-end" : "justify-start"
      }`}
      initial={{ x: 0, rotate: 0 }}
      animate={{
        x: [0, sign * 60, sign * -40, sign * 30, sign * -20, 0],
        rotate: [0, sign * -10, sign * 8, sign * -6, sign * 4, 0]
      }}
      transition={{ duration: 4, ease: "easeInOut" }}
      style={{ width: "50%" }}
    >
      <div className="relative h-60 w-24">
        {cards.map((_, index) => (
          <motion.img
            key={`${direction}-${index}`}
            src={backSrc}
            className="absolute inset-0 h-full w-full rounded-xl object-cover shadow-xl shadow-black/40"
            style={{
              transform: `translateY(${index * -3}px)`,
              zIndex: index,
              opacity: 0.9 - index * 0.08
            }}
            animate={{
              y: [index * -3, index * -6, index * -2, index * -4, index * -3],
              rotate: [0, sign * -3, sign * 3, sign * -2, 0]
            }}
            transition={{
              duration: 4,
              ease: "easeInOut",
              delay: index * 0.08
            }}
          />
        ))}
      </div>
    </motion.div>
  );
}

function DealAnimation() {
  const cards = Array.from({ length: STACK_SIZE });
  const backSrc = backUrl("rws");

  return (
    <div className="relative h-64 w-64">
      <motion.div
        className="absolute inset-x-0 top-6 flex justify-center"
        initial={{ y: 0, opacity: 1 }}
        animate={{ y: -80, opacity: 0.2 }}
        transition={{ duration: 2, ease: "easeInOut" }}
      >
        <div className="relative h-56 w-32">
          {cards.map((_, index) => (
            <img
              key={`deal-stack-${index}`}
              src={backSrc}
              className="absolute inset-0 h-full w-full rounded-xl object-cover shadow-xl shadow-black/40"
              style={{
                transform: `translateY(${index * -3}px)`,
                opacity: 0.9 - index * 0.08
              }}
            />
          ))}
        </div>
      </motion.div>
      <motion.img
        src={backSrc}
        className="absolute left-1/2 top-0 h-56 w-36 -translate-x-1/2 rounded-xl object-cover shadow-2xl shadow-black/50"
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 50, opacity: 1 }}
        transition={{ duration: 2, ease: "easeInOut" }}
      />
    </div>
  );
}
