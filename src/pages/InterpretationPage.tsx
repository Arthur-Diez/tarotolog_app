import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Loader2, Sparkles } from "lucide-react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { toBlob } from "html-to-image";

import { Button } from "@/components/ui/button";
import CardFaceImage from "@/components/tarot/CardFaceImage";
import { LoadingTarot } from "@/components/tarot/LoadingTarot";
import { ApiError, createShare, getReading, type ReadingResponse, type ViewReadingResponse } from "@/lib/api";
import { DECKS } from "@/data/decks";
import { ANGELS_ALL_LIST } from "@/data/angels_deck";
import { ANGELS_SPREADS_MAP } from "@/data/angels_spreads";
import { GOLDEN_ALL_LIST } from "@/data/golden_deck";
import { GOLDEN_SPREADS_MAP } from "@/data/golden_spreads";
import { LENORMAND_ALL } from "@/data/lenormand_deck";
import { LENORMAND_SPREADS_MAP } from "@/data/lenormand_spreads";
import { MANARA_ALL } from "@/data/manara_deck";
import { MANARA_SPREADS_MAP } from "@/data/manara_spreads";
import { METAPHORIC_ALL_LIST } from "@/data/metaphoric_deck";
import { METAPHORIC_SPREADS_MAP } from "@/data/metaphoric_spreads";
import { SILA_RODA_ALL_LIST } from "@/data/sila_roda_deck";
import { SILA_RODA_SPREADS_MAP } from "@/data/sila_roda_spreads";
import { RWS_SPREADS_MAP, type SpreadId } from "@/data/rws_spreads";
import { RWS_ALL } from "@/data/rws_deck";
import { mapCardNameToCode, mapCardValueToCode } from "@/lib/cardCode";
import { SPREAD_SCHEMAS } from "@/data/spreadSchemas";
import { faceUrl } from "@/lib/cardAsset";
import ShareCard from "@/components/sections/ShareCard";
import { isDeckWithReversals, normalizeCardReversedForDeck } from "@/lib/tarotOrientation";
import { openInlineQueryWithFallback } from "@/lib/telegram";
import { API_BASE } from "@/lib/api";
import "./InterpretationPage.css";

interface LocationState {
  reading?: ViewReadingResponse;
}

interface ReadingInputMeta {
  question: string | null;
  kind: string | null;
  deckId: string | null;
  spreadId: string | null;
  cards: Array<{ position: number; card_code: string; reversed: boolean }>;
}

interface NormalizedOutputCard {
  position: number;
  positionLabel: string | null;
  card_code: string;
  reversed: boolean;
  meaning: string | null;
}

interface NormalizedOutput {
  headline: string | null;
  summary: string | null;
  coreTheme: string | null;
  dynamics: string | null;
  risks: string | null;
  opportunities: string | null;
  advice: string | null;
  generatedAt?: string;
  cards: NormalizedOutputCard[];
}

