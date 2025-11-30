import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Sparkles } from "lucide-react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { LoadingTarot } from "@/components/tarot/LoadingTarot";
import { getReading, type ReadingResponse, type ViewReadingResponse } from "@/lib/api";
import { DECKS } from "@/data/decks";
import { RWS_SPREADS_MAP, type SpreadId } from "@/data/rws_spreads";
import { RWS_ALL } from "@/data/rws_deck";
import { mapCardNameToCode } from "@/lib/cardCode";

interface LocationState {
  reading?: ViewReadingResponse;
}

interface LocationState {
  reading?: ViewReadingResponse;
}

interface ReadingInputMeta {
  question: string | null;
  deckId: string | null;
  spreadId: string | null;
}

interface NormalizedOutputCard {
  position: number;
  card_code: string;
  reversed: boolean;
}

interface NormalizedOutput {
  summary: string | null;
  generatedAt?: string;
  cards: NormalizedOutputCard[];
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

function extractInputMeta(payload: unknown): ReadingInputMeta {
  if (!payload || typeof payload !== "object") {
    return { question: null, deckId: null, spreadId: null };
  }

  const obj = payload as Record<string, unknown>;
  const question = typeof obj.question === "string" ? obj.question : null;
  const deckId = typeof obj.deck_id === "string" ? obj.deck_id : null;
  const spreadId = typeof obj.spread_id === "string" ? obj.spread_id : null;

  return { question, deckId, spreadId };
}

function normalizeOutput(payload: unknown): NormalizedOutput {
  if (!payload || typeof payload !== "object") {
    return { summary: null, cards: [] };
  }

  const obj = payload as Record<string, unknown>;
  const summary = typeof obj.summary === "string" ? obj.summary : null;
  const generatedAt = typeof obj.generated_at === "string" ? obj.generated_at : undefined;
  const cards = Array.isArray(obj.cards)
    ? (obj.cards
        .map((card) => {
          if (!card || typeof card !== "object") return null;
          const cObj = card as Record<string, unknown>;
          const position =
            typeof cObj.position === "number"
              ? cObj.position
              : typeof cObj.position_index === "number"
              ? cObj.position_index
              : 0;
          const cardCode =
            typeof cObj.card === "string"
              ? cObj.card
              : typeof cObj.card_code === "string"
              ? cObj.card_code
              : null;
          if (!cardCode) return null;
          const reversed = Boolean(cObj.reversed);
          return { position, card_code: cardCode, reversed };
        })
        .filter(Boolean) as NormalizedOutputCard[])
    : [];

  return { summary, generatedAt, cards };
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
  const [inputMeta, setInputMeta] = useState<ReadingInputMeta | null>(null);

  const cardNameMap = useMemo(() => {
    const map = new Map<string, string>();
    RWS_ALL.forEach((name) => {
      const code = mapCardNameToCode(name);
      if (code) {
        map.set(code, name);
      }
    });
    return map;
  }, []);

  const fetchReading = useCallback(
    async (readingId: string, options?: { silent?: boolean }) => {
      if (!options?.silent) {
        setLoading(true);
      }
      setError(null);
      try {
        const response = await getReading(readingId);
        const normalized = normalizeReading(response);
        if (!normalized) {
          setError("Расклад ещё не готов. Попробуйте чуть позже.");
          setReading(null);
        } else {
          setReading(normalized);
        }
        setInputMeta(extractInputMeta(response.input_payload));
      } catch (err) {
        const message = err instanceof Error ? err.message : "Не удалось загрузить интерпретацию";
        setError(message);
        setReading((prev) => prev);
      } finally {
        if (!options?.silent) {
          setLoading(false);
        }
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
    const silent = Boolean(initialReading);
    void fetchReading(id, { silent });
  }, [fetchReading, id, initialReading]);

  const output = useMemo(() => normalizeOutput(reading?.output_payload), [reading?.output_payload]);
  const cards = output.cards;
  const questionText = inputMeta?.question ?? "Вопрос не указан";
  const deckTitle =
    (inputMeta?.deckId && DECKS.find((deck) => deck.id === inputMeta.deckId)?.title) || "Неизвестная колода";
  const spreadTitle = useMemo(() => {
    const spreadId = inputMeta?.spreadId;
    if (spreadId && (spreadId in RWS_SPREADS_MAP)) {
      return RWS_SPREADS_MAP[spreadId as SpreadId]?.title ?? "Расклад";
    }
    return "Расклад";
  }, [inputMeta?.spreadId]);
  const generatedAt = output.generatedAt;
  const summaryText = output.summary ?? reading?.summary_text ?? "Интерпретация готовится...";

  const cardDisplayList = cards.map((card) => {
    const friendlyName =
      cardNameMap.get(card.card_code) ??
      card.card_code.replace("RWS_", "").replaceAll("_", " ").replace(/\s+/g, " ").trim();
    return {
      ...card,
      displayName: friendlyName
    };
  });

  return (
    <div className="space-y-5 text-[var(--text-primary)]">
      <Button
        variant="outline"
        className="group gap-2 border-white/15 bg-[var(--bg-card)]/70 text-[var(--text-primary)] hover:bg-[var(--bg-card-strong)]"
        onClick={() => navigate("/spreads")}
      >
        <ArrowLeft className="h-4 w-4 text-[var(--accent-pink)] transition-transform group-hover:-translate-x-1" strokeWidth={1.4} />
        Вернуться к колодам
      </Button>

      <div className="rounded-[28px] border border-white/10 bg-[var(--bg-card)]/85 p-5 backdrop-blur-2xl shadow-[0_35px_70px_rgba(0,0,0,0.65)]">
        <div className="flex items-center gap-3 text-xs uppercase tracking-[0.35em] text-[var(--text-tertiary)]">
          <Sparkles className="h-5 w-5 text-[var(--accent-gold)]" strokeWidth={1.4} />
          <span>Интерпретация расклада</span>
        </div>
        <h1 className="mt-3 text-3xl font-semibold mystic-heading text-[var(--accent-pink)]">Послание вашей карты</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Расклад № {reading?.id ?? id} •{" "}
          {generatedAt
            ? new Date(generatedAt).toLocaleString("ru-RU", {
                hour: "2-digit",
                minute: "2-digit",
                day: "2-digit",
                month: "2-digit"
              })
            : "ожидание данных"}
        </p>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          {spreadTitle} • {deckTitle}
        </p>
      </div>

      {loading && <LoadingTarot message="Готовим красивую интерпретацию" subMessage="Колода перетасовывается..." />}

      {!loading && error && (
        <div className="space-y-4 rounded-[28px] border border-red-500/40 bg-red-500/10 p-5 text-red-100 shadow-[0_35px_70px_rgba(0,0,0,0.6)]">
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
        <div className="space-y-4 rounded-[28px] border border-white/10 bg-[var(--bg-card)]/85 p-5">
          <p className="text-xs uppercase tracking-[0.35em] text-[var(--text-tertiary)]">Вопрос</p>
          <p className="text-base text-[var(--text-primary)]">{questionText}</p>
        </div>

        <div className="flex gap-3 overflow-x-auto rounded-[28px] border border-white/10 bg-[var(--bg-card)]/70 p-4">
          {cardDisplayList.length > 0 ? (
            cardDisplayList.map((card) => (
              <div
                key={`${card.position}-${card.card_code}`}
                className="flex min-w-[120px] flex-col items-center justify-center rounded-2xl border border-white/10 bg-[var(--bg-card-strong)]/90 p-3 text-center text-xs text-[var(--text-secondary)] shadow-[0_20px_40px_rgba(0,0,0,0.6)]"
              >
                <div className="mb-2 flex h-36 w-full items-center justify-center rounded-xl border border-white/15 bg-gradient-to-b from-[var(--accent-pink)]/15 to-transparent px-2 text-[var(--text-secondary)]">
                  {card.displayName}
                </div>
                <p className="font-semibold uppercase tracking-[0.2em] text-[var(--accent-gold)]">{card.position}</p>
                <p className="mt-1 text-[11px] opacity-80">
                  {card.displayName}
                  {card.reversed ? " • Перевёрнута" : ""}
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm text-[var(--text-secondary)]">Данные по картам появятся сразу после генерации.</p>
          )}
        </div>

        <div className="space-y-4 rounded-[28px] border border-[var(--accent-gold)]/40 bg-gradient-to-br from-[var(--accent-pink)]/20 to-transparent p-5 text-[var(--text-primary)] shadow-[0_40px_80px_rgba(0,0,0,0.65)]">
          <p className="text-xs uppercase tracking-[0.3em] text-[var(--accent-gold)]/80">Краткий итог</p>
          <p className="text-lg font-semibold leading-relaxed">{summaryText}</p>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-[var(--bg-card)]/85 p-5 text-sm text-[var(--text-primary)]">
          <p className="text-xs uppercase tracking-[0.3em] text-[var(--text-tertiary)]">Карты</p>
          <ul className="mt-3 space-y-2 text-base leading-relaxed">
            {cardDisplayList.length > 0 ? (
              cardDisplayList.map((card) => (
                <li key={`${card.position}-${card.card_code}`}>
                  {card.position}. {card.displayName} {card.reversed ? "(перевернута)" : ""}
                  </li>
                ))
              ) : (
                <li>Карты появятся после генерации.</li>
              )}
            </ul>
          </div>

        <Button className="w-full border border-white/15 bg-[var(--bg-card)]/60 text-[var(--text-primary)] hover:bg-[var(--bg-card-strong)]" onClick={() => alert("Скоро будет реализовано")}>
          Записать расклад в дневник
        </Button>
      </div>
      )}
    </div>
  );
}
