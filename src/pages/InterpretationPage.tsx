import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Sparkles } from "lucide-react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { LoadingTarot } from "@/components/tarot/LoadingTarot";
import { getReading, type ReadingResponse, type ViewReadingResponse } from "@/lib/api";

interface LocationState {
  reading?: ViewReadingResponse;
}

function normalizeReading(input: ReadingResponse | ViewReadingResponse | undefined | null): ViewReadingResponse | null {
  if (!input) {
    return null;
  }

  if ("status" in input && input.status === "ready" && input.output_payload) {
    return {
      id: input.id,
      status: "ready",
      output_payload: input.output_payload,
      summary_text: input.summary_text ?? "",
      energy_spent: input.energy_spent,
      balance: "balance" in input && typeof input.balance === "number" ? input.balance : 0
    };
  }

  return null;
}

export default function InterpretationPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as LocationState | undefined;
  const initialReading = useMemo(() => normalizeReading(locationState?.reading), [locationState?.reading]);

  const [reading, setReading] = useState<ViewReadingResponse | null>(initialReading);
  const [loading, setLoading] = useState(!initialReading);
  const [error, setError] = useState<string | null>(null);

  const fetchReading = useCallback(
    async (readingId: string) => {
      setLoading(true);
      setError(null);
      try {
        const response = await getReading(readingId);
        const normalized = normalizeReading(response);
        if (!normalized) {
          setError("Расклад ещё не готов. Попробуйте чуть позже.");
          setReading(null);
          return;
        }
        setReading(normalized);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Не удалось загрузить интерпретацию";
        setError(message);
        setReading(null);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (!id) {
      setError("Не передан идентификатор расклада");
      setLoading(false);
      return;
    }
    if (!initialReading) {
      void fetchReading(id);
    }
  }, [fetchReading, id, initialReading]);

  const cards = reading?.output_payload.cards ?? [];

  return (
    <div className="space-y-5 text-white">
      <Button
        variant="ghost"
        className="group gap-2 text-white/80 hover:text-white"
        onClick={() => navigate(-1)}
      >
        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
        Назад к раскладу
      </Button>

      <div className="rounded-3xl border border-white/5 bg-white/5 p-5 backdrop-blur">
        <div className="flex items-center gap-3 text-sm uppercase tracking-[0.25em] text-white/60">
          <Sparkles className="h-5 w-5 text-secondary" />
          <span>Интерпретация расклада</span>
        </div>
        <h1 className="mt-3 text-2xl font-semibold text-white">Послание вашей карты</h1>
        <p className="mt-1 text-sm text-white/70">
          Расклад № {reading?.id ?? id} •{" "}
          {reading?.output_payload.generated_at
            ? new Date(reading.output_payload.generated_at).toLocaleString("ru-RU", {
                hour: "2-digit",
                minute: "2-digit",
                day: "2-digit",
                month: "2-digit"
              })
            : "ожидание данных"}
        </p>
      </div>

      {loading && <LoadingTarot message="Готовим красивую интерпретацию" subMessage="Колода перетасовывается..." />}

      {!loading && error && (
        <div className="space-y-4 rounded-3xl border border-red-500/30 bg-red-500/10 p-5 text-red-100">
          <p className="text-base font-semibold">Не удалось загрузить интерпретацию</p>
          <p className="text-sm opacity-80">{error}</p>
          {id && (
            <Button
              variant="outline"
              className="border-white/20 text-white"
              onClick={() => {
                void fetchReading(id);
              }}
            >
              Повторить попытку
            </Button>
          )}
        </div>
      )}

      {!loading && !error && reading && (
        <div className="space-y-5">
          <div className="flex gap-3 overflow-x-auto rounded-3xl border border-white/5 bg-white/5 p-4">
            {cards.map((card) => (
              <div
                key={`${card.position_index}-${card.card_code}`}
                className="flex min-w-[110px] flex-col items-center justify-center rounded-2xl bg-gradient-to-b from-white/15 to-white/5 p-3 text-center text-xs text-white/80 shadow-lg"
              >
                {card.image_path ? (
                  <img
                    src={card.image_path}
                    alt={card.card_code}
                    className="mb-2 h-36 w-full rounded-xl object-cover shadow-xl"
                  />
                ) : (
                  <div className="mb-2 flex h-36 w-full items-center justify-center rounded-xl border border-white/10 bg-gradient-to-b from-secondary/20 to-transparent text-white/70">
                    {card.card_code.replace("RWS_", "").replaceAll("_", " ")}
                  </div>
                )}
                <p className="font-semibold uppercase tracking-[0.2em]">{card.position_index}</p>
                <p className="mt-1 text-[11px] opacity-80">
                  {card.card_code.replace("RWS_", "").replaceAll("_", " ")}
                  {card.reversed ? " • Перевёрнута" : ""}
                </p>
              </div>
            ))}
            {cards.length === 0 && (
              <p className="text-sm text-white/70">Данные по картам появятся сразу после генерации.</p>
            )}
          </div>

          <div className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-5">
            <p className="text-xs uppercase tracking-[0.3em] text-white/50">Вопрос</p>
            <p className="text-base text-white">{reading.output_payload.question}</p>
          </div>

          <div className="space-y-4 rounded-3xl border border-secondary/40 bg-secondary/20 p-5 text-white shadow-2xl">
            <p className="text-xs uppercase tracking-[0.3em] text-white/80">Краткий итог</p>
            <p className="text-lg font-semibold leading-relaxed text-white">{reading.summary_text}</p>
          </div>

          <div className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-5 text-white/90">
            <p className="text-xs uppercase tracking-[0.3em] text-white/50">Полная интерпретация</p>
            <p className="text-base leading-relaxed">{reading.output_payload.interpretation}</p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 text-sm text-white/70">
            Энергия списана:{" "}
            <span className="font-semibold text-white">{reading.energy_spent || 0} ⚡</span> • Баланс:{" "}
            <span className="font-semibold text-white">{reading.balance} ⚡</span>
          </div>
        </div>
      )}
    </div>
  );
}
