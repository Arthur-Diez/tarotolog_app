import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Sparkles } from "lucide-react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { toBlob } from "html-to-image";

import { Button } from "@/components/ui/button";
import { LoadingTarot } from "@/components/tarot/LoadingTarot";
import { createShare, getReading, type ReadingResponse, type ViewReadingResponse } from "@/lib/api";
import { DECKS } from "@/data/decks";
import { RWS_SPREADS_MAP, type SpreadId } from "@/data/rws_spreads";
import { RWS_ALL } from "@/data/rws_deck";
import { mapCardNameToCode } from "@/lib/cardCode";
import { SPREAD_SCHEMAS } from "@/data/spreadSchemas";
import { faceUrl } from "@/lib/cardAsset";
import ShareCard from "@/components/sections/ShareCard";

interface LocationState {
  reading?: ViewReadingResponse;
}

interface ReadingInputMeta {
  question: string | null;
  deckId: string | null;
  spreadId: string | null;
  cards: Array<{ position: number; card_code: string; reversed: boolean }>;
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
    return { question: null, deckId: null, spreadId: null, cards: [] };
  }

  const obj = payload as Record<string, unknown>;
  const question = typeof obj.question === "string" ? obj.question : null;
  const deckId = typeof obj.deck_id === "string" ? obj.deck_id : null;
  const spreadId = typeof obj.spread_id === "string" ? obj.spread_id : null;
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
            typeof cObj.card_code === "string"
              ? cObj.card_code
              : typeof cObj.card === "string"
              ? cObj.card
              : null;
          if (!cardCode) return null;
          return { position, card_code: cardCode, reversed: Boolean(cObj.reversed) };
        })
        .filter(Boolean) as Array<{ position: number; card_code: string; reversed: boolean }>)
    : [];

  return { question, deckId, spreadId, cards };
}

function coerceObject(payload: unknown): Record<string, unknown> | null {
  if (!payload) return null;
  if (typeof payload === "object") return payload as Record<string, unknown>;
  if (typeof payload === "string") {
    try {
      const parsed = JSON.parse(payload);
      if (parsed && typeof parsed === "object") return parsed as Record<string, unknown>;
    } catch {
      return null;
    }
  }
  return null;
}