const SHARE_IMAGE_MAX_BYTES = 8 * 1024 * 1024;
const SHARE_CAPTURE_WIDTH = 1080;
const SHARE_CAPTURE_PIXEL_RATIOS = [2.4, 2.1, 1.8, 1.6, 1.4, 1.2, 1] as const;

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
    return { question: null, kind: null, deckId: null, spreadId: null, cards: [] };
  }

  const obj = payload as Record<string, unknown>;
  const question = typeof obj.question === "string" ? obj.question : null;
  const kind = typeof obj.kind === "string" ? obj.kind : null;
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
          const normalizedCode = mapCardValueToCode(cardCode);
          if (!normalizedCode) return null;
          return { position, card_code: normalizedCode, reversed: Boolean(cObj.reversed) };
        })
        .filter(Boolean) as Array<{ position: number; card_code: string; reversed: boolean }>)
    : [];

  return { question, kind, deckId, spreadId, cards };
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
    return {
      headline: null,
      summary: null,
      coreTheme: null,
      dynamics: null,
      risks: null,
      opportunities: null,
      advice: null,
      cards: []
    };
  }

  const pickText = (...values: unknown[]): string | null => {
    for (const value of values) {
      if (typeof value === "string" && value.trim()) return value.trim();
    }
    return null;
  };

  const headline = pickText(obj.headline);
  const summary = pickText(obj.summary, obj.interpretation);
  const coreTheme = pickText(obj.core_theme, obj.coreTheme);
  const dynamics = pickText(obj.dynamics);
  const risks = pickText(obj.risks);
  const opportunities = pickText(obj.opportunities);
  const advice = pickText(obj.advice);
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
          const rawCard =
            typeof cObj.card === "string"
              ? cObj.card
              : typeof cObj.card_code === "string"
              ? cObj.card_code
              : null;
          if (!rawCard) return null;
          const cardCode = mapCardValueToCode(rawCard);
          if (!cardCode) return null;
          const reversed = typeof cObj.reversed === "boolean" ? cObj.reversed : cObj.orientation === "reversed";
          const positionLabel = typeof cObj.position_label === "string" ? cObj.position_label : null;
          const meaning = pickText(cObj.meaning, cObj.interpretation, cObj.note);
          return { position, positionLabel, card_code: cardCode, reversed, meaning };
        })
        .filter(Boolean) as NormalizedOutputCard[])
    : [];

  return { headline, summary, coreTheme, dynamics, risks, opportunities, advice, generatedAt, cards };
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
  const [activeSection, setActiveSection] = useState<"question" | "accent" | "summary" | "analysis" | "cards">("question");
  const [showStickyNav, setShowStickyNav] = useState(false);
  const shareRef = useRef<HTMLDivElement | null>(null);
  const heroRef = useRef<HTMLDivElement | null>(null);
  const questionRef = useRef<HTMLDivElement | null>(null);
  const accentRef = useRef<HTMLDivElement | null>(null);
  const summaryRef = useRef<HTMLDivElement | null>(null);
  const analysisRef = useRef<HTMLDivElement | null>(null);
  const cardsRef = useRef<HTMLDivElement | null>(null);

  const cardNameMapByDeck = useMemo(() => {
    const buildMap = (
      deckId: "rws" | "lenormand" | "manara" | "angels" | "golden" | "ancestry" | "metaphoric",
      cards: string[]
    ) => {
      const map = new Map<string, string>();
      cards.forEach((name) => {
        const code = mapCardNameToCode(name, deckId);
        if (code) {
          map.set(code, name);
        }
      });
      return map;
    };

    return {
      rws: buildMap("rws", RWS_ALL),
      lenormand: buildMap("lenormand", LENORMAND_ALL),
      manara: buildMap("manara", MANARA_ALL),
      angels: buildMap("angels", ANGELS_ALL_LIST),
      golden: buildMap("golden", GOLDEN_ALL_LIST),
      ancestry: buildMap("ancestry", SILA_RODA_ALL_LIST),
      metaphoric: buildMap("metaphoric", METAPHORIC_ALL_LIST)
    } as const;
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
  const outputCardByPosition = useMemo(() => {
    const map = new Map<number, NormalizedOutputCard>();
    output.cards.forEach((card) => {
      map.set(card.position, card);
    });
    return map;
  }, [output.cards]);
  // Source of truth for drawn cards is input_payload; model output can vary in formatting.
  const cards = useMemo(() => {
    if (inputMeta?.cards?.length) {
      return [...inputMeta.cards].sort((a, b) => a.position - b.position);
    }
    return output.cards
      .map((card) => ({ position: card.position, card_code: card.card_code, reversed: card.reversed }))
      .sort((a, b) => a.position - b.position);
  }, [inputMeta?.cards, output.cards]);
  const questionText = inputMeta?.question ?? "Вопрос не указан";
  const displayQuestionText = useMemo(() => {
    const kind = (inputMeta?.kind || "").trim().toLowerCase();
    if (kind === "daily_card_unlock") {
      return "Что важно понять в энергии этого дня и на что мне стоит обратить внимание сегодня?";
    }
    return questionText;
  }, [inputMeta?.kind, questionText]);
  const deckTitle =
    (inputMeta?.deckId && DECKS.find((deck) => deck.id === inputMeta.deckId)?.title) || "Неизвестная колода";
  const resolvedDeckId = useMemo(() => {
    if (
      inputMeta?.deckId &&
      inputMeta.deckId in { rws: true, lenormand: true, manara: true, angels: true, golden: true, ancestry: true, metaphoric: true }
    ) {
      return inputMeta.deckId as "rws" | "lenormand" | "manara" | "angels" | "golden" | "ancestry" | "metaphoric";
    }
    const spreadId = inputMeta?.spreadId;
    if (spreadId && spreadId in SPREAD_SCHEMAS) {
      return SPREAD_SCHEMAS[spreadId as SpreadId].deckType;
    }
    if (cards.some((card) => card.card_code.startsWith("LENORMAND_"))) {
      return "lenormand";
    }
    if (cards.some((card) => card.card_code.startsWith("MANARA_"))) {
      return "manara";
    }
    if (cards.some((card) => card.card_code.startsWith("ANGELS_"))) {
      return "angels";
    }
    if (cards.some((card) => card.card_code.startsWith("GOLDEN_"))) {
      return "golden";
    }
    if (cards.some((card) => card.card_code.startsWith("SILA_RODA_"))) {
      return "ancestry";
    }
    if (cards.some((card) => card.card_code.startsWith("METAPHORIC_"))) {
      return "metaphoric";
    }
    return "rws";
  }, [cards, inputMeta?.deckId, inputMeta?.spreadId]);
  const spreadTitle = useMemo(() => {
    const spreadId = inputMeta?.spreadId;
    if (spreadId && (spreadId in RWS_SPREADS_MAP)) {
      return RWS_SPREADS_MAP[spreadId as keyof typeof RWS_SPREADS_MAP]?.title ?? "Расклад";
    }
    if (spreadId && spreadId in LENORMAND_SPREADS_MAP) {
      return LENORMAND_SPREADS_MAP[spreadId as keyof typeof LENORMAND_SPREADS_MAP]?.title ?? "Расклад";
    }
    if (spreadId && spreadId in MANARA_SPREADS_MAP) {
      return MANARA_SPREADS_MAP[spreadId as keyof typeof MANARA_SPREADS_MAP]?.title ?? "Расклад";
    }
    if (spreadId && spreadId in ANGELS_SPREADS_MAP) {
      return ANGELS_SPREADS_MAP[spreadId as keyof typeof ANGELS_SPREADS_MAP]?.title ?? "Расклад";
    }
    if (spreadId && spreadId in GOLDEN_SPREADS_MAP) {
      return GOLDEN_SPREADS_MAP[spreadId as keyof typeof GOLDEN_SPREADS_MAP]?.title ?? "Расклад";
    }
    if (spreadId && spreadId in SILA_RODA_SPREADS_MAP) {
      return SILA_RODA_SPREADS_MAP[spreadId as keyof typeof SILA_RODA_SPREADS_MAP]?.title ?? "Расклад";
    }
    if (spreadId && spreadId in METAPHORIC_SPREADS_MAP) {
      return METAPHORIC_SPREADS_MAP[spreadId as keyof typeof METAPHORIC_SPREADS_MAP]?.title ?? "Расклад";
    }
    return "Расклад";
  }, [inputMeta?.spreadId]);
  const headlineText = normalizeSummaryText(output.headline ?? null);
  const summaryText = normalizeSummaryText(output.summary ?? reading?.summary_text ?? null) ?? "Интерпретация готовится...";
  const analysisSections = [
    { key: "core_theme", title: "Главная тема", text: normalizeSummaryText(output.coreTheme) },
    { key: "dynamics", title: "Динамика ситуации", text: normalizeSummaryText(output.dynamics) },
    { key: "risks", title: "Риски", text: normalizeSummaryText(output.risks) },
    { key: "opportunities", title: "Возможности", text: normalizeSummaryText(output.opportunities) },
    { key: "advice", title: "Практический совет", text: normalizeSummaryText(output.advice) }
  ].filter((section) => Boolean(section.text));

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

  const activeDeckCardNameMap = cardNameMapByDeck[resolvedDeckId];

  const cardDisplayList = cards.map((card) => {
    const outputCard = outputCardByPosition.get(card.position);
    const reversed = normalizeCardReversedForDeck(resolvedDeckId, card.reversed);
    const assetName = activeDeckCardNameMap.get(card.card_code) ?? null;
    const friendlyName =
      assetName ??
      card.card_code
        .replace(/^RWS_/, "")
        .replace(/^LENORMAND_/, "")
        .replace(/^MANARA_/, "")
        .replace(/^ANGELS_/, "")
        .replace(/^GOLDEN_/, "")
        .replace(/^SILA_RODA_/, "")
        .replace(/^METAPHORIC_/, "")
        .replace(/^\d{2}_/, "")
        .replaceAll("_", " ")
        .replace(/\s+/g, " ")
        .trim();
    return {
      ...card,
      reversed,
      displayName: friendlyName,
      assetName,
      positionLabel: outputCard?.positionLabel ?? positionLabelMap.get(card.position) ?? `Позиция ${card.position}`,
      meaning: normalizeSummaryText(outputCard?.meaning ?? null)
    };
  });

  const shareCards = cardDisplayList.map((card) => ({
    name: card.displayName,
    positionLabel: card.positionLabel,
    imageSrc: card.assetName ? faceUrl(resolvedDeckId, card.assetName) : null,
    reversed: normalizeCardReversedForDeck(resolvedDeckId, card.reversed),
    meaning: card.meaning
  }));
  const reversedCount = shareCards.filter((card) => card.reversed).length;
  const heroPreviewCards = shareCards.slice(0, Math.min(5, shareCards.length));
  const heroChips = [
    `${cards.length} ${cards.length === 1 ? "карта" : cards.length < 5 ? "карты" : "карт"}`,
    reversedCount > 0 ? `${reversedCount} перевёрнут${reversedCount === 1 ? "ая" : reversedCount < 5 ? "ые" : "ых"}` : null,
    deckTitle
  ].filter(Boolean) as string[];
  const stickySections = [
    { key: "question" as const, label: "Вопрос", ref: questionRef },
    { key: "accent" as const, label: "Акцент", ref: accentRef },
    { key: "summary" as const, label: "Итог", ref: summaryRef },
    { key: "analysis" as const, label: "Анализ", ref: analysisRef },
    { key: "cards" as const, label: "Карты", ref: cardsRef }
  ];

  const shareSections = analysisSections
    .map((section) => ({
      title: section.title,
      text: section.text ?? ""
    }))
    .filter((section) => section.text.trim().length > 0);

  const [shareHintOpen, setShareHintOpen] = useState(false);
  const [pendingShareQuery, setPendingShareQuery] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const handleScroll = () => {
      const heroBottom = heroRef.current?.getBoundingClientRect().bottom ?? 0;
      setShowStickyNav(heroBottom < 88);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || typeof IntersectionObserver === "undefined") return undefined;
    const sections = stickySections
      .map((section) => {
        const node = section.ref.current;
        return node ? { key: section.key, node } : null;
      })
      .filter(Boolean) as Array<{ key: "question" | "accent" | "summary" | "analysis" | "cards"; node: HTMLDivElement }>;
    if (sections.length === 0) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible) return;
        const matched = sections.find((section) => section.node === visible.target);
        if (matched) setActiveSection(matched.key);
      },
      {
        rootMargin: "-22% 0px -58% 0px",
        threshold: [0.15, 0.35, 0.6]
      }
    );

    sections.forEach((section) => observer.observe(section.node));
    return () => observer.disconnect();
  }, [cards.length, headlineText, loading, reading, stickySections]);

  const buildShareBlob = useCallback(async (): Promise<Blob> => {
    if (!shareRef.current) {
      throw new Error("Не удалось подготовить карточку для отправки.");
    }
    const height = shareRef.current.scrollHeight || shareRef.current.clientHeight || 1;
    let fallbackBlob: Blob | null = null;

    for (const pixelRatio of SHARE_CAPTURE_PIXEL_RATIOS) {
      const blob = await toBlob(shareRef.current, {
        cacheBust: true,
        pixelRatio,
        width: SHARE_CAPTURE_WIDTH,
        height
      });
      if (!blob) {
        continue;
      }
      fallbackBlob = blob;
      if (blob.size <= SHARE_IMAGE_MAX_BYTES) {
        return blob;
      }
    }

    if (fallbackBlob) {
      return fallbackBlob;
    }
    throw new Error("Не удалось создать изображение.");
  }, []);

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
      const blob = await buildShareBlob();
      if (blob.size > SHARE_IMAGE_MAX_BYTES) {
        throw new Error("Расклад слишком объёмный для отправки изображением. Сократите длину интерпретации и попробуйте снова.");
      }

      const response = await createShare({ reading_id: reading.id, image: blob });
      const query = `share_reading:${response.share_token}`;
      setPendingShareQuery(query);
      setShareHintOpen(true);
      setShareStatus("ready");
    } catch (err) {
      let message = err instanceof Error ? err.message : "Не удалось отправить расклад.";
      if (err instanceof ApiError) {
        const detail =
          err.payload && typeof err.payload === "object" && "detail" in (err.payload as Record<string, unknown>)
            ? (err.payload as Record<string, unknown>).detail
            : undefined;
        if (detail === "image_too_large") {
          message = "Картинка получилась слишком тяжёлой. Попробуйте снова: мы автоматически уменьшим качество.";
        } else if (detail === "empty_image") {
          message = "Не удалось сформировать изображение для отправки. Повторите попытку.";
        }
      }
      setShareError(message);
      setShareStatus("error");
    }
  }, [buildShareBlob, reading?.id]);

  const handleShareHintConfirm = useCallback(() => {
    if (!pendingShareQuery) {
      setShareError("Telegram WebApp не поддерживает отправку.");
      setShareStatus("error");
      setShareHintOpen(false);
      return;
    }

    const token = pendingShareQuery.startsWith("share_reading:")
      ? pendingShareQuery.replace("share_reading:", "").trim()
      : "";
    const fallbackUrl = token
      ? `${API_BASE}/share/${encodeURIComponent(token)}/image`
      : "https://t.me/Tarotolog_bot/tarotolog_ai";

    const result = openInlineQueryWithFallback({
      inlineQuery: pendingShareQuery,
      fallbackUrl,
      fallbackText: "Мой расклад в Tarotolog AI ✨"
    });

    if (result.error && result.mode !== "fallback") {
      setShareError("Не удалось открыть список чатов для отправки.");
      setShareStatus("error");
      setShareHintOpen(false);
      return;
    }

    setShareHintOpen(false);
  }, [pendingShareQuery]);

  const scrollToSection = useCallback((targetRef: { current: HTMLDivElement | null }) => {
    targetRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  return (
    <div className="interpretation-page space-y-5 pb-24 text-[var(--text-primary)]">
      {shareHintOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 px-4">
          <div className="w-full max-w-sm rounded-[24px] border border-white/15 bg-[#17151f] p-4 text-[var(--text-primary)] shadow-[0_35px_70px_rgba(0,0,0,0.75)]">
            <div className="overflow-hidden rounded-[18px] border border-white/10">
              <img
                src="/assets/tarot/rws/share-instruction.png"
                alt="Инструкция отправки"
                className="h-auto w-full"
              />
            </div>
            <p className="mt-4 text-sm text-[var(--text-secondary)]">
              Перед отправкой нажмите на карточку с раскладом, затем поставьте зелёную галочку ✅.
            </p>
            <div className="mt-4 flex gap-3">
              <button
                className="flex-1 rounded-full border border-white/20 bg-transparent px-4 py-2 text-sm text-[var(--text-secondary)]"
                onClick={() => setShareHintOpen(false)}
              >
                Отмена
              </button>
              <button
                className="flex-1 rounded-full bg-[var(--accent-pink)] px-4 py-2 text-sm font-semibold text-white"
                onClick={handleShareHintConfirm}
              >
                Открыть чаты
              </button>
            </div>
          </div>
        </div>
      )}
      <Button
        variant="outline"
        className="group gap-2 border-white/15 bg-[var(--bg-card)]/70 text-[var(--text-primary)] hover:bg-[var(--bg-card-strong)]"
        onClick={() => navigate("/spreads")}
      >
        <ArrowLeft className="h-4 w-4 text-[var(--accent-pink)] transition-transform group-hover:-translate-x-1" strokeWidth={1.4} />
        Вернуться к колодам
      </Button>

      <div
        ref={heroRef}
        className="interpretation-hero rounded-[28px] border border-white/10 bg-[var(--bg-card)]/85 p-5 backdrop-blur-2xl shadow-[0_35px_70px_rgba(0,0,0,0.65)]"
      >
        <div className="flex items-center gap-3 text-xs uppercase tracking-[0.35em] text-[var(--text-tertiary)]">
          <Sparkles className="h-5 w-5 text-[var(--accent-gold)]" strokeWidth={1.4} />
          <span>Интерпретация расклада</span>
        </div>
        <h1 className="mt-3 text-3xl font-semibold mystic-heading text-[var(--accent-pink)]">Послание вашей карты</h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          {spreadTitle} • {deckTitle}
        </p>
        {heroChips.length > 0 ? (
          <div className="interpretation-hero-chips mt-4">
            {heroChips.map((chip) => (
              <span key={chip} className="interpretation-chip">
                {chip}
              </span>
            ))}
          </div>
        ) : null}
        {heroPreviewCards.length > 0 ? (
          <div className="interpretation-hero-cardrail mt-4" aria-hidden="true">
            {heroPreviewCards.map((card, index) => (
              <div
                key={`${card.name}-${card.positionLabel}-${index}`}
                className="interpretation-hero-card"
                style={{ zIndex: heroPreviewCards.length - index }}
              >
                {card.imageSrc ? (
                  <img
                    src={card.imageSrc}
                    alt=""
                    className={`h-full w-full rounded-[16px] object-cover ${card.reversed ? "rotate-180" : ""}`}
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center rounded-[16px] bg-white/5 text-[10px] text-white/60">
                    {card.name}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {!loading && !error && reading ? (
        <div className={`interpretation-sticky-nav ${showStickyNav ? "is-visible" : ""}`}>
          <div className="interpretation-sticky-nav-inner">
            {stickySections.map((section) => (
              <button
                key={section.key}
                type="button"
                className={`interpretation-sticky-pill ${activeSection === section.key ? "is-active" : ""}`}
                onClick={() => scrollToSection(section.ref)}
              >
                {section.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

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
          <div ref={questionRef} className="interpretation-card interpretation-card--question space-y-4 rounded-[28px] border border-white/10 bg-[var(--bg-card)]/85 p-5">
            <div className="interpretation-card-heading">
              <p className="text-xs uppercase tracking-[0.35em] text-[var(--text-tertiary)]">Вопрос</p>
            </div>
            <p className="text-base text-[var(--text-primary)]">{displayQuestionText}</p>
          </div>

          {headlineText ? (
            <div ref={accentRef} className="interpretation-card interpretation-card--accent space-y-2 rounded-[28px] border border-[var(--accent-pink)]/35 bg-gradient-to-br from-[var(--accent-pink)]/25 to-transparent p-5 text-[var(--text-primary)] shadow-[0_40px_80px_rgba(0,0,0,0.65)]">
              <div className="interpretation-card-heading interpretation-card-heading--accent">
                <p className="text-xs uppercase tracking-[0.3em] text-[var(--accent-gold)]/80">Ключевой акцент</p>
              </div>
              <p className="text-xl font-semibold leading-relaxed whitespace-pre-line break-words">{headlineText}</p>
            </div>
          ) : null}

          <div ref={summaryRef} className="interpretation-card interpretation-card--summary space-y-4 rounded-[28px] border border-[var(--accent-gold)]/40 bg-gradient-to-br from-[var(--accent-pink)]/20 to-transparent p-5 text-[var(--text-primary)] shadow-[0_40px_80px_rgba(0,0,0,0.65)]">
            <div className="interpretation-card-heading interpretation-card-heading--summary">
              <p className="text-xs uppercase tracking-[0.3em] text-[var(--accent-gold)]/80">Итоговая интерпретация</p>
            </div>
            <p className="text-lg font-semibold leading-relaxed whitespace-pre-line break-words">{summaryText}</p>
          </div>

          {analysisSections.length > 0 ? (
            <div ref={analysisRef} className="grid gap-3 md:grid-cols-2">
              {analysisSections.map((section) => (
                <div
                  key={section.key}
                  className={`interpretation-card interpretation-card--analysis is-${section.key} rounded-2xl border border-white/10 bg-[var(--bg-card)]/80 p-4`}
                >
                  <div className="interpretation-card-heading">
                    <p className="text-xs uppercase tracking-[0.24em] text-[var(--text-tertiary)]">{section.title}</p>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed whitespace-pre-line break-words text-[var(--text-primary)]">{section.text}</p>
                </div>
              ))}
            </div>
          ) : null}

          <div ref={cardsRef} className="interpretation-card interpretation-card--cards rounded-[28px] border border-white/10 bg-[var(--bg-card)]/85 p-5 text-sm text-[var(--text-primary)]">
            <div className="interpretation-card-heading">
              <p className="text-xs uppercase tracking-[0.3em] text-[var(--text-tertiary)]">Карты</p>
              <div className="interpretation-card-subchips">
                <span className="interpretation-chip interpretation-chip--subtle">{cards.length} {cards.length === 1 ? "позиция" : cards.length < 5 ? "позиции" : "позиций"}</span>
                {reversedCount > 0 ? (
                  <span className="interpretation-chip interpretation-chip--subtle">
                    {reversedCount} перевёрнут{reversedCount === 1 ? "ая" : reversedCount < 5 ? "ые" : "ых"}
                  </span>
                ) : null}
              </div>
            </div>
            {cardDisplayList.length > 0 ? (
              <div className="mt-4 space-y-3">
                {cardDisplayList.map((card) => {
                  return (
                    <div
                      key={`${card.position}-${card.card_code}`}
                      className="interpretation-card-item rounded-2xl border border-white/10 bg-[var(--bg-card-strong)]/80 p-3"
                    >
                      <div className="flex items-center gap-3">
                        {card.assetName ? (
                          <CardFaceImage
                            deckId={resolvedDeckId}
                            cardName={card.assetName}
                            alt={card.displayName}
                            className={`h-20 w-14 rounded-lg object-cover shadow-[0_12px_24px_rgba(0,0,0,0.45)] ${
                              card.reversed && isDeckWithReversals(resolvedDeckId) ? "rotate-180" : ""
                            }`}
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex h-20 w-14 items-center justify-center rounded-lg border border-white/15 bg-white/5 text-[10px] text-white/70">
                            {card.displayName}
                          </div>
                        )}
                        <div className="space-y-2">
                          <p className="text-sm font-semibold text-[var(--text-primary)]">{card.displayName}</p>
                          <div className="interpretation-card-meta">
                            <span className="interpretation-chip interpretation-chip--subtle">Позиция {card.position}</span>
                            <span className="interpretation-chip interpretation-chip--subtle">{card.positionLabel}</span>
                            {card.reversed && isDeckWithReversals(resolvedDeckId) ? (
                              <span className="interpretation-chip interpretation-chip--reversed">Перевёрнутая</span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                      {card.meaning ? <p className="mt-3 text-sm leading-relaxed whitespace-pre-line break-words text-[var(--text-primary)]">{card.meaning}</p> : null}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="mt-3 text-sm text-[var(--text-secondary)]">Карты пока не доступны.</p>
            )}
          </div>

          <div className="interpretation-action-zone rounded-[28px] border border-white/10 bg-[var(--bg-card)]/78 p-5">
            <p className="text-sm text-[var(--text-secondary)]">Сохраните расклад, чтобы вернуться к нему позже или поделиться им.</p>
            <div className="mt-4 space-y-3">
              <Button
                variant="primary"
                className="w-full gap-2"
                onClick={handleShare}
                disabled={shareStatus === "uploading"}
              >
                {shareStatus === "uploading" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Готовим карточку...
                  </>
                ) : (
                  "Поделиться"
                )}
              </Button>
              <Button
                variant="outline"
                className="w-full border-white/20 text-white"
                onClick={() => alert("Скоро будет реализовано")}
              >
                Записать расклад в дневник
              </Button>
            </div>
            {shareStatus === "uploading" && (
              <div className="mt-3 flex items-center justify-center gap-2 text-xs text-white/75">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--accent-gold)]" />
                <span>Создаём изображение для Telegram…</span>
              </div>
            )}
            {shareStatus === "ready" && <p className="mt-3 text-center text-xs text-white/70">Готово ✅</p>}
            {shareStatus === "error" && shareError && (
              <p className="mt-3 text-center text-xs text-red-200">{shareError}</p>
            )}
          </div>
        </div>
      )}
      <div className="pointer-events-none absolute left-[-9999px] top-0" aria-hidden="true">
        <ShareCard
          ref={shareRef}
          title="Послание вашей карты"
          spreadTitle={spreadTitle}
          deckTitle={deckTitle}
          question={displayQuestionText}
          headline={headlineText}
          summary={summaryText}
          sections={shareSections}
          cards={shareCards}
        />
      </div>
    </div>
  );
}
