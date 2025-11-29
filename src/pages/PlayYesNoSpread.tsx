import { useCallback, useMemo, useState } from "react";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { RWS_ALL } from "@/data/rws_deck";
import { backUrl, faceUrl } from "@/lib/cardAsset";
import { mapCardNameToCode } from "@/lib/cardCode";
import { createReading } from "@/lib/api";

interface YesNoCardState {
  id: number;
  name: string;
  position: 1 | 2 | 3;
  isOpen: boolean;
}

export default function PlayYesNoSpread() {
  const [question, setQuestion] = useState("");
  const [dealtCards, setDealtCards] = useState<YesNoCardState[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);
  const [wrongOrderAttempts, setWrongOrderAttempts] = useState<Record<number, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const backSrc = useMemo(() => backUrl("rws"), []);

  const allOpened = dealtCards.length === 3 && dealtCards.every((card) => card.isOpen);

  const startDealing = () => {
    const trimmed = question.trim();
    if (!trimmed) {
      alert("Сформулируйте вопрос перед раскладом");
      return;
    }

    const shuffled = [...RWS_ALL].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, 3).map((name, index) => ({
      id: index + 1,
      name,
      position: (index + 1) as 1 | 2 | 3,
      isOpen: false
    }));

    setWarning(null);
    setStatusMessage(null);
    setWrongOrderAttempts({});
    setIsAnimating(true);
    setDealtCards(selected);
    setTimeout(() => setIsAnimating(false), 1200);
  };

  const handleOpenCard = (cardId: number) => {
    const card = dealtCards.find((item) => item.id === cardId);
    if (!card || card.isOpen) return;

    const nextRequired = dealtCards.find((item) => !item.isOpen)?.position;
    if (nextRequired && card.position !== nextRequired && !wrongOrderAttempts[card.position]) {
      setWarning("Сперва откройте карты в правильном порядке");
      setWrongOrderAttempts((prev) => ({ ...prev, [card.position]: true }));
      return;
    }

    setWarning(null);
    setDealtCards((prev) =>
      prev.map((item) => (item.id === cardId ? { ...item, isOpen: true } : item))
    );
  };

  const handleSubmitReading = useCallback(async () => {
    if (!allOpened) {
      alert("Откройте все три карты, чтобы продолжить.");
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);
    try {
      const cardsPayload = dealtCards.map((item) => {
        const code = mapCardNameToCode(item.name);
        if (!code) {
          throw new Error(`Не удалось определить код карты: ${item.name}`);
        }
        return {
          position_index: item.position,
          card_code: code,
          reversed: false
        };
      });

      await createReading({
        type: "tarot",
        spread_id: "yes_no",
        deck_id: "rws",
        question: question.trim(),
        locale: "ru",
        cards: cardsPayload
      });

      setStatusMessage("Расклад отправлен. Ожидайте интерпретацию!");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Не удалось отправить расклад";
      alert(message);
    } finally {
      setIsSubmitting(false);
    }
  }, [allOpened, dealtCards, question]);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-4 text-white">
      <div className="space-y-3 rounded-3xl border border-white/10 bg-white/5 p-5">
        <h1 className="text-2xl font-semibold text-white">Расклад «Да или Нет»</h1>
        <p className="text-sm text-white/70">
          Сформулируйте вопрос и откройте карты в правильном порядке: фактор &laquo;Да&raquo;, фактор
          &laquo;Нет&raquo;, итог.
        </p>
        <textarea
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="Каков ваш вопрос к картам?"
          className="h-24 w-full resize-none rounded-2xl border border-white/20 bg-white/5 p-3 text-sm text-white placeholder:text-white/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/70"
        />
        <Button className="w-full" onClick={startDealing} disabled={isAnimating || !question.trim()}>
          Начать расклад
        </Button>
      </div>

      {warning && <p className="text-center text-sm text-amber-300">{warning}</p>}
      {statusMessage && <p className="text-center text-sm text-emerald-300">{statusMessage}</p>}

      <div className="grid gap-4 md:grid-cols-3">
        {dealtCards.map((card) => (
          <motion.button
            key={card.id}
            onClick={() => handleOpenCard(card.id)}
            className="relative flex aspect-[2/3] items-center justify-center overflow-hidden rounded-3xl border border-white/10 bg-[#140e28] shadow-2xl"
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: card.position * 0.2, duration: 0.6 }}
            disabled={isAnimating}
          >
            <img
              src={card.isOpen ? faceUrl("rws", card.name) : backSrc}
              alt={card.name}
              className={`h-full w-full object-cover transition-transform duration-500 ${
                card.isOpen ? "rotate-y-0" : "rotate-y-180"
              }`}
            />
            {!card.isOpen && (
              <span className="absolute inset-0 flex items-center justify-center text-6xl font-bold text-white/70 drop-shadow-lg">
                {card.position}
              </span>
            )}
            {card.isOpen && (
              <div className="absolute bottom-3 left-1/2 w-[90%] -translate-x-1/2 rounded-2xl bg-black/40 px-3 py-1 text-center text-xs font-semibold uppercase tracking-wide text-white">
                {card.name}
              </div>
            )}
          </motion.button>
        ))}

        {!dealtCards.length && (
          <div className="md:col-span-3">
            <div className="rounded-3xl border border-dashed border-white/30 bg-white/5 p-6 text-center text-sm text-white/70">
              Нажмите «Начать расклад», чтобы вытянуть три карты.
            </div>
          </div>
        )}
      </div>

      {allOpened && (
        <Button
          className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90"
          onClick={handleSubmitReading}
          disabled={isSubmitting}
        >
          {isSubmitting ? "Отправляем расклад..." : "Получить интерпретацию расклада"}
        </Button>
      )}
    </div>
  );
}