function normalizeOutput(payload: unknown): NormalizedOutput {
  const obj = coerceObject(payload);
  if (!obj) {
    return { summary: null, cards: [] };
  }

  const summary =
    typeof obj.summary === "string"
      ? obj.summary
      : typeof obj.interpretation === "string"
      ? obj.interpretation
      : null;
  const generatedAt = typeof obj.generated_at === "string" ? obj.generated_at : undefined;
  const cardsSource =
    (Array.isArray(obj.cards) && obj.cards) ||
    (obj.result && typeof obj.result === "object" && Array.isArray((obj.result as Record<string, unknown>).cards)
      ? ((obj.result as Record<string, unknown>).cards as unknown[])
      : null) ||
    (obj.output && typeof obj.output === "object" && Array.isArray((obj.output as Record<string, unknown>).cards)
      ? ((obj.output as Record<string, unknown>).cards as unknown[])
      : null);
  const cards = Array.isArray(cardsSource)
    ? (cardsSource
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

function normalizeSummaryText(raw: string | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  const cleaned = trimmed
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .replace(/^json\s*/i, "")
    .trim();
  if (cleaned.startsWith("{") && cleaned.endsWith("}")) {
    try {
      const parsed = JSON.parse(cleaned) as Record<string, unknown>;
      if (typeof parsed.summary === "string" && parsed.summary.trim()) {
        return parsed.summary.trim();
      }
    } catch {
      // fall through to raw text
    }
  }
  return cleaned;
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
  const [shareStatus, setShareStatus] = useState<"idle" | "uploading" | "ready" | "error">("idle");
  const [shareError, setShareError] = useState<string | null>(null);
  const shareRef = useRef<HTMLDivElement | null>(null);

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
  const cards = output.cards.length > 0 ? output.cards : inputMeta?.cards ?? [];
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
  const summaryText =
    normalizeSummaryText(output.summary ?? reading?.summary_text ?? null) ?? "Интерпретация готовится...";

  const positionLabelMap = useMemo(() => {
    const spreadId = inputMeta?.spreadId;
    if (!spreadId || !(spreadId in SPREAD_SCHEMAS)) {
      return new Map<number, string>();
    }
    const map = new Map<number, string>();
    SPREAD_SCHEMAS[spreadId as SpreadId].positions.forEach((pos) => {
      map.set(pos.id, pos.label);
    });
    return map;
  }, [inputMeta?.spreadId]);

  const cardDisplayList = cards.map((card) => {
    const assetName = cardNameMap.get(card.card_code) ?? null;
    const friendlyName =
      assetName ??
      card.card_code.replace("RWS_", "").replaceAll("_", " ").replace(/\s+/g, " ").trim();
    return {
      ...card,
      displayName: friendlyName,
      assetName,
      positionLabel: positionLabelMap.get(card.position) ?? `Позиция ${card.position}`
    };
  });

  const shareCards = cardDisplayList.map((card) => ({
    name: card.displayName,
    positionLabel: card.positionLabel,
    imageSrc: card.assetName ? faceUrl("rws", card.assetName) : null,
    reversed: card.reversed
  }));

  const handleShare = useCallback(async () => {
    if (!reading?.id) {
      setShareError("Не удалось определить расклад для отправки.");
      setShareStatus("error");
      return;
    }
    if (!shareRef.current) {
      setShareError("Не удалось подготовить карточку для отправки.");
      setShareStatus("error");
      return;
    }

    setShareStatus("uploading");
    setShareError(null);

    try {
      const height = shareRef.current.scrollHeight || shareRef.current.clientHeight || 1;
      const blob = await toBlob(shareRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        width: 900,
        height
      });
      if (!blob) {
        throw new Error("Не удалось создать изображение.");
      }

      const response = await createShare({ reading_id: reading.id, image: blob });
      const query = `share_reading:${response.share_token}`;
      const tg = window.Telegram?.WebApp;
      if (!tg?.switchInlineQuery) {
      throw new Error("Telegram WebApp не поддерживает отправку.");
      }

      // какие чаты разрешить: users / groups / channels / bots
      tg.switchInlineQuery(query, ["users", "groups", "channels", "bots"] as any);
      setShareStatus("ready");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Не удалось отправить расклад.";
      setShareError(message);
      setShareStatus("error");
    }
  }, [reading?.id]);

  return (
    <div className="space-y-5 pb-24 text-[var(--text-primary)]">
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

        <div className="space-y-4 rounded-[28px] border border-[var(--accent-gold)]/40 bg-gradient-to-br from-[var(--accent-pink)]/20 to-transparent p-5 text-[var(--text-primary)] shadow-[0_40px_80px_rgba(0,0,0,0.65)]">
          <p className="text-xs uppercase tracking-[0.3em] text-[var(--accent-gold)]/80">Интерпретация расклада</p>
          <p className="text-lg font-semibold leading-relaxed">{summaryText}</p>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-[var(--bg-card)]/85 p-5 text-sm text-[var(--text-primary)]">
          <p className="text-xs uppercase tracking-[0.3em] text-[var(--text-tertiary)]">Карты</p>
          {cardDisplayList.length > 0 ? (
            <div className="mt-4 grid grid-cols-2 gap-3">
              {cardDisplayList.map((card) => (
                <div
                  key={`${card.position}-${card.card_code}`}
                  className="flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-[var(--bg-card-strong)]/80 p-3 text-center"
                >
                  {card.assetName ? (
                    <img
                      src={faceUrl("rws", card.assetName)}
                      alt={card.displayName}
                      className="h-28 w-20 rounded-lg object-cover shadow-[0_12px_24px_rgba(0,0,0,0.45)]"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-28 w-20 items-center justify-center rounded-lg border border-white/15 bg-white/5 text-[10px] text-white/70">
                      {card.displayName}
                    </div>
                  )}
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-[var(--text-primary)]">{card.displayName}</p>
                    <p className="text-[11px] text-[var(--text-secondary)]">
                      {card.positionLabel}
                      {card.reversed ? " • Перевёрнута" : ""}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-[var(--text-secondary)]">Карты пока не доступны.</p>
          )}
        </div>

        <Button
          className="w-full"
          onClick={handleShare}
          disabled={shareStatus === "uploading"}
        >
          {shareStatus === "uploading" ? "Готовим карточку..." : "Поделиться"}
        </Button>
        <Button
          variant="outline"
          className="w-full border-white/20 text-white"
          onClick={() => alert("Скоро будет реализовано")}
        >
          Записать расклад в дневник
        </Button>
        {shareStatus === "ready" && <p className="text-center text-xs text-white/70">Готово ✅</p>}
        {shareStatus === "error" && shareError && (
          <p className="text-center text-xs text-red-200">{shareError}</p>
        )}
      </div>
      )}
      <div className="pointer-events-none absolute left-[-9999px] top-0" aria-hidden="true">
        <ShareCard
          ref={shareRef}
          title="Послание вашей карты"
          spreadTitle={spreadTitle}
          deckTitle={deckTitle}
          question={questionText}
          summary={summaryText}
          cards={shareCards}
        />
      </div>
    </div>
  );
}
