import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { CardSprite } from "@/components/tarot/CardSprite";
import { backUrl } from "@/lib/cardAsset";
import { useReadingState } from "@/stores/readingState";

export default function SpreadPlayPage() {
  const stage = useReadingState((state) => state.stage);
  const cards = useReadingState((state) => state.cards);
  const question = useReadingState((state) => state.question);
  const setQuestion = useReadingState((state) => state.setQuestion);
  const start = useReadingState((state) => state.start);
  const openCard = useReadingState((state) => state.openCard);
  const reset = useReadingState((state) => state.reset);

  const handleStart = () => {
    if (!question.trim()) {
      alert("Введите вопрос к картам");
      return;
    }
    start(question.trim());
  };

  const handleOpen = (index: number) => {
    openCard(index);
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-xl flex-col items-center gap-6 px-4 pb-12 pt-6 text-center">
      {stage === "ask" && (
        <div className="w-full space-y-4">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold text-foreground">Одна карта (карта дня)</h1>
            <p className="text-sm text-muted-foreground">
              Сформулируйте запрос и получите энергию дня.
            </p>
          </div>
          <textarea
            placeholder="Введите ваш вопрос к картам..."
            className="h-28 w-full rounded-2xl border border-border/50 bg-background p-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
          />
          <Button onClick={handleStart} className="w-full">
            Подтвердить вопрос
          </Button>
        </div>
      )}

      {stage === "shuffling" && (
        <motion.div
          className="mt-24"
          animate={{ rotate: [0, 5, -5, 0] }}
          transition={{ duration: 1, repeat: Infinity }}
        >
          <img src={backUrl("rws")} className="h-52 w-32 object-contain" alt="shuffling deck" />
          <p className="mt-4 text-sm text-muted-foreground">Карты настраиваются на ваш запрос…</p>
        </motion.div>
      )}

      {(stage === "dealing" || stage === "await_open" || stage === "done") && (
        <div className="flex w-full justify-center pt-16">
          {cards.map((card) => (
            <CardSprite
              key={card.positionIndex}
              name={card.name}
              reversed={card.reversed}
              back={!card.isOpen}
              onClick={() => handleOpen(card.positionIndex)}
            />
          ))}
        </div>
      )}

      {stage === "done" && (
        <div className="space-y-3 pt-6">
          <Button
            variant="outline"
            onClick={() => alert("Интерпретация расклада появится здесь")}
            className="w-full"
          >
            Получить интерпретацию расклада
          </Button>
          <Button variant="ghost" className="w-full" onClick={reset}>
            Начать заново
          </Button>
        </div>
      )}
    </div>
  );
}
