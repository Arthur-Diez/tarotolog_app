import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Copy, Loader2, RefreshCw, Share2, Sparkles, Users, X, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { AdsgramTaskBanner } from "@/components/ads/AdsgramTaskBanner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useProfile } from "@/hooks/useProfile";
import {
  ApiError,
  completeEnergyRewardAd,
  createTelegramStarsPayment,
  createRobokassaPayment,
  getEnergyAdsState,
  getOfferPlacements,
  recordOfferEvent,
  getPaymentOffers,
  getReferralProgram,
  getTelegramStarsPaymentStatus,
  getPurchaseStatus,
  getWalletHistory,
  markPaymentOfferDismissed,
  markPaymentOfferExpired,
  startEnergyRewardAd,
  type EnergyAdsStateResponse,
  type PaymentOfferResponse,
  type PurchaseStatusResponse,
  type ReferralProgramResponse,
  type TelegramStarsPaymentStatusResponse,
  type WalletHistoryItemResponse
} from "@/lib/api";
import {
  getOfferSessionKey,
  hasOfferBeenDismissedInSession,
  hasOfferBeenShownInSession,
  markOfferDismissedInSession,
  markOfferShownInSession
} from "@/lib/offerSessionState";
import { detectCountryBySignals } from "@/lib/pricingRegion";
import {
  openExternalLink,
  openInlineQueryWithFallback,
  openTelegramInvoice,
  triggerHapticNotification
} from "@/lib/telegram";

const PENDING_PURCHASE_STORAGE_KEY = "tarotolog_pending_purchase";
const ENERGY_CURRENCY_STORAGE_KEY = "tarotolog_energy_currency";
const AUTO_STATUS_POLL_INTERVAL_MS = 12_000;
const AUTO_STATUS_POLL_MAX_ATTEMPTS = 12;
const STATUS_AUTO_HIDE_MS = 7000;
const BALANCE_ANIMATION_DURATION_MS = 850;
const BALANCE_DELTA_BADGE_DURATION_MS = 2600;
const ADS_COUNTDOWN_TICK_MS = 1000;
const ADS_STATE_REFETCH_DEBOUNCE_MS = 3000;
const OFFERS_COUNTDOWN_TICK_MS = 1000;
const DISCOUNT_TRIGGER_LABELS: Record<string, string> = {
  first_purchase: "Акция на первую покупку!",
  zero_balance: "Предложение при нулевом балансе",
  low_energy: "Предложение при низкой энергии",
  comeback: "С возвращением!",
  post_ads: "Бонус после рекламы",
  exit_intent: "Спецпредложение",
  scheduled: "Акция",
  manual: "Персональное предложение",
  vip: "VIP-предложение",
  personal: "Персональная акция"
};
const PAYWALL_TRIGGER_PRIORITY: Record<string, number> = {
  personal: 10,
  first_purchase: 20,
  zero_balance: 30,
  low_energy: 40,
  comeback: 50,
  exit_intent: 60,
  post_ads: 70,
  vip: 80,
  scheduled: 90,
  manual: 100
};
const TASK_ADSGRAM_BLOCK_ID =
  (import.meta as { env?: Record<string, string> }).env?.VITE_ADSGRAM_TASK_ID ?? "task-26361";
const OFFER_URL = "https://offer.tarotologai.ru";
const PRIVACY_URL = "https://privacy.tarotologai.ru";
const CONTACT_EMAIL = "tarotologai@gmail.com";

type PurchaseUiState = "idle" | "creating" | "awaiting_confirmation" | "succeeded" | "failed" | "pending";
type CurrencyCode = "RUB" | "USD" | "EUR";
type AdActionStage = "starting" | "completing";
type PaymentMethod = "robokassa" | "telegram_stars";
type ReferralShareLanguage = "ru" | "en";

interface PendingPurchaseStorage {
  entity_id: string;
  payment_method: PaymentMethod;
  invoice_id?: number | null;
  product_code?: string | null;
  offer_id?: string | null;
  created_at: string;
}

interface PurchaseNotice {
  tone: "success" | "error";
  title: string;
  message: string;
}

interface CurrencyOption {
  code: CurrencyCode;
  label: string;
}

interface PaymentStatusView {
  entity_id: string;
  payment_method: PaymentMethod;
  invoice_id?: number | null;
  status: string;
  currency: string;
  code: string | null;
  title: string | null;
  energy_credited: number;
}

interface OfferPositioning {
  displayName: string;
  eyebrow: string;
  summary: string;
  usageHint: string;
  outcome: string;
  cta: string;
}

interface OfferTriggerPresentation {
  badge: string | null;
  featuredSummary: string;
  secondarySummary: string;
  featuredCta: string | null;
  secondaryBadge: string | null;
}

interface PaymentMethodPresentation {
  title: string;
  body: string;
  featuredLabel: string;
  featuredButton: string;
  secondaryButton: string;
}

const CURRENCY_OPTIONS: CurrencyOption[] = [
  { code: "RUB", label: "₽ RUB" },
  { code: "USD", label: "$ USD" },
  { code: "EUR", label: "€ EUR" }
];

const PAYMENT_METHOD_OPTIONS: Array<{ code: PaymentMethod; label: string }> = [
  { code: "robokassa", label: "Карта" },
  { code: "telegram_stars", label: "Telegram Stars" }
];

const REFERRAL_SHARE_VARIANTS = [1, 2, 3, 4] as const;
const REFERRAL_SHARE_COPY: Record<
  ReferralShareLanguage,
  {
    languageLabel: string;
    inviteTitle: string;
    inviteCaption: string;
    inviteButton: string;
    instructionTitle: string;
    instructionText: string;
    confirmText: string;
    cancelText: string;
    fallbackText: string;
    previewBadge: string;
  }
> = {
  ru: {
    languageLabel: "Русский",
    inviteTitle: "✨ Tarotolog AI",
    inviteCaption:
      "Приходи в mini app и забирай бонусную энергию ⚡\n• +2 ⚡ за активацию\n• +10 ⚡ за первую покупку",
    inviteButton: "Получить бонус",
    instructionTitle: "Поделиться через Telegram",
    instructionText:
      "Выберите язык приглашения. В чатах нажмите именно на прикреплённую карточку с изображением над строкой @via Telegram и отправьте её зелёной галочкой ✅. Саму ссылку из строки @via отправлять не нужно.",
    confirmText: "Открыть чаты",
    cancelText: "Отмена",
    fallbackText: "Присоединяйся к Tarotolog AI и забирай бонусную энергию ⚡",
    previewBadge: "Приглашение"
  },
  en: {
    languageLabel: "English",
    inviteTitle: "✨ Tarotolog AI",
    inviteCaption:
      "Open the mini app and claim bonus energy ⚡\n• +2 ⚡ after activation\n• +10 ⚡ after the first purchase",
    inviteButton: "Claim bonus",
    instructionTitle: "Share via Telegram",
    instructionText:
      "Choose the invite language. In chats, tap the attached image card above the @via Telegram line and send it with the green check mark ✅. Do not send the raw @via link itself.",
    confirmText: "Open chats",
    cancelText: "Cancel",
    fallbackText: "Join Tarotolog AI and claim bonus energy ⚡",
    previewBadge: "Invite"
  }
};

const FAILED_STATUSES = new Set(["failed", "canceled", "cancelled", "refunded"]);
const EU_COUNTRY_CODES = new Set([
  "AT",
  "BE",
  "BG",
  "HR",
  "CY",
  "CZ",
  "DK",
  "EE",
  "FI",
  "FR",
  "DE",
  "GR",
  "HU",
  "IE",
  "IT",
  "LV",
  "LT",
  "LU",
  "MT",
  "NL",
  "PL",
  "PT",
  "RO",
  "SK",
  "SI",
  "ES",
  "SE"
]);

function isCurrencyCode(value: string | null | undefined): value is CurrencyCode {
  return value === "RUB" || value === "USD" || value === "EUR";
}

function normalizeReferralShareLanguage(value: string | null | undefined): ReferralShareLanguage {
  if (!value) return "ru";
  return value.toLowerCase().startsWith("en") ? "en" : "ru";
}

function pickReferralShareVariant(): (typeof REFERRAL_SHARE_VARIANTS)[number] {
  return REFERRAL_SHARE_VARIANTS[Math.floor(Math.random() * REFERRAL_SHARE_VARIANTS.length)] ?? 1;
}

function isTaskBlockId(value: string | null | undefined): value is string {
  return Boolean(value && /^task-\d+$/i.test(value.trim()));
}

function readPendingPurchase(): PendingPurchaseStorage | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(PENDING_PURCHASE_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PendingPurchaseStorage & { purchase_id?: string };
    const entityId = parsed?.entity_id || parsed?.purchase_id || null;
    if (!entityId) return null;
    const method = parsed?.payment_method || "robokassa";
    return {
      ...parsed,
      entity_id: entityId,
      payment_method: method
    };
  } catch {
    return null;
  }
}

function writePendingPurchase(purchase: PendingPurchaseStorage): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PENDING_PURCHASE_STORAGE_KEY, JSON.stringify(purchase));
}

function clearPendingPurchase(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(PENDING_PURCHASE_STORAGE_KEY);
}

function readStoredCurrency(): CurrencyCode | null {
  if (typeof window === "undefined") return null;
  const stored = window.localStorage.getItem(ENERGY_CURRENCY_STORAGE_KEY);
  return isCurrencyCode(stored) ? stored : null;
}

function writeStoredCurrency(currency: CurrencyCode): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ENERGY_CURRENCY_STORAGE_KEY, currency);
}

function normalizeErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    return error.message || fallback;
  }
  if (error instanceof Error) {
    return error.message || fallback;
  }
  return fallback;
}

function formatFiatAmount(amountValue: string, currency: CurrencyCode): string {
  const amount = Number(amountValue || "0");
  if (!Number.isFinite(amount)) return `0 ${currency}`;
  if (currency === "RUB") {
    return `${Math.round(amount).toLocaleString("ru-RU")} ₽`;
  }
  const locale = currency === "EUR" ? "de-DE" : "en-US";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

function formatOfferPrice(offer: PaymentOfferResponse, fallbackCurrency: CurrencyCode): string {
  if (offer.provider === "telegram_stars") {
    const stars = offer.stars_amount ?? Math.round(Number(offer.final_amount || "0"));
    return `${stars}\u00A0⭐`;
  }
  const normalized = offer.currency === "USD" || offer.currency === "EUR" || offer.currency === "RUB" ? offer.currency : fallbackCurrency;
  return formatFiatAmount(offer.final_amount, normalized as CurrencyCode);
}

function hasOfferDiscount(offer: PaymentOfferResponse): boolean {
  const discountAmount = Number(offer.discount_amount || "0");
  const baseAmount = Number(offer.base_amount || "0");
  const finalAmount = Number(offer.final_amount || "0");
  const discountPercent = Number(offer.discount_percent || "0");
  return discountAmount > 0 || discountPercent > 0 || (baseAmount > 0 && finalAmount > 0 && finalAmount < baseAmount);
}

function formatOfferOldPrice(offer: PaymentOfferResponse, fallbackCurrency: CurrencyCode): string | null {
  if (!hasOfferDiscount(offer)) return null;
  if (offer.provider === "telegram_stars") {
    const baseStars = Math.round(Number(offer.base_amount || "0"));
    return baseStars > 0 ? `${baseStars}\u00A0⭐` : null;
  }
  const normalized = offer.currency === "USD" || offer.currency === "EUR" || offer.currency === "RUB" ? offer.currency : fallbackCurrency;
  return formatFiatAmount(offer.base_amount, normalized as CurrencyCode);
}

function formatOfferRemaining(validUntil: string | null): string | null {
  if (!validUntil) return null;
  const target = new Date(validUntil).getTime();
  if (!Number.isFinite(target)) return null;
  const diffSeconds = Math.max(0, Math.floor((target - Date.now()) / 1000));
  if (diffSeconds <= 0) return "00:00:00";
  const hours = Math.floor(diffSeconds / 3600);
  const minutes = Math.floor((diffSeconds % 3600) / 60);
  const seconds = diffSeconds % 60;
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
}

function resolveAutodetectedCurrency(params: {
  userLang?: string | null;
  interfaceLanguage?: string | null;
  telegramLanguage?: string | null;
  detectedCountry?: string | null;
}): CurrencyCode {
  const languages = [params.userLang, params.interfaceLanguage, params.telegramLanguage]
    .filter(Boolean)
    .map((lang) => String(lang).trim().toLowerCase());

  if (languages.some((lang) => lang.startsWith("ru"))) {
    return "RUB";
  }

  const country = (params.detectedCountry || "").trim().toUpperCase();
  if (country === "RU") {
    return "RUB";
  }
  if (EU_COUNTRY_CODES.has(country)) {
    return "EUR";
  }
  return "USD";
}

function formatCountdown(totalSeconds: number): string {
  const safe = Math.max(0, totalSeconds);
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
}

function formatTriggerLabel(triggerType: string): string {
  const normalized = String(triggerType || "")
    .trim()
    .toLowerCase();
  if (!normalized) return "Акция";
  return DISCOUNT_TRIGGER_LABELS[normalized] ?? normalized.replaceAll("_", " ");
}

function cooldownSecondsFromIso(value: string | null | undefined): number {
  if (!value) return 0;
  const target = new Date(value).getTime();
  if (Number.isNaN(target)) return 0;
  return Math.max(0, Math.floor((target - Date.now()) / 1000));
}

function formatWalletHistoryTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function getOfferTotalEnergy(offer: PaymentOfferResponse): number {
  return offer.final_energy_amount || offer.energy_amount + offer.bonus_energy;
}

function getOfferBonusPercent(offer: PaymentOfferResponse): number {
  const explicitBonusPercent = Number(offer.bonus_percent || "0");
  if (Number.isFinite(explicitBonusPercent) && explicitBonusPercent > 0) {
    return Math.round(explicitBonusPercent);
  }
  if (offer.energy_amount <= 0 || offer.bonus_energy <= 0) return 0;
  return Math.floor((offer.bonus_energy / offer.energy_amount) * 100);
}

function normalizeTriggerType(triggerType: string | null | undefined): string {
  return String(triggerType || "")
    .trim()
    .toLowerCase();
}

function getTriggerPriority(triggerType: string | null | undefined): number {
  const normalized = normalizeTriggerType(triggerType);
  return PAYWALL_TRIGGER_PRIORITY[normalized] ?? 999;
}

function getTriggerOfferPreferenceRank(offer: PaymentOfferResponse): number {
  const normalized = normalizeTriggerType(offer.trigger_type);
  const amount = offer.energy_amount;

  const priorityByTrigger: Record<string, number[]> = {
    first_purchase: [25, 60, 10, 100, 200],
    zero_balance: [25, 10, 60, 100, 200],
    low_energy: [25, 10, 60, 100, 200],
    comeback: [60, 25, 100, 10, 200],
    exit_intent: [25, 10, 60, 100, 200],
    post_ads: [25, 10, 60, 100, 200],
    vip: [200, 100, 60, 25, 10],
    scheduled: [60, 25, 100, 200, 10],
    manual: [60, 25, 100, 200, 10],
    personal: [60, 25, 100, 200, 10]
  };

  const order = priorityByTrigger[normalized] ?? [60, 25, 100, 200, 10];
  const index = order.indexOf(amount);
  return index >= 0 ? index : order.length;
}

function compareOffersForPaywall(left: PaymentOfferResponse, right: PaymentOfferResponse): number {
  const triggerPriorityDelta = getTriggerPriority(left.trigger_type) - getTriggerPriority(right.trigger_type);
  if (triggerPriorityDelta !== 0) return triggerPriorityDelta;

  const triggerOfferRankDelta = getTriggerOfferPreferenceRank(left) - getTriggerOfferPreferenceRank(right);
  if (triggerOfferRankDelta !== 0) return triggerOfferRankDelta;

  const backendPriorityDelta = Number(left.priority || 999) - Number(right.priority || 999);
  if (backendPriorityDelta !== 0) return backendPriorityDelta;

  const discountDelta = Number(right.discount_percent || "0") - Number(left.discount_percent || "0");
  if (discountDelta !== 0) return discountDelta;

  const bonusDelta = getOfferBonusPercent(right) - getOfferBonusPercent(left);
  if (bonusDelta !== 0) return bonusDelta;

  const totalEnergyDelta = getOfferTotalEnergy(right) - getOfferTotalEnergy(left);
  if (totalEnergyDelta !== 0) return totalEnergyDelta;

  return Number(left.final_amount || "0") - Number(right.final_amount || "0");
}

function getOfferTriggerPresentation(offer: PaymentOfferResponse): OfferTriggerPresentation {
  const normalized = normalizeTriggerType(offer.trigger_type);

  switch (normalized) {
    case "first_purchase":
      return {
        badge: "Акция на первую покупку",
        featuredSummary: "Лучший момент начать: сейчас первый пакет открывается выгоднее и даёт больше энергии на старт.",
        secondarySummary: "",
        featuredCta: "Забрать стартовый пакет",
        secondaryBadge: "Первая покупка"
      };
    case "zero_balance":
      return {
        badge: "Энергия закончилась",
        featuredSummary: "Быстро верните доступ к раскладам, трактовкам и персональным сценариям без лишней паузы.",
        secondarySummary: "Быстро вернёт доступ к платным сценариям.",
        featuredCta: "Вернуть энергию",
        secondaryBadge: "Нулевой баланс"
      };
    case "low_energy":
      return {
        badge: "Низкий запас энергии",
        featuredSummary: "Сейчас хороший момент усилить запас, чтобы спокойно продолжать расклады и личные сценарии без паузы.",
        secondarySummary: "Поможет сохранить ритм и не прерываться на самом интересном месте.",
        featuredCta: "Усилить запас",
        secondaryBadge: "Мало энергии"
      };
    case "comeback":
      return {
        badge: "С возвращением",
        featuredSummary: "Хороший момент вернуться и взять пакет на более выгодных условиях, пока предложение открыто для вас.",
        secondarySummary: "Поможет быстро вернуться к раскладам, трактовкам и прогнозам.",
        featuredCta: "Вернуться в ритм",
        secondaryBadge: "Возвращение"
      };
    case "exit_intent":
      return {
        badge: "Бонус перед выходом",
        featuredSummary: "Небольшой бонус, чтобы войти в платный слой без лишнего барьера именно сейчас, пока интерес уже разогрет.",
        secondarySummary: "Небольшой бонус, если хотите войти без лишнего барьера.",
        featuredCta: "Забрать бонус",
        secondaryBadge: "Спецпредложение"
      };
    case "post_ads":
      return {
        badge: "После рекламного ритуала",
        featuredSummary: "После задания можно усилить запас на более выгодных условиях и сразу открыть нужный сценарий.",
        secondarySummary: "Хороший момент добавить энергии, пока бонус уже у вас на руках.",
        featuredCta: "Усилить запас сейчас",
        secondaryBadge: "После ритуала"
      };
    case "vip":
      return {
        badge: "Для активного ритма",
        featuredSummary: "Крупный запас для тех, кто регулярно открывает глубокие сценарии и хочет реже возвращаться к оплате.",
        secondarySummary: "Оптимальный пакет для активного и длинного ритма использования.",
        featuredCta: "Открыть VIP-запас",
        secondaryBadge: "VIP"
      };
    case "personal":
      return {
        badge: "Персональное предложение",
        featuredSummary: "Для вас открыт точечный пакет с более выгодным входом именно под текущий сценарий.",
        secondarySummary: "Индивидуальное предложение, доступное вам сейчас.",
        featuredCta: "Открыть предложение",
        secondaryBadge: "Персонально"
      };
    case "manual":
      return {
        badge: "Особое предложение",
        featuredSummary: "Сейчас для вас открыт специальный пакет с более выгодным входом в пополнение.",
        secondarySummary: "Специальное предложение на текущий момент.",
        featuredCta: "Открыть предложение",
        secondaryBadge: "Особое"
      };
    case "scheduled":
      return {
        badge: "Временная акция",
        featuredSummary: "Ограниченное по времени предложение: можно усилить запас на более выгодных условиях, пока окно ещё открыто.",
        secondarySummary: "Ограниченная по времени выгода на текущий период.",
        featuredCta: "Открыть предложение",
        secondaryBadge: "Акция"
      };
    default:
      return {
        badge: null,
        featuredSummary: "Подберите пакет под свой текущий ритм: быстрый добор, рабочий запас или глубокий premium-режим.",
        secondarySummary: "Пакет для текущего сценария использования.",
        featuredCta: null,
        secondaryBadge: null
      };
  }
}

function getOfferPositioning(offer: PaymentOfferResponse): OfferPositioning {
  const totalEnergy = getOfferTotalEnergy(offer);
  const personalDailyCount = Math.max(1, Math.floor(totalEnergy / 10));
  const oneCardCount = Math.max(1, Math.floor(totalEnergy / 2));

  if (totalEnergy <= 12) {
    return {
      displayName: "Быстрый старт",
      eyebrow: "Снять блок прямо сейчас",
      summary: "Компактный пакет для пользователя, который уже заинтересован, но ещё не готов к большому чеку.",
      usageHint: `Хватит примерно на ${personalDailyCount} персональный прогноз или до ${oneCardCount} трактовок карты дня.`,
      outcome: "Даёт быстрый вход в платный слой без ощущения лишнего риска.",
      cta: "Взять быстрый старт"
    };
  }

  if (totalEnergy <= 30) {
    return {
      displayName: "Рабочий запас",
      eyebrow: "Самый практичный выбор",
      summary: "Баланс между ценой и глубиной: можно спокойно открыть несколько ключевых сценариев подряд без новых пауз.",
      usageHint: `Хватит примерно на ${personalDailyCount} персональных прогнозов или до ${oneCardCount} трактовок карты дня.`,
      outcome: "Оптимален, если пользователь уже вошёл в ритм и будет возвращаться в продукт.",
      cta: "Забрать рабочий запас"
    };
  }

  if (totalEnergy <= 70) {
    return {
      displayName: "Поток без пауз",
      eyebrow: "Лучший value-оффер",
      summary: "Комфортный запас под регулярное использование: расклады, трактовки и персональные прогнозы без постоянного контроля остатка.",
      usageHint: `Хватит примерно на ${personalDailyCount} персональных прогнозов или до ${oneCardCount} трактовок карты дня.`,
      outcome: "Лучший пакет для превращения разового пользователя в привычного.",
      cta: "Открыть лучший value"
    };
  }

  if (totalEnergy <= 130) {
    return {
      displayName: "Глубокий режим",
      eyebrow: "Для серьёзного сценария",
      summary: "Большой запас для пользователей, которые хотят проходить продукт глубже и дольше, не возвращаясь к оплате после каждой покупки.",
      usageHint: `Хватит примерно на ${personalDailyCount} персональных прогнозов или до ${oneCardCount} трактовок карты дня.`,
      outcome: "Снимает внутренний барьер “жалко тратить энергию” и увеличивает глубину использования.",
      cta: "Включить глубокий режим"
    };
  }

  return {
    displayName: "Премиальный запас",
    eyebrow: "Максимум свободы",
    summary: "",
    usageHint: "",
    outcome: "Лучший пакет для долгого удержания и высокой жизненной ценности пользователя.",
    cta: "Забрать премиальный запас"
  };
}

function getPaymentMethodPresentation(method: PaymentMethod): PaymentMethodPresentation {
  if (method === "telegram_stars") {
    return {
      title: "Пополнение через Telegram Stars",
      body: "Нативная оплата внутри Telegram: быстрый вход в платный слой без перехода на внешнюю кассу.",
      featuredLabel: "Лучший пакет в Stars",
      featuredButton: "Открыть оплату в Stars",
      secondaryButton: "Оплатить в Stars"
    };
  }

  return {
    title: "Оплата в рублях для пользователей из России",
    body: "Отдельный сценарий для рублёвой оплаты. Офферы, бонусы и персональные предложения сохраняются такими же, как в Stars.",
    featuredLabel: "Лучший пакет в рублях",
    featuredButton: "Открыть оплату в рублях",
    secondaryButton: "Оплатить в рублях"
  };
}

function pickFeaturedOffer(offers: PaymentOfferResponse[]): PaymentOfferResponse | null {
  if (offers.length === 0) return null;

  return [...offers].sort(compareOffersForPaywall)[0];
}

function toPaymentStatusViewFromPurchase(purchase: PurchaseStatusResponse): PaymentStatusView {
  return {
    entity_id: purchase.purchase_id,
    payment_method: "robokassa",
    invoice_id: purchase.invoice_id,
    status: purchase.status,
    currency: purchase.currency,
    code: purchase.product_code,
    title: purchase.product_title,
    energy_credited: purchase.energy_credited
  };
}

function toPaymentStatusViewFromStarsPayment(payment: TelegramStarsPaymentStatusResponse): PaymentStatusView {
  return {
    entity_id: payment.payment_id,
    payment_method: "telegram_stars",
    status: payment.status,
    currency: payment.currency,
    code: payment.offer_code,
    title: payment.offer_title,
    energy_credited: payment.energy_credited
  };
}

export default function EnergyPage() {
  const navigate = useNavigate();
  const { profile, loading, refresh } = useProfile();
  const user = profile?.user;
  const energyBalance = user?.energy_balance ?? 0;

  const [uiState, setUiState] = useState<PurchaseUiState>("idle");
  const [statusText, setStatusText] = useState<string | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [activePurchase, setActivePurchase] = useState<PaymentStatusView | null>(null);
  const [pendingPurchase, setPendingPurchase] = useState<PendingPurchaseStorage | null>(null);
  const [creatingProductCode, setCreatingProductCode] = useState<string | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [displayedEnergyBalance, setDisplayedEnergyBalance] = useState<number>(energyBalance);
  const [balanceDelta, setBalanceDelta] = useState<number | null>(null);
  const [isBalanceAnimating, setIsBalanceAnimating] = useState(false);
  const [purchaseNotice, setPurchaseNotice] = useState<PurchaseNotice | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>(() => readStoredCurrency() || "RUB");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>("telegram_stars");
  const [paymentOffers, setPaymentOffers] = useState<PaymentOfferResponse[]>([]);
  const [energyBannerOffer, setEnergyBannerOffer] = useState<PaymentOfferResponse | null>(null);
  const [postAdsBannerActive, setPostAdsBannerActive] = useState(false);
  const [exitIntentOffer, setExitIntentOffer] = useState<PaymentOfferResponse | null>(null);
  const [showExitIntentModal, setShowExitIntentModal] = useState(false);
  const [offersLoading, setOffersLoading] = useState(false);
  const [offersError, setOffersError] = useState<string | null>(null);
  const [offerUsageMap, setOfferUsageMap] = useState<Record<string, string | null>>({});

  const [adsState, setAdsState] = useState<EnergyAdsStateResponse | null>(null);
  const [adsLoading, setAdsLoading] = useState(true);
  const [adsErrorText, setAdsErrorText] = useState<string | null>(null);
  const [adsAction, setAdsAction] = useState<AdActionStage | null>(null);
  const [taskCooldownLeft, setTaskCooldownLeft] = useState<number>(0);
  const [referralProgram, setReferralProgram] = useState<ReferralProgramResponse | null>(null);
  const [referralLoading, setReferralLoading] = useState(true);
  const [referralError, setReferralError] = useState<string | null>(null);
  const [ipCountry, setIpCountry] = useState<string | null>(null);
  const [shareHintOpen, setShareHintOpen] = useState(false);
  const [pendingReferralCode, setPendingReferralCode] = useState<string | null>(null);
  const [referralShareLanguage, setReferralShareLanguage] = useState<ReferralShareLanguage>("ru");
  const [referralShareVariant, setReferralShareVariant] = useState<(typeof REFERRAL_SHARE_VARIANTS)[number]>(1);

  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyItems, setHistoryItems] = useState<WalletHistoryItemResponse[]>([]);
  const [historyNextCursor, setHistoryNextCursor] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyLoadingMore, setHistoryLoadingMore] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const lastEnergyBalanceRef = useRef<number>(energyBalance);
  const balanceAnimationFrameRef = useRef<number | null>(null);
  const balanceDeltaTimeoutRef = useRef<number | null>(null);
  const statusCheckInFlightRef = useRef(false);
  const statusAutoHideTimeoutRef = useRef<number | null>(null);
  const autoPollAttemptsRef = useRef(0);
  const notifiedPurchaseStatesRef = useRef<Set<string>>(new Set());
  const currencyWasChangedManuallyRef = useRef(Boolean(readStoredCurrency()));
  const lastAdsReloadAtRef = useRef(0);
  const taskRewardInFlightRef = useRef(false);
  const handledExpiredUsageRef = useRef<Set<string>>(new Set());
  const handledDismissedUsageRef = useRef<Set<string>>(new Set());
  const offerExpiryInFlightRef = useRef(false);
  const activeOfferUsageIdsRef = useRef<Set<string>>(new Set());
  const exitIntentPlacementsInFlightRef = useRef(false);
  const pendingExitIntentPathRef = useRef<string | null>(null);

  const telegramLanguage = useMemo(() => {
    if (typeof window === "undefined") return null;
    return window.Telegram?.WebApp?.initDataUnsafe?.user?.language_code || null;
  }, []);
  const deviceLanguage = useMemo(() => {
    if (typeof navigator === "undefined") return null;
    return typeof navigator.language === "string" ? navigator.language : null;
  }, []);
  const detectedCountry = useMemo(
    () =>
      detectCountryBySignals({
        ipCountry,
        telegramLang: telegramLanguage,
        deviceLang: deviceLanguage
      }),
    [deviceLanguage, ipCountry, telegramLanguage]
  );
  const offersCurrency = selectedPaymentMethod === "telegram_stars" ? "XTR" : "RUB";

  const referralShareCopy = useMemo(
    () => REFERRAL_SHARE_COPY[referralShareLanguage],
    [referralShareLanguage]
  );

  useEffect(() => {
    if (currencyWasChangedManuallyRef.current) return;
    if (!profile) return;

    const autodetected = resolveAutodetectedCurrency({
      userLang: profile.user?.lang,
      interfaceLanguage: profile.birth_profile?.interface_language,
      telegramLanguage,
      detectedCountry: profile.birth_profile?.detected_country
    });
    setSelectedCurrency(autodetected);
    writeStoredCurrency(autodetected);
  }, [profile, telegramLanguage]);

  useEffect(() => {
    writeStoredCurrency(selectedCurrency);
  }, [selectedCurrency]);

  useEffect(() => {
    if (ipCountry !== null || typeof window === "undefined") return;
    let cancelled = false;

    fetch("https://ipapi.co/json/")
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) {
          setIpCountry(typeof data?.country === "string" ? data.country.toUpperCase() : null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setIpCountry(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [ipCountry]);

  useEffect(() => {
    if (selectedPaymentMethod === "robokassa" && selectedCurrency !== "RUB") {
      setSelectedCurrency("RUB");
      writeStoredCurrency("RUB");
    }
  }, [selectedCurrency, selectedPaymentMethod]);

  useEffect(() => {
    const previous = lastEnergyBalanceRef.current;
    const next = energyBalance;

    if (previous === next) {
      setDisplayedEnergyBalance(next);
      return;
    }

    if (balanceAnimationFrameRef.current !== null) {
      window.cancelAnimationFrame(balanceAnimationFrameRef.current);
      balanceAnimationFrameRef.current = null;
    }
    if (balanceDeltaTimeoutRef.current !== null) {
      window.clearTimeout(balanceDeltaTimeoutRef.current);
      balanceDeltaTimeoutRef.current = null;
    }

    const delta = next - previous;
    lastEnergyBalanceRef.current = next;

    if (delta <= 0) {
      setDisplayedEnergyBalance(next);
      setBalanceDelta(null);
      setIsBalanceAnimating(false);
      return;
    }

    setBalanceDelta(delta);
    setIsBalanceAnimating(true);

    const animationStart = performance.now();
    const animate = (timestamp: number) => {
      const progress = Math.min((timestamp - animationStart) / BALANCE_ANIMATION_DURATION_MS, 1);
      const eased = 1 - (1 - progress) ** 3;
      setDisplayedEnergyBalance(previous + delta * eased);

      if (progress < 1) {
        balanceAnimationFrameRef.current = window.requestAnimationFrame(animate);
      } else {
        setDisplayedEnergyBalance(next);
        setIsBalanceAnimating(false);
        balanceAnimationFrameRef.current = null;
      }
    };

    balanceAnimationFrameRef.current = window.requestAnimationFrame(animate);
    balanceDeltaTimeoutRef.current = window.setTimeout(() => {
      setBalanceDelta(null);
      balanceDeltaTimeoutRef.current = null;
    }, BALANCE_DELTA_BADGE_DURATION_MS);

    return () => {
      if (balanceAnimationFrameRef.current !== null) {
        window.cancelAnimationFrame(balanceAnimationFrameRef.current);
        balanceAnimationFrameRef.current = null;
      }
      if (balanceDeltaTimeoutRef.current !== null) {
        window.clearTimeout(balanceDeltaTimeoutRef.current);
        balanceDeltaTimeoutRef.current = null;
      }
    };
  }, [energyBalance]);

  const loadAdsState = useCallback(async () => {
    try {
      setAdsLoading(true);
      const next = await getEnergyAdsState();
      setAdsState(next);
      setAdsErrorText(null);
      setTaskCooldownLeft(cooldownSecondsFromIso(next.task_available_at));
      lastAdsReloadAtRef.current = Date.now();
    } catch (error) {
      setAdsErrorText(normalizeErrorMessage(error, "Не удалось загрузить рекламные награды"));
    } finally {
      setAdsLoading(false);
    }
  }, []);

  const clearStatusAutoHideTimer = useCallback(() => {
    if (statusAutoHideTimeoutRef.current !== null) {
      window.clearTimeout(statusAutoHideTimeoutRef.current);
      statusAutoHideTimeoutRef.current = null;
    }
  }, []);

  const scheduleStatusAutoHide = useCallback(() => {
    clearStatusAutoHideTimer();
    statusAutoHideTimeoutRef.current = window.setTimeout(() => {
      setStatusText(null);
      setErrorText(null);
      setActivePurchase(null);
      setUiState("idle");
      statusAutoHideTimeoutRef.current = null;
    }, STATUS_AUTO_HIDE_MS);
  }, [clearStatusAutoHideTimer]);

  useEffect(() => {
    void loadAdsState();
  }, [loadAdsState]);

  const loadReferralProgram = useCallback(async () => {
    try {
      setReferralLoading(true);
      const response = await getReferralProgram();
      setReferralProgram(response);
      setReferralError(null);
    } catch (error) {
      setReferralError(normalizeErrorMessage(error, "Не удалось загрузить реферальную программу"));
    } finally {
      setReferralLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadReferralProgram();
  }, [loadReferralProgram]);

  const loadWalletHistory = useCallback(
    async (options?: { reset?: boolean }) => {
      const reset = Boolean(options?.reset);
      try {
        if (reset) {
          setHistoryLoading(true);
          setHistoryError(null);
        } else {
          setHistoryLoadingMore(true);
        }
        const response = await getWalletHistory(reset ? undefined : historyNextCursor ?? undefined);
        setHistoryItems((prev) => {
          const base = reset ? [] : prev;
          const merged = [...base, ...response.items];
          const deduped = new Map<string, WalletHistoryItemResponse>();
          merged.forEach((item) => deduped.set(item.id, item));
          return [...deduped.values()];
        });
        setHistoryNextCursor(response.next_cursor);
      } catch (error) {
        setHistoryError(normalizeErrorMessage(error, "Не удалось загрузить историю операций"));
      } finally {
        setHistoryLoading(false);
        setHistoryLoadingMore(false);
      }
    },
    [historyNextCursor]
  );

  const loadPaymentOffers = useCallback(async () => {
    try {
      setOffersLoading(true);
      const response = await getPaymentOffers({
        provider: selectedPaymentMethod,
        currency: offersCurrency,
        source: "energy_page",
        trigger_type: "auto",
        detected_country: detectedCountry !== "Unknown" ? detectedCountry : undefined,
        telegram_lang: telegramLanguage ?? undefined,
        device_lang: deviceLanguage ?? undefined
      });
      const sorted = [...(response.offers || [])].sort((a, b) => {
        if (a.final_energy_amount !== b.final_energy_amount) {
          return a.final_energy_amount - b.final_energy_amount;
        }
        return Number(a.final_amount || "0") - Number(b.final_amount || "0");
      });
      setPaymentOffers(sorted);
      setOfferUsageMap((prev) => {
        const allowed = new Set(sorted.map((offer) => offer.offer_id));
        const next: Record<string, string | null> = {};
        Object.entries(prev).forEach(([offerId, usageId]) => {
          if (allowed.has(offerId)) {
            next[offerId] = usageId;
          }
        });
        return next;
      });
      setOffersError(null);
    } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
          setOffersError(
            selectedPaymentMethod === "telegram_stars"
              ? "Telegram Stars временно недоступны. Попробуйте обновить экран или используйте оплату для пользователей из России."
              : "Рублёвые предложения пока недоступны. Попробуйте Telegram Stars или обновите экран."
          );
        } else {
          setOffersError(normalizeErrorMessage(error, "Не удалось загрузить предложения оплаты"));
      }
      setPaymentOffers([]);
    } finally {
      setOffersLoading(false);
    }
  }, [detectedCountry, deviceLanguage, offersCurrency, selectedCurrency, selectedPaymentMethod, telegramLanguage]);

  useEffect(() => {
    void loadPaymentOffers();
  }, [loadPaymentOffers]);

  useEffect(() => {
    if (!historyOpen) return;
    if (historyItems.length > 0) return;
    void loadWalletHistory({ reset: true });
  }, [historyItems.length, historyOpen, loadWalletHistory]);

  useEffect(() => {
    if (!adsState) return;

    const tick = () => {
      const taskLeft = adsState.task.available ? 0 : cooldownSecondsFromIso(adsState.task_available_at);
      setTaskCooldownLeft(taskLeft);

      const shouldReload = !adsState.task.available && taskLeft === 0;
      if (shouldReload && Date.now() - lastAdsReloadAtRef.current > ADS_STATE_REFETCH_DEBOUNCE_MS) {
        void loadAdsState();
      }
    };

    tick();
    const intervalId = window.setInterval(tick, ADS_COUNTDOWN_TICK_MS);
    return () => window.clearInterval(intervalId);
  }, [adsState, loadAdsState]);

  useEffect(() => {
    const handleFocus = () => {
      void loadAdsState();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void loadAdsState();
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [loadAdsState]);

  useEffect(() => {
    if (paymentOffers.length === 0) return;
    const intervalId = window.setInterval(() => {
      if (offerExpiryInFlightRef.current) return;

      const expiredUsageIds = paymentOffers
        .map((offer) => offerUsageMap[offer.offer_id])
        .filter((usageId): usageId is string => Boolean(usageId))
        .filter((usageId) => !handledExpiredUsageRef.current.has(usageId))
        .filter((usageId) => {
          const relatedOffer = paymentOffers.find((offer) => offerUsageMap[offer.offer_id] === usageId);
          if (!relatedOffer?.valid_until) return false;
          const expireAt = new Date(relatedOffer.valid_until).getTime();
          return Number.isFinite(expireAt) && Date.now() >= expireAt;
        });

      if (expiredUsageIds.length === 0) return;
      offerExpiryInFlightRef.current = true;
      void (async () => {
        try {
          await Promise.all(
            expiredUsageIds.map(async (usageId) => {
              handledExpiredUsageRef.current.add(usageId);
              await markPaymentOfferExpired(usageId);
            })
          );
          await loadPaymentOffers();
        } catch {
          expiredUsageIds.forEach((usageId) => handledExpiredUsageRef.current.delete(usageId));
        } finally {
          offerExpiryInFlightRef.current = false;
        }
      })();
    }, OFFERS_COUNTDOWN_TICK_MS);
    return () => window.clearInterval(intervalId);
  }, [loadPaymentOffers, offerUsageMap, paymentOffers]);

  useEffect(() => {
    const currentUsageIds = new Set(
      paymentOffers
        .map((offer) => offerUsageMap[offer.offer_id])
        .filter((usageId): usageId is string => Boolean(usageId))
    );

    const previousUsageIds = activeOfferUsageIdsRef.current;
    const becameHidden = [...previousUsageIds].filter((usageId) => !currentUsageIds.has(usageId));
    if (becameHidden.length > 0) {
      void Promise.all(
        becameHidden.map(async (usageId) => {
          if (handledDismissedUsageRef.current.has(usageId)) return;
          handledDismissedUsageRef.current.add(usageId);
          try {
            await markPaymentOfferDismissed(usageId);
          } catch {
            handledDismissedUsageRef.current.delete(usageId);
          }
        })
      );
    }
    activeOfferUsageIdsRef.current = currentUsageIds;
  }, [offerUsageMap, paymentOffers]);

  const handleTaskRewardClaim = useCallback(async (taskEventDetail?: unknown) => {
    if (adsAction || taskRewardInFlightRef.current) return;
    if (!adsState?.ads_enabled) {
      setAdsErrorText("Реклама отключена для активной подписки");
      return;
    }
    if (!adsState.task.available) return;

    taskRewardInFlightRef.current = true;
    setAdsErrorText(null);
    setAdsAction("starting");

    try {
      const startResponse = await startEnergyRewardAd("task");
      setAdsAction("completing");
      const completeResponse = await completeEnergyRewardAd({
        session_id: startResponse.session_id,
        ads_completed_increment: 1,
        provider_payload: {
          source: "adsgram_task_widget",
          event_detail: taskEventDetail ?? null
        }
      });

      if (!completeResponse.success || completeResponse.energy_credited <= 0) {
        setAdsErrorText(completeResponse.message || "Не удалось зачислить награду");
        await loadAdsState();
        return;
      }

      triggerHapticNotification("success");
      setPurchaseNotice({
        tone: "success",
        title: "Спасибо за помощь проекту",
        message: `${completeResponse.message} Вам начислено +${completeResponse.energy_credited} ⚡.`
      });

      await refresh();
      await loadAdsState();
      setPostAdsBannerActive(true);
      void loadReferralProgram();
      if (historyOpen) {
        void loadWalletHistory({ reset: true });
      }
    } catch (error) {
      setAdsErrorText(normalizeErrorMessage(error, "Не удалось обработать рекламную награду"));
      await loadAdsState();
    } finally {
      setAdsAction(null);
      taskRewardInFlightRef.current = false;
    }
  }, [adsAction, adsState, historyOpen, loadAdsState, loadReferralProgram, loadWalletHistory, refresh]);

  const handleReferralInvite = useCallback(() => {
    if (!referralProgram) {
      setReferralError("Реферальная ссылка пока недоступна");
      return;
    }
    const tg = window.Telegram?.WebApp;
    if (tg?.switchInlineQuery && referralProgram.share_inline_query) {
      setPendingReferralCode(referralProgram.referral_code);
      setReferralShareLanguage(
        normalizeReferralShareLanguage(
          profile?.birth_profile?.interface_language || profile?.user?.lang || telegramLanguage
        )
      );
      setReferralShareVariant(pickReferralShareVariant());
      setShareHintOpen(true);
      return;
    }
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      void navigator.clipboard
        .writeText(referralProgram.referral_link)
        .then(() => {
          triggerHapticNotification("success");
          setPurchaseNotice({
            tone: "success",
            title: "Ссылка скопирована",
            message: "Реферальная ссылка скопирована, отправьте её другу в Telegram."
          });
        })
        .catch(() => {
          openExternalLink(referralProgram.referral_link);
        });
      return;
    }
    openExternalLink(referralProgram.referral_link);
  }, [profile?.birth_profile?.interface_language, profile?.user?.lang, referralProgram, telegramLanguage]);

  const handleReferralShareConfirm = useCallback(() => {
    if (!pendingReferralCode || !referralProgram) {
      setShareHintOpen(false);
      setReferralError("Telegram WebApp не поддерживает inline-пересылку");
      return;
    }

    openInlineQueryWithFallback({
      inlineQuery: `share_referral:${pendingReferralCode}:${referralShareLanguage}:${referralShareVariant}`,
      fallbackUrl: referralProgram.referral_link,
      fallbackText: referralShareCopy.fallbackText
    });

    setShareHintOpen(false);
    setPendingReferralCode(null);
  }, [pendingReferralCode, referralProgram, referralShareCopy.fallbackText, referralShareLanguage, referralShareVariant]);

  const handleOpenHistory = useCallback(() => {
    setHistoryOpen(true);
    if (historyItems.length === 0 && !historyLoading) {
      void loadWalletHistory({ reset: true });
    }
  }, [historyItems.length, historyLoading, loadWalletHistory]);

  const applyPurchaseStatus = useCallback(
    async (payment: PaymentStatusView) => {
      setActivePurchase(payment);

      const isSucceeded = payment.payment_method === "telegram_stars" ? payment.status === "paid" : payment.status === "succeeded";
      if (isSucceeded) {
        clearStatusAutoHideTimer();
        clearPendingPurchase();
        setPendingPurchase(null);
        setUiState("succeeded");
        setErrorText(null);
        setStatusText("Оплата подтверждена. Баланс обновляется...");

        const successNoticeKey = `${payment.entity_id}:succeeded`;
        if (!notifiedPurchaseStatesRef.current.has(successNoticeKey)) {
          notifiedPurchaseStatesRef.current.add(successNoticeKey);
          triggerHapticNotification("success");
          setPurchaseNotice({
            tone: "success",
            title: "Спасибо за покупку",
            message: `Платёж подтверждён, начислено ${payment.energy_credited} ⚡.`
          });
        }

        await refresh();
        void loadPaymentOffers();
        void loadReferralProgram();
        if (historyOpen) {
          void loadWalletHistory({ reset: true });
        }
        return;
      }

      if (FAILED_STATUSES.has(payment.status)) {
        clearStatusAutoHideTimer();
        clearPendingPurchase();
        setPendingPurchase(null);
        setUiState("failed");
        setStatusText(null);
        setErrorText("Оплата не завершена.");
        scheduleStatusAutoHide();

        const failNoticeKey = `${payment.entity_id}:${payment.status}`;
        if (!notifiedPurchaseStatesRef.current.has(failNoticeKey)) {
          notifiedPurchaseStatesRef.current.add(failNoticeKey);
          setPurchaseNotice({
            tone: "error",
            title: "Платёж не завершён",
            message: "Оплата была отменена или отклонена. Энергия не начислена."
          });
        }
        return;
      }

      setUiState("pending");
      setErrorText(null);
      setStatusText("Платёж ещё обрабатывается. Мы проверяем статус автоматически.");
    },
    [clearStatusAutoHideTimer, historyOpen, loadPaymentOffers, loadReferralProgram, loadWalletHistory, refresh, scheduleStatusAutoHide]
  );

  const checkPurchaseStatus = useCallback(
    async (pending: PendingPurchaseStorage, options?: { silent?: boolean }) => {
      if (!pending.entity_id || statusCheckInFlightRef.current) return;
      statusCheckInFlightRef.current = true;
      setCheckingStatus(true);
      try {
        if (pending.payment_method === "telegram_stars") {
          const statusResponse = await getTelegramStarsPaymentStatus(pending.entity_id);
          await applyPurchaseStatus(toPaymentStatusViewFromStarsPayment(statusResponse));
        } else {
          const statusResponse = await getPurchaseStatus(pending.entity_id);
          await applyPurchaseStatus(toPaymentStatusViewFromPurchase(statusResponse));
        }
      } catch (error) {
        if (pending.payment_method === "telegram_stars" && error instanceof ApiError && error.status === 404) {
          clearPendingPurchase();
          setPendingPurchase(null);
          setActivePurchase(null);
          setUiState("idle");
          setStatusText(null);
          setErrorText(null);
          return;
        }
        if (!options?.silent) {
          setUiState("pending");
          setErrorText(normalizeErrorMessage(error, "Не удалось проверить статус оплаты. Попробуйте ещё раз."));
        }
      } finally {
        statusCheckInFlightRef.current = false;
        setCheckingStatus(false);
      }
    },
    [applyPurchaseStatus]
  );

  const handleBuyRobokassaOffer = useCallback(
    async (offer: PaymentOfferResponse) => {
      clearStatusAutoHideTimer();
      setCreatingProductCode(offer.offer_id);
      setUiState("creating");
      setStatusText(null);
      setErrorText(null);

      try {
        const usageId = offerUsageMap[offer.offer_id] ?? undefined;
        const payment = await createRobokassaPayment({
          offer_id: offer.offer_id,
          usage_id: usageId,
          currency_code: selectedCurrency
        });
        if (!payment.payment_url || !payment.purchase_id) {
          throw new Error("Не удалось создать платёж");
        }

        const pendingPayload: PendingPurchaseStorage = {
          entity_id: payment.purchase_id,
          invoice_id: payment.invoice_id,
          product_code: payment.product_code,
          payment_method: "robokassa",
          created_at: new Date().toISOString()
        };
        writePendingPurchase(pendingPayload);
        setPendingPurchase(pendingPayload);
        setActivePurchase(toPaymentStatusViewFromPurchase({
          purchase_id: payment.purchase_id,
          invoice_id: payment.invoice_id,
          status: payment.status,
          amount_minor: payment.amount_minor,
          currency: payment.currency,
          product_code: payment.product_code,
          product_title: payment.product_title,
          energy_credited: payment.energy_credited,
          created_at: pendingPayload.created_at,
          paid_at: null
        }));
        setUiState("awaiting_confirmation");
        setStatusText("Мы ждём подтверждение оплаты. После оплаты вернитесь в мини-приложение.");
        autoPollAttemptsRef.current = 0;

        openExternalLink(payment.payment_url);
      } catch (error) {
        setUiState("failed");
        setStatusText(null);
        setErrorText(normalizeErrorMessage(error, "Не удалось создать платёж. Попробуйте ещё раз."));
      } finally {
        setCreatingProductCode(null);
      }
    },
    [clearStatusAutoHideTimer, offerUsageMap, selectedCurrency]
  );

  const handleBuyStarsOffer = useCallback(
    async (offer: PaymentOfferResponse) => {
      clearStatusAutoHideTimer();
      setCreatingProductCode(offer.offer_id);
      setUiState("creating");
      setStatusText(null);
      setErrorText(null);

      try {
        const usageId = offerUsageMap[offer.offer_id] ?? undefined;
        const starsPayment = await createTelegramStarsPayment({ offer_id: offer.offer_id, usage_id: usageId });
        const invoiceUrl = starsPayment.invoice_url || starsPayment.invoice_link || starsPayment.payment_url || null;
        if (!invoiceUrl || !starsPayment.payment_id) {
          throw new Error("Не удалось создать Stars-платёж");
        }

        const pendingPayload: PendingPurchaseStorage = {
          entity_id: starsPayment.payment_id,
          payment_method: "telegram_stars",
          offer_id: starsPayment.offer_id,
          created_at: new Date().toISOString()
        };
        writePendingPurchase(pendingPayload);
        setPendingPurchase(pendingPayload);
        setActivePurchase({
          entity_id: starsPayment.payment_id,
          payment_method: "telegram_stars",
          status: starsPayment.status,
          currency: starsPayment.currency,
          code: starsPayment.offer_code,
          title: starsPayment.offer_title,
          energy_credited: starsPayment.energy_credited
        });
        setUiState("awaiting_confirmation");
        setStatusText("Откройте счёт в Telegram Stars и подтвердите оплату.");
        autoPollAttemptsRef.current = 0;

        const invoiceStatus = await openTelegramInvoice(invoiceUrl);
        if (invoiceStatus === "paid") {
          await checkPurchaseStatus(pendingPayload, { silent: true });
          return;
        }
        if (invoiceStatus === "cancelled" || invoiceStatus === "failed") {
          clearPendingPurchase();
          setPendingPurchase(null);
          setUiState("failed");
          setStatusText(null);
          setErrorText(invoiceStatus === "cancelled" ? "Оплата отменена пользователем." : "Оплата Telegram Stars не завершена.");
          scheduleStatusAutoHide();
          return;
        }

        setUiState("pending");
        setStatusText("Платёж создан. Мы автоматически проверим подтверждение.");
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
          setUiState("failed");
          setStatusText(null);
          setErrorText("Оплата через Telegram Stars пока не включена на сервере.");
          return;
        }
        setUiState("failed");
        setStatusText(null);
        setErrorText(normalizeErrorMessage(error, "Не удалось создать Stars-платёж. Попробуйте ещё раз."));
      } finally {
        setCreatingProductCode(null);
      }
    },
    [checkPurchaseStatus, clearStatusAutoHideTimer, offerUsageMap, scheduleStatusAutoHide]
  );

  useEffect(
    () => () => {
      clearStatusAutoHideTimer();
    },
    [clearStatusAutoHideTimer]
  );

  useEffect(() => {
    const pending = readPendingPurchase();
    if (!pending?.entity_id) return;
    setPendingPurchase(pending);
    setUiState("pending");
    setStatusText("Найден незавершённый платёж. Проверяем статус...");
    void checkPurchaseStatus(pending, { silent: true });
  }, [checkPurchaseStatus]);

  useEffect(() => {
    if (!pendingPurchase || typeof window === "undefined") return;
    autoPollAttemptsRef.current = 0;
    let intervalId: number | null = null;

    const runCheck = () => {
      if (document.visibilityState !== "visible") return;
      if (autoPollAttemptsRef.current >= AUTO_STATUS_POLL_MAX_ATTEMPTS) {
        if (intervalId !== null) {
          window.clearInterval(intervalId);
          intervalId = null;
        }
        setStatusText("Платёж ещё обрабатывается. Автопроверка остановлена, нажмите «Проверить статус».");
        return;
      }
      autoPollAttemptsRef.current += 1;
      void checkPurchaseStatus(pendingPurchase, { silent: true });
    };

    const handleFocus = () => {
      autoPollAttemptsRef.current = 0;
      void checkPurchaseStatus(pendingPurchase, { silent: true });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        autoPollAttemptsRef.current = 0;
        void checkPurchaseStatus(pendingPurchase, { silent: true });
      }
    };

    runCheck();
    intervalId = window.setInterval(runCheck, AUTO_STATUS_POLL_INTERVAL_MS);
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (intervalId !== null) {
        window.clearInterval(intervalId);
      }
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [checkPurchaseStatus, pendingPurchase]);

  const canCheckStatus = Boolean(pendingPurchase?.entity_id) && !checkingStatus;
  const formattedEnergyBalance = Math.round(displayedEnergyBalance).toLocaleString("ru-RU");
  const taskBlockId = useMemo(() => {
    const backendBlockId = adsState?.adsgram_task_block_id ?? null;
    if (isTaskBlockId(backendBlockId)) return backendBlockId.trim();
    if (isTaskBlockId(TASK_ADSGRAM_BLOCK_ID)) return TASK_ADSGRAM_BLOCK_ID.trim();
    return null;
  }, [adsState?.adsgram_task_block_id]);

  const taskButtonLabel = useMemo(() => {
    if (!adsState?.ads_enabled) return "Недоступно";
    if (adsAction) {
      if (adsAction === "starting") return "Готовим...";
      return "Начисляем...";
    }
    if (!adsState?.task.available) {
      return `Доступно через ${formatCountdown(taskCooldownLeft)}`;
    }
    return `Получить +${adsState.task.next_energy} ⚡`;
  }, [adsAction, adsState?.ads_enabled, adsState?.task.available, adsState?.task.next_energy, taskCooldownLeft]);

  const featuredOffer = useMemo(() => pickFeaturedOffer(paymentOffers), [paymentOffers]);
  const featuredOfferPositioning = useMemo(
    () => (featuredOffer ? getOfferPositioning(featuredOffer) : null),
    [featuredOffer]
  );
  const featuredOfferTriggerPresentation = useMemo(
    () => (featuredOffer ? getOfferTriggerPresentation(featuredOffer) : null),
    [featuredOffer]
  );
  const secondaryOffers = useMemo(
    () =>
      paymentOffers
        .filter((offer) => offer.offer_id !== featuredOffer?.offer_id)
        .sort(compareOffersForPaywall),
    [featuredOffer?.offer_id, paymentOffers]
  );
  const accountModeLabel = energyBalance <= 10 ? "Нужна подпитка" : energyBalance <= 35 ? "Рабочий запас" : "Сильный ресурс";
  const resourcePressureLabel =
    energyBalance <= 10 ? "Критически низко" : energyBalance <= 35 ? "Ниже комфортного запаса" : "Комфортный запас";
  const resourcePressureTitle =
    energyBalance <= 10 ? "Энергии хватит ненадолго" : energyBalance <= 35 ? "Энергию лучше усилить заранее" : "Энергия держит хороший темп";
  const resourceFillPercent = Math.max(8, Math.min(100, Math.round((Math.min(energyBalance, 120) / 120) * 100)));
  const resourceToneClass =
    energyBalance <= 10
      ? "from-[#F08A62] to-[#D8604B]"
      : energyBalance <= 35
        ? "from-[#E4BE7A] to-[#CFA974]"
        : "from-[#CDAA7A] to-[#8FD0A6]";
  const resourceAccentClass =
    energyBalance <= 10
      ? "text-[#F4A38A]"
      : energyBalance <= 35
        ? "text-[#E6C688]"
        : "text-[#A7DDB6]";
  const energyDateLabel = adsState?.local_date
    ? formatWalletHistoryTimestamp(`${adsState.local_date}T12:00:00`).split(",")[0]
    : null;
  const hasFreeEnergyTask = Boolean(adsState?.ads_enabled);
  const taskRewardAmount = adsState?.task.next_energy ?? 0;
  const adBannerReady = Boolean(adsState?.ads_enabled && adsState?.task.available && taskBlockId);
  const paymentMethodPresentation = getPaymentMethodPresentation(selectedPaymentMethod);
  const paymentSectionTitle = paymentMethodPresentation.title;
  const paymentSectionBody = paymentMethodPresentation.body;
  const offerSessionKey = useMemo(() => getOfferSessionKey(), []);

  const emitOfferEvent = useCallback(
    (offer: PaymentOfferResponse, eventType: string, surface: string) => {
      void recordOfferEvent({
        trigger_type: offer.trigger_type,
        surface,
        offer_id: offer.offer_id,
        rule_id: offer.rule_id,
        event_type: eventType,
        session_key: offerSessionKey,
        context: {
          source: "energy_page",
          provider: offer.provider,
          currency: offer.currency,
          offer_code: offer.offer_code,
          purchase_type: offer.purchase_type,
          selected_payment_method: selectedPaymentMethod
        }
      }).catch(() => {
        // Intentionally non-blocking: paywall UX should not depend on analytics delivery.
      });
    },
    [offerSessionKey, selectedPaymentMethod]
  );

  const loadOfferPlacements = useCallback(
    async (source: string) => {
      return getOfferPlacements({
        provider: selectedPaymentMethod,
        currency: offersCurrency,
        source,
        detected_country: detectedCountry !== "Unknown" ? detectedCountry : undefined,
        telegram_lang: telegramLanguage ?? undefined,
        device_lang: deviceLanguage ?? undefined
      });
    },
    [detectedCountry, deviceLanguage, offersCurrency, selectedPaymentMethod, telegramLanguage]
  );

  useEffect(() => {
    if (!featuredOffer) return;
    if (hasOfferBeenShownInSession(featuredOffer.trigger_type, "energy_featured", featuredOffer.offer_id)) return;
    markOfferShownInSession(featuredOffer.trigger_type, "energy_featured", featuredOffer.offer_id);
    emitOfferEvent(featuredOffer, "shown", "energy_featured");
  }, [emitOfferEvent, featuredOffer]);

  useEffect(() => {
    if (secondaryOffers.length === 0) return;
    secondaryOffers.forEach((offer) => {
      if (hasOfferBeenShownInSession(offer.trigger_type, "energy_list", offer.offer_id)) return;
      markOfferShownInSession(offer.trigger_type, "energy_list", offer.offer_id);
      emitOfferEvent(offer, "shown", "energy_list");
    });
  }, [emitOfferEvent, secondaryOffers]);

  useEffect(() => {
    let cancelled = false;

    const syncEnergyBanner = async () => {
      if (!postAdsBannerActive) {
        if (!cancelled) {
          setEnergyBannerOffer(null);
        }
        return;
      }

      try {
        const placements = await loadOfferPlacements("post_ads_reward");
        const nextOffer = placements.energy_banner?.offer ?? null;
        if (!nextOffer) {
          if (!cancelled) {
            setEnergyBannerOffer(null);
          }
          return;
        }

        if (
          hasOfferBeenDismissedInSession(nextOffer.trigger_type, "energy_banner", nextOffer.offer_id)
        ) {
          if (!cancelled) {
            setEnergyBannerOffer(null);
          }
          return;
        }

        if (!cancelled) {
          setEnergyBannerOffer(nextOffer);
        }
      } catch {
        if (!cancelled) {
          setEnergyBannerOffer(null);
        }
      }
    };

    void syncEnergyBanner();

    return () => {
      cancelled = true;
    };
  }, [loadOfferPlacements, postAdsBannerActive]);

  useEffect(() => {
    if (!energyBannerOffer) return;
    if (hasOfferBeenShownInSession(energyBannerOffer.trigger_type, "energy_banner", energyBannerOffer.offer_id)) {
      return;
    }
    markOfferShownInSession(energyBannerOffer.trigger_type, "energy_banner", energyBannerOffer.offer_id);
    emitOfferEvent(energyBannerOffer, "shown", "energy_banner");
  }, [emitOfferEvent, energyBannerOffer]);

  const handleDismissEnergyBanner = useCallback(() => {
    if (!energyBannerOffer) return;
    markOfferDismissedInSession(energyBannerOffer.trigger_type, "energy_banner", energyBannerOffer.offer_id);
    emitOfferEvent(energyBannerOffer, "dismissed", "energy_banner");
    setEnergyBannerOffer(null);
    setPostAdsBannerActive(false);
  }, [emitOfferEvent, energyBannerOffer]);

  async function handleOpenBannerOffer(
    offer: PaymentOfferResponse,
    surface: "energy_banner" | "exit_intent_modal"
  ) {
    emitOfferEvent(offer, "clicked_primary", surface);
    if (surface === "exit_intent_modal") {
      setShowExitIntentModal(false);
      setExitIntentOffer(null);
      pendingExitIntentPathRef.current = null;
    }
    if (offer.provider === "telegram_stars") {
      await handleBuyStarsOffer(offer);
    } else {
      await handleBuyRobokassaOffer(offer);
    }
  }

  useEffect(() => {
    const normalizeHrefToPath = (href: string): string | null => {
      if (!href) return null;
      if (href.startsWith("#")) {
        return href.slice(1) || "/";
      }
      const hashIndex = href.indexOf("#");
      if (hashIndex >= 0) {
        return href.slice(hashIndex + 1) || "/";
      }
      return null;
    };

    const handleDocumentClick = (event: MouseEvent) => {
      if (event.defaultPrevented) return;
      if (event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
      if (creatingProductCode || checkingStatus || offersLoading) return;
      if (paymentOffers.length === 0) return;
      if (showExitIntentModal) return;

      const target = event.target as HTMLElement | null;
      const anchor = target?.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;

      const nextPath = normalizeHrefToPath(anchor.getAttribute("href") || "");
      if (!nextPath || nextPath === "/energy") return;

      event.preventDefault();
      pendingExitIntentPathRef.current = nextPath;
      if (exitIntentPlacementsInFlightRef.current) return;
      exitIntentPlacementsInFlightRef.current = true;

      void (async () => {
        try {
          const placements = await loadOfferPlacements("energy_exit_intent");
          const nextOffer = placements.exit_intent_modal?.offer ?? null;
          if (
            !nextOffer ||
            hasOfferBeenDismissedInSession("exit_intent", "exit_intent_modal", nextOffer.offer_id)
          ) {
            const pathToOpen = pendingExitIntentPathRef.current;
            pendingExitIntentPathRef.current = null;
            if (pathToOpen) navigate(pathToOpen);
            return;
          }

          setExitIntentOffer(nextOffer);
          setShowExitIntentModal(true);
          if (!hasOfferBeenShownInSession("exit_intent", "exit_intent_modal", nextOffer.offer_id)) {
            markOfferShownInSession("exit_intent", "exit_intent_modal", nextOffer.offer_id);
            emitOfferEvent(nextOffer, "shown", "exit_intent_modal");
          }
        } catch {
          const pathToOpen = pendingExitIntentPathRef.current;
          pendingExitIntentPathRef.current = null;
          if (pathToOpen) navigate(pathToOpen);
        } finally {
          exitIntentPlacementsInFlightRef.current = false;
        }
      })();
    };

    document.addEventListener("click", handleDocumentClick, true);
    return () => {
      document.removeEventListener("click", handleDocumentClick, true);
    };
  }, [
    checkingStatus,
    creatingProductCode,
    emitOfferEvent,
    loadOfferPlacements,
    navigate,
    offersLoading,
    paymentOffers.length,
    showExitIntentModal
  ]);

  const handleDismissExitIntent = useCallback(() => {
    if (exitIntentOffer) {
      markOfferDismissedInSession("exit_intent", "exit_intent_modal", exitIntentOffer.offer_id);
      void recordOfferEvent({
        trigger_type: "exit_intent",
        surface: "exit_intent_modal",
        offer_id: exitIntentOffer.offer_id,
        rule_id: exitIntentOffer.rule_id,
        event_type: "dismissed",
        session_key: offerSessionKey,
        dismissed_until: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        context: { source: "energy_exit_intent" }
      }).catch(() => {});
    }
    setShowExitIntentModal(false);
    setExitIntentOffer(null);
    const pathToOpen = pendingExitIntentPathRef.current;
    pendingExitIntentPathRef.current = null;
    if (pathToOpen) {
      navigate(pathToOpen);
    }
  }, [exitIntentOffer, navigate, offerSessionKey]);

  return (
    <>
      <div className="space-y-6">
        <section className="relative overflow-hidden rounded-[32px] border border-[rgba(215,185,139,0.18)] bg-[linear-gradient(180deg,rgba(42,34,49,0.96),rgba(18,14,23,0.96))] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.42),0_0_36px_rgba(183,138,87,0.1)]">
          <div className="pointer-events-none absolute -right-10 top-4 h-32 w-32 rounded-full bg-[rgba(215,185,139,0.12)] blur-3xl" />
          <div className="pointer-events-none absolute left-[-10px] top-20 h-28 w-28 rounded-full bg-[rgba(110,77,120,0.2)] blur-3xl" />

          <div className="relative space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--text-tertiary)]">Энергия пространства</p>
                <h1 className="font-['Cormorant_Garamond'] text-[2.05rem] font-semibold leading-none text-[var(--text-primary)]">
                  Управление вашим ресурсом
                </h1>
              </div>
              <span className="inline-flex items-center rounded-full border border-[rgba(215,185,139,0.24)] bg-[rgba(215,185,139,0.12)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--accent-gold)]">
                {accountModeLabel}
              </span>
            </div>

            <div className="rounded-[24px] border border-[rgba(255,255,255,0.08)] bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.03))] p-4 shadow-[var(--surface-shadow-soft)]">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-semibold text-[var(--text-primary)]">{resourcePressureTitle}</p>
                </div>
                <div className="shrink-0 rounded-full border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.05)] px-3 py-1 text-[11px] font-medium text-[var(--text-secondary)]">
                  {resourceFillPercent}%
                </div>
              </div>

              <div className="mt-4">
                <div className="h-2.5 overflow-hidden rounded-full bg-white/8">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${resourceToneClass} shadow-[0_0_18px_rgba(255,255,255,0.08)]`}
                    style={{ width: `${resourceFillPercent}%` }}
                  />
                </div>
              </div>

              <p className={`mt-4 text-sm font-semibold ${resourceAccentClass}`}>{resourcePressureLabel}</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
              <div className="rounded-[26px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] p-5 shadow-[var(--surface-shadow-soft)] backdrop-blur-xl">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--text-tertiary)]">Баланс сейчас</p>
                    {loading && !profile ? (
                      <div className="mt-3 h-8 w-24 animate-pulse rounded-md bg-white/10" />
                    ) : (
                      <div className="mt-3 flex items-center gap-2">
                        <p
                          className={`text-[2rem] font-semibold text-[var(--accent-rose)] transition-all duration-500 ${
                            isBalanceAnimating ? "scale-105 text-[var(--accent-gold)]" : ""
                          }`}
                        >
                          {formattedEnergyBalance} ⚡
                        </p>
                        {balanceDelta ? (
                          <span className="rounded-full border border-emerald-300/40 bg-emerald-400/15 px-2 py-1 text-xs font-semibold text-emerald-100">
                            +{balanceDelta} ⚡
                          </span>
                        ) : null}
                      </div>
                    )}
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-[18px] border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.05)]">
                    <Zap className="h-5 w-5 text-[var(--accent-gold)]" strokeWidth={1.5} />
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {user?.telegram.username ? (
                    <span className="rounded-full border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-3 py-1.5 text-[12px] font-medium text-[var(--text-secondary)]">
                      @{user.telegram.username}
                    </span>
                  ) : null}
                  {energyDateLabel ? (
                    <span className="rounded-full border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-3 py-1.5 text-[12px] font-medium text-[var(--text-secondary)]">
                      Локальная дата: {energyDateLabel}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:min-w-[210px]">
                <Button
                  variant="outline"
                  className="h-11 justify-between rounded-full border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.04)] px-4 text-[var(--text-primary)]"
                  onClick={handleOpenHistory}
                >
                  История энергии
                  <RefreshCw className="h-4 w-4" strokeWidth={1.7} />
                </Button>
                {pendingPurchase?.entity_id ? (
                  <Button
                    variant="primary"
                    className="h-11 justify-between rounded-full border border-[rgba(255,255,255,0.08)] bg-[linear-gradient(180deg,#E2C79D_0%,#CFA974_100%)] px-4 text-[var(--text-on-gold)] shadow-[0_6px_18px_rgba(183,138,87,0.22)]"
                    disabled={!canCheckStatus}
                    onClick={() => {
                      if (!pendingPurchase) return;
                      autoPollAttemptsRef.current = 0;
                      void checkPurchaseStatus(pendingPurchase);
                    }}
                  >
                    {checkingStatus ? "Проверяем платёж" : "Проверить платёж"}
                    {checkingStatus ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" strokeWidth={1.7} />}
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden rounded-[30px] border border-[rgba(215,185,139,0.16)] bg-[linear-gradient(180deg,rgba(36,28,43,0.96),rgba(18,14,23,0.98))] p-5 shadow-[0_20px_44px_rgba(0,0,0,0.34)]">
          <div className="pointer-events-none absolute right-0 top-0 h-24 w-24 rounded-full bg-[rgba(215,185,139,0.12)] blur-3xl" />
          <div className="relative space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <p className="text-[11px] uppercase tracking-[0.28em] text-[var(--text-tertiary)]">Ежедневная энергия</p>
                <h2 className="font-['Cormorant_Garamond'] text-[1.9rem] font-medium leading-none text-[var(--text-primary)]">
                  Верните ресурс без покупки
                </h2>
                {adsState?.task.available ? (
                  <p className="max-w-[330px] text-[0.95rem] leading-6 text-[var(--text-secondary)]">
                    Нажмите `Go`, перейдите в рекламируемый проект, затем вернитесь и нажмите `Claim`, чтобы получить награду за выполненное задание и поддержать развитие проекта.
                  </p>
                ) : null}
              </div>
              <div className="hidden rounded-[20px] border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-4 py-3 text-right sm:block">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--text-tertiary)]">Награда</p>
                <p className="mt-1 text-lg font-semibold text-[var(--accent-gold)]">+{taskRewardAmount} ⚡</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-[rgba(215,185,139,0.2)] bg-[rgba(215,185,139,0.1)] px-3 py-1.5 text-[12px] font-medium text-[var(--accent-gold)]">
                {hasFreeEnergyTask
                  ? adsState?.task.available
                    ? "Рекламный ритуал активен"
                    : "Рекламный ритуал будет активен через время"
                  : "Реклама сейчас недоступна"}
              </span>
            </div>

            {adsLoading ? (
              <div className="h-24 animate-pulse rounded-[22px] bg-white/10" />
            ) : adBannerReady ? (
              <div className="space-y-2">
                <div className="w-full overflow-hidden rounded-[24px] border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.04)] shadow-[0_12px_24px_rgba(0,0,0,0.32)]">
                  <AdsgramTaskBanner
                    className="block w-full"
                    blockId={taskBlockId ?? ""}
                    disabled={Boolean(adsAction)}
                    onReward={(detail) => {
                      void handleTaskRewardClaim(detail);
                    }}
                    onError={(message) => {
                      setAdsErrorText(message);
                      void loadAdsState();
                    }}
                    onBannerNotFound={() => {
                      setAdsErrorText("Сейчас нет доступных заданий, попробуйте позже");
                      void loadAdsState();
                    }}
                    onTooLongSession={() => {
                      setAdsErrorText("Сессия задания устарела, обновите страницу");
                      void loadAdsState();
                    }}
                  />
                </div>
                {adsAction ? (
                  <div className="inline-flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    {taskButtonLabel}
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="rounded-[22px] border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-4 py-4">
                <p className="text-sm leading-6 text-[var(--text-secondary)]">
                  {adsState?.ads_enabled
                    ? `Доступно через ${formatCountdown(taskCooldownLeft)}`
                    : "Сейчас рекламные задания недоступны."}
                </p>
              </div>
            )}

            {adsErrorText ? <p className="text-xs text-[var(--accent-gold)]">{adsErrorText}</p> : null}
          </div>
        </section>

        <section className="space-y-4">
          <div className="px-1">
            <p className="text-[11px] uppercase tracking-[0.28em] text-[var(--text-tertiary)]">Пополнение энергии</p>
            <h2 className="mt-1 text-[1.15rem] font-semibold text-[var(--text-primary)]">{paymentSectionTitle}</h2>
          </div>

          <Card className="overflow-hidden border border-[rgba(255,255,255,0.08)] bg-[linear-gradient(180deg,rgba(34,27,41,0.92),rgba(17,13,22,0.96))] p-5 shadow-[var(--surface-shadow)]">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold transition ${
                    selectedPaymentMethod === "telegram_stars"
                      ? "border-[rgba(215,185,139,0.24)] bg-[rgba(215,185,139,0.12)] text-[var(--accent-gold)] shadow-[0_0_0_1px_rgba(215,185,139,0.08)]"
                      : "border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  }`}
                  onClick={() => setSelectedPaymentMethod("telegram_stars")}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Telegram Stars
                </button>
                <button
                  type="button"
                  className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold transition ${
                    selectedPaymentMethod === "robokassa"
                      ? "border-[rgba(215,185,139,0.24)] bg-[rgba(215,185,139,0.12)] text-[var(--accent-gold)] shadow-[0_0_0_1px_rgba(215,185,139,0.08)]"
                      : "border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  }`}
                  onClick={() => setSelectedPaymentMethod("robokassa")}
                >
                  <Zap className="h-3.5 w-3.5" />
                  Для пользователей из России
                </button>
              </div>

              {energyBannerOffer ? (
                <div className="rounded-[24px] border border-[rgba(215,185,139,0.18)] bg-[linear-gradient(180deg,rgba(45,36,54,0.96),rgba(24,18,30,0.98))] p-4 shadow-[0_16px_36px_rgba(0,0,0,0.24)]">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2">
                      <span className="inline-flex rounded-full border border-[rgba(215,185,139,0.22)] bg-[rgba(215,185,139,0.12)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--accent-gold)]">
                        {getOfferTriggerPresentation(energyBannerOffer).badge || "Предложение"}
                      </span>
                      <h3 className="text-base font-semibold text-[var(--text-primary)]">
                        {getOfferPositioning(energyBannerOffer).displayName}
                      </h3>
                      <p className="max-w-[32rem] text-sm leading-6 text-[var(--text-secondary)]">
                        {getOfferTriggerPresentation(energyBannerOffer).featuredSummary}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] text-[var(--text-secondary)]"
                      onClick={handleDismissEnergyBanner}
                      aria-label="Закрыть предложение"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-end gap-2">
                        {getOfferTotalEnergy(energyBannerOffer) > energyBannerOffer.energy_amount ? (
                          <p className="text-sm text-[var(--text-tertiary)] line-through">
                            {energyBannerOffer.energy_amount} ⚡
                          </p>
                        ) : null}
                        <p className="text-2xl font-semibold text-[var(--text-primary)]">
                          {getOfferTotalEnergy(energyBannerOffer)} ⚡
                        </p>
                      </div>
                      <p className="text-lg font-semibold text-[var(--accent-gold)]">
                        {formatOfferPrice(energyBannerOffer, selectedCurrency)}
                      </p>
                    </div>

                    <Button
                      variant="outline"
                      className="h-11 rounded-full border-[rgba(215,185,139,0.22)] bg-[rgba(255,255,255,0.04)] px-5 text-[var(--text-primary)]"
                      disabled={Boolean(creatingProductCode) || checkingStatus}
                      onClick={() => {
                        void handleOpenBannerOffer(energyBannerOffer, "energy_banner");
                      }}
                    >
                      {getOfferTriggerPresentation(energyBannerOffer).featuredCta || paymentMethodPresentation.secondaryButton}
                    </Button>
                  </div>
                </div>
              ) : null}

              {offersLoading ? <div className="h-28 animate-pulse rounded-[24px] bg-white/10" /> : null}
              {offersError ? (
                <div className="rounded-[22px] border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">{offersError}</div>
              ) : null}
              {!offersLoading && !offersError && paymentOffers.length === 0 ? (
                <div className="rounded-[22px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] px-4 py-4 text-sm leading-6 text-[var(--text-secondary)]">
                  {selectedPaymentMethod === "telegram_stars"
                    ? "Сейчас нет доступных Stars-офферов."
                    : "Сейчас нет доступных рублёвых офферов."}
                </div>
              ) : null}

              {featuredOffer ? (
                <div className="rounded-[28px] border border-[rgba(215,185,139,0.18)] bg-[linear-gradient(180deg,rgba(48,39,56,0.96),rgba(27,21,33,0.98))] p-5 shadow-[0_18px_40px_rgba(0,0,0,0.34),0_0_24px_rgba(183,138,87,0.08)]">
                  {(() => {
                    const featuredDiscountBadge =
                      Number(featuredOffer.discount_percent || "0") > 0
                        ? `-${Math.round(Number(featuredOffer.discount_percent || "0"))}%`
                        : hasOfferDiscount(featuredOffer)
                          ? "Акция"
                          : null;
                    const featuredBonusBadge = getOfferBonusPercent(featuredOffer) > 0
                      ? `+${getOfferBonusPercent(featuredOffer)}% энергии`
                      : featuredOffer.bonus_energy > 0
                        ? `+${featuredOffer.bonus_energy} ⚡`
                        : null;
                    const featuredValueBadge = [featuredDiscountBadge, featuredBonusBadge].filter(Boolean).join(" • ");
                    const featuredTriggerBadge = featuredOfferTriggerPresentation?.badge;
                    const featuredSummary = featuredOfferTriggerPresentation?.featuredSummary;
                    const featuredCta =
                      featuredOfferTriggerPresentation?.featuredCta || paymentMethodPresentation.featuredButton;

                    return (
                      <>
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div className="space-y-3">
                            {featuredTriggerBadge ? (
                              <span className="inline-flex rounded-full border border-[rgba(215,185,139,0.24)] bg-[rgba(215,185,139,0.12)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--accent-gold)]">
                                {featuredTriggerBadge}
                              </span>
                            ) : null}
                            {featuredValueBadge ? (
                              <span className="inline-flex rounded-full border border-emerald-300/35 bg-emerald-400/12 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-100">
                                {featuredValueBadge}
                              </span>
                            ) : null}
                            <div className="mt-2 flex flex-wrap items-end gap-2">
                              {getOfferTotalEnergy(featuredOffer) > featuredOffer.energy_amount ? (
                                <p className="text-sm text-[var(--text-tertiary)] line-through">{featuredOffer.energy_amount} ⚡</p>
                              ) : null}
                              <p className="text-[2rem] font-semibold leading-none text-[var(--text-primary)]">
                                {featuredOfferPositioning?.displayName || `${getOfferTotalEnergy(featuredOffer)} ⚡`}
                              </p>
                            </div>
                            {featuredSummary ? (
                              <p className="max-w-[34rem] text-sm leading-6 text-[var(--text-secondary)]">
                                {featuredSummary}
                              </p>
                            ) : null}
                          </div>

                          <div className="min-w-[112px] text-left sm:text-right">
                            <p className="text-[2rem] font-semibold leading-none text-[var(--text-primary)]">
                              {getOfferTotalEnergy(featuredOffer)} ⚡
                            </p>
                            <p className="text-2xl font-semibold text-[var(--accent-gold)]">{formatOfferPrice(featuredOffer, selectedCurrency)}</p>
                            {formatOfferOldPrice(featuredOffer, selectedCurrency) ? (
                              <p className="mt-1 text-xs text-[var(--text-tertiary)] line-through">
                                {formatOfferOldPrice(featuredOffer, selectedCurrency)}
                              </p>
                            ) : null}
                            {formatOfferRemaining(featuredOffer.valid_until) ? (
                              <p className="mt-2 text-[11px] text-[var(--text-tertiary)]">
                                Акция активна: {formatOfferRemaining(featuredOffer.valid_until)}
                              </p>
                            ) : null}
                          </div>
                        </div>

                        <Button
                          variant="primary"
                          className="mt-5 h-12 w-full justify-between rounded-full border border-[rgba(255,255,255,0.08)] bg-[linear-gradient(180deg,#E2C79D_0%,#CFA974_100%)] px-5 text-[var(--text-on-gold)] shadow-[0_8px_22px_rgba(183,138,87,0.24)]"
                          disabled={Boolean(creatingProductCode) || checkingStatus}
                          onClick={() => {
                            emitOfferEvent(featuredOffer, "clicked_primary", "energy_featured");
                            void (selectedPaymentMethod === "telegram_stars"
                              ? handleBuyStarsOffer(featuredOffer)
                              : handleBuyRobokassaOffer(featuredOffer));
                          }}
                        >
                          {creatingProductCode === featuredOffer.offer_id ? (
                            <span className="inline-flex items-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Подготовка платежа...
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-2">
                              {featuredCta}
                              <ArrowRight className="h-4 w-4" strokeWidth={1.8} />
                            </span>
                          )}
                        </Button>
                      </>
	                    );
	                  })()}
	                </div>
	              ) : null}

              {secondaryOffers.length > 0 ? (
                <div className="grid gap-3">
                  {secondaryOffers.map((offer) => {
                    const creatingThisOffer = creatingProductCode === offer.offer_id;
                    const totalEnergy = getOfferTotalEnergy(offer);
                    const oldPrice = formatOfferOldPrice(offer, selectedCurrency);
                    const remaining = formatOfferRemaining(offer.valid_until);
                    const discountBadge = Number(offer.discount_percent || "0") > 0
                      ? `-${Math.round(Number(offer.discount_percent || "0"))}%`
                      : hasOfferDiscount(offer)
                        ? "Акция"
                        : null;
                    const bonusLabel = getOfferBonusPercent(offer) > 0
                      ? `+${getOfferBonusPercent(offer)}% энергии`
                      : offer.bonus_energy > 0
                        ? `+${offer.bonus_energy} бонус`
                        : null;
                    const positioning = getOfferPositioning(offer);
                    const triggerPresentation = getOfferTriggerPresentation(offer);
                    const triggerBadge = triggerPresentation.secondaryBadge;

                    return (
                      <div
                        key={offer.offer_id}
                        className="rounded-[24px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] p-4 shadow-[var(--surface-shadow-soft)]"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-medium text-[var(--text-primary)]">{positioning.displayName}</p>
                              {triggerBadge ? (
                                <span className="rounded-full border border-[rgba(215,185,139,0.24)] bg-[rgba(215,185,139,0.12)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--accent-gold)]">
                                  {triggerBadge}
                                </span>
                              ) : null}
                              {discountBadge ? (
                                <span className="rounded-full border border-emerald-300/35 bg-emerald-400/12 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-100">
                                  {discountBadge}
                                </span>
                              ) : null}
                            </div>
                            <div className="mt-2 flex flex-wrap items-end gap-2">
                              {totalEnergy > offer.energy_amount ? (
                                <p className="text-sm text-[var(--text-tertiary)] line-through">{offer.energy_amount} ⚡</p>
                              ) : null}
                              <p className="text-xl font-semibold text-[var(--text-primary)]">{totalEnergy} ⚡</p>
                            </div>
                            {triggerPresentation.secondarySummary ? (
                              <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">{triggerPresentation.secondarySummary}</p>
                            ) : null}
                            {bonusLabel ? <p className="mt-1 text-xs text-emerald-100/90">{bonusLabel}</p> : null}
                            {remaining ? <p className="mt-1 text-[11px] text-[var(--text-tertiary)]">До конца оффера: {remaining}</p> : null}
                          </div>
                          <div className="text-right">
                            <p className="whitespace-nowrap text-base font-semibold text-[var(--accent-gold)]">
                              {formatOfferPrice(offer, selectedCurrency)}
                            </p>
                            {oldPrice ? (
                              <p className="mt-1 whitespace-nowrap text-xs text-[var(--text-tertiary)] line-through">{oldPrice}</p>
                            ) : null}
                          </div>
                        </div>
                        <Button
                          className="mt-3 h-11 w-full rounded-full"
                          variant="outline"
                          disabled={Boolean(creatingProductCode) || checkingStatus}
                          onClick={() => {
                            emitOfferEvent(offer, "clicked_secondary", "energy_list");
                            void (selectedPaymentMethod === "telegram_stars"
                              ? handleBuyStarsOffer(offer)
                              : handleBuyRobokassaOffer(offer));
                          }}
                        >
                          {creatingThisOffer ? (
                            <span className="inline-flex items-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Подготовка платежа...
                            </span>
                          ) : (
                            paymentMethodPresentation.secondaryButton
                          )}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              ) : null}

              <div className="rounded-[22px] border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] px-4 py-4 text-xs leading-6 text-[var(--text-secondary)]">
                <p>
                  Нажимая «Купить», вы соглашаетесь с{" "}
                  <button
                    type="button"
                    className="font-medium text-[var(--accent-rose)] underline-offset-2 transition hover:text-[var(--text-primary)] hover:underline"
                    onClick={() => {
                      openExternalLink(OFFER_URL);
                    }}
                  >
                    Пользовательским соглашением
                  </button>{" "}
                  и{" "}
                  <button
                    type="button"
                    className="font-medium text-[var(--accent-rose)] underline-offset-2 transition hover:text-[var(--text-primary)] hover:underline"
                    onClick={() => {
                      openExternalLink(PRIVACY_URL);
                    }}
                  >
                    Политикой обработки данных
                  </button>
                  .
                </p>
                <p className="mt-2 text-[11px] text-[var(--text-tertiary)]">
                  Контакты:{" "}
                  <a
                    href={`mailto:${CONTACT_EMAIL}`}
                    className="font-medium text-[var(--accent-rose)] underline-offset-2 transition hover:text-[var(--text-primary)] hover:underline"
                  >
                    {CONTACT_EMAIL}
                  </a>
                </p>
              </div>
            </div>
          </Card>
        </section>

        <section className="rounded-[28px] border border-[rgba(255,255,255,0.08)] bg-[linear-gradient(180deg,rgba(34,27,41,0.9),rgba(17,13,22,0.94))] p-5 shadow-[var(--surface-shadow)]">
          {referralLoading ? (
            <div className="space-y-2">
              <div className="h-4 w-40 animate-pulse rounded bg-white/10" />
              <div className="h-3 w-full animate-pulse rounded bg-white/10" />
              <div className="h-9 w-full animate-pulse rounded-full bg-white/10" />
            </div>
          ) : (
            <>
              <div className="flex items-start gap-3">
                <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.05)] text-[var(--accent-gold)]">
                  <Users className="h-5 w-5" strokeWidth={1.55} />
                </span>
                <div className="space-y-2">
                  <p className="text-[11px] uppercase tracking-[0.26em] text-[var(--text-tertiary)]">Реферальная программа</p>
                  <h3 className="text-[1.05rem] font-semibold text-[var(--text-primary)]">Приводите друзей и копите энергию</h3>
                  <p className="text-sm leading-6 text-[var(--text-secondary)]">
                    {referralProgram?.preview_text ||
                      "Пригласите друзей и получайте бонусы: +2 ⚡ за активацию и +10 ⚡ за первую покупку."}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-[18px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] py-3">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Приглашено</p>
                  <p className="mt-2 text-base font-semibold text-[var(--text-primary)]">{referralProgram?.total_invited ?? 0}</p>
                </div>
                <div className="rounded-[18px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] py-3">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Активно</p>
                  <p className="mt-2 text-base font-semibold text-[var(--text-primary)]">{referralProgram?.total_activated ?? 0}</p>
                </div>
                <div className="rounded-[18px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] py-3">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Заработано</p>
                  <p className="mt-2 text-base font-semibold text-[var(--accent-gold)]">
                    +{referralProgram?.total_earned_energy_from_referrals ?? 0} ⚡
                  </p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Button size="sm" className="h-11 gap-2 rounded-full" disabled={!referralProgram} onClick={handleReferralInvite}>
                  <Share2 className="h-4 w-4" />
                  Пригласить друзей
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-11 gap-2 rounded-full border-white/20"
                  disabled={!referralProgram?.referral_link}
                  onClick={() => {
                    if (!referralProgram?.referral_link) return;
                    if (navigator.clipboard?.writeText) {
                      void navigator.clipboard.writeText(referralProgram.referral_link);
                    } else {
                      openExternalLink(referralProgram.referral_link);
                      return;
                    }
                    triggerHapticNotification("success");
                    setPurchaseNotice({
                      tone: "success",
                      title: "Ссылка скопирована",
                      message: "Отправьте реферальную ссылку другу и получите бонус, когда он активируется."
                    });
                  }}
                >
                  <Copy className="h-4 w-4" />
                  Скопировать ссылку
                </Button>
              </div>

              {referralError ? <p className="mt-3 text-xs text-[var(--accent-gold)]">{referralError}</p> : null}
            </>
          )}
        </section>

        {(statusText || errorText || activePurchase || pendingPurchase?.entity_id) && (
          <Card
            className={`border p-5 ${
              uiState === "succeeded"
                ? "border-emerald-400/40 bg-emerald-400/10"
                : uiState === "failed"
                  ? "border-red-400/40 bg-red-400/10"
                  : "border-[rgba(255,255,255,0.08)] bg-[linear-gradient(180deg,rgba(34,27,41,0.9),rgba(17,13,22,0.94))]"
            }`}
          >
            <div className="flex items-start gap-3">
              <span
                className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] border ${
                  uiState === "succeeded"
                    ? "border-emerald-300/35 bg-emerald-400/10 text-emerald-100"
                    : uiState === "failed"
                      ? "border-red-300/35 bg-red-400/10 text-red-100"
                      : "border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.05)] text-[var(--accent-gold)]"
                }`}
              >
                {uiState === "failed" ? <X className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
              </span>
              <div className="space-y-2">
                {statusText ? <p className="text-sm text-[var(--text-primary)]">{statusText}</p> : null}
                {errorText ? <p className="text-sm text-red-100">{errorText}</p> : null}
                {activePurchase ? (
                  <p className="text-xs leading-5 text-[var(--text-secondary)]">
                    Покупка{activePurchase.invoice_id ? ` #${activePurchase.invoice_id}` : ""} •{" "}
                    {activePurchase.title || activePurchase.code} • {activePurchase.currency} • статус:{" "}
                    {activePurchase.status}
                  </p>
                ) : null}
              </div>
            </div>

            {pendingPurchase?.entity_id ? (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-4 gap-2 rounded-full border-white/20"
                  disabled={!canCheckStatus}
                  onClick={() => {
                    if (!pendingPurchase) return;
                    autoPollAttemptsRef.current = 0;
                    void checkPurchaseStatus(pendingPurchase);
                  }}
                >
                  {checkingStatus ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Проверяем...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4" />
                      Проверить статус
                    </>
                  )}
                </Button>
                <p className="mt-2 text-xs text-[var(--text-secondary)]">
                  Автопроверка статуса выполняется раз в {Math.round(AUTO_STATUS_POLL_INTERVAL_MS / 1000)} секунд, только
                  когда приложение активно.
                </p>
              </>
            ) : null}
          </Card>
        )}
      </div>

      {shareHintOpen ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 px-4">
          <div className="max-h-[calc(100vh-32px)] w-full max-w-sm overflow-y-auto rounded-[24px] border border-white/15 bg-[#17151f] p-4 pb-[calc(env(safe-area-inset-bottom,0px)+20px)] text-[var(--text-primary)] shadow-[0_35px_70px_rgba(0,0,0,0.75)]">
            <div className="mb-3 flex gap-2">
              {(["ru", "en"] as const).map((language) => {
                const copy = REFERRAL_SHARE_COPY[language];
                const isActive = referralShareLanguage === language;
                return (
                  <button
                    key={language}
                    type="button"
                    onClick={() => setReferralShareLanguage(language)}
                    className={`flex-1 rounded-full border px-4 py-2 text-sm transition ${
                      isActive
                        ? "border-[rgba(215,185,139,0.45)] bg-[rgba(215,185,139,0.12)] text-[var(--accent-gold)]"
                        : "border-white/10 bg-white/5 text-[var(--text-secondary)]"
                    }`}
                  >
                    {copy.languageLabel}
                  </button>
                );
              })}
            </div>

            <div className="overflow-hidden rounded-[18px] border border-white/10 bg-[rgba(255,255,255,0.02)]">
              <img
                src={`/assets/referral/generated/referral-share-${referralShareVariant}-${referralShareLanguage}.png`}
                alt="Preview of referral invite"
                className="h-auto w-full"
              />
            </div>

            <div className="mt-4 flex items-center gap-2 text-sm text-[var(--text-primary)]">
              <Share2 className="h-4 w-4 text-[var(--accent-gold)]" />
              {referralShareCopy.instructionTitle}
            </div>

            <div className="mt-3 overflow-hidden rounded-[18px] border border-white/10 bg-[rgba(255,255,255,0.04)]">
              <img
                src="/assets/tarot/rws/share-instruction.png"
                alt="Инструкция отправки приглашения"
                className="h-auto w-full"
              />
            </div>
            <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{referralShareCopy.instructionText}</p>
            <div className="mt-4 flex gap-3">
              <Button
                variant="outline"
                className="flex-1 border-white/20"
                onClick={() => {
                  setShareHintOpen(false);
                  setPendingReferralCode(null);
                }}
              >
                {referralShareCopy.cancelText}
              </Button>
              <Button className="flex-1" onClick={handleReferralShareConfirm}>
                {referralShareCopy.confirmText}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {showExitIntentModal && exitIntentOffer ? (
        <div className="fixed inset-0 z-[85] flex items-end justify-center bg-[rgba(7,6,10,0.8)] px-4 pb-24 pt-12 backdrop-blur-sm sm:items-center sm:pb-6">
          <div className="w-full max-w-md rounded-[30px] border border-[rgba(215,185,139,0.2)] bg-[linear-gradient(180deg,rgba(42,34,49,0.98),rgba(19,14,24,0.98))] p-5 shadow-[0_24px_60px_rgba(0,0,0,0.4)]">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-3">
                <span className="inline-flex rounded-full border border-[rgba(215,185,139,0.24)] bg-[rgba(215,185,139,0.12)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--accent-gold)]">
                  {getOfferTriggerPresentation(exitIntentOffer).badge || "Предложение"}
                </span>
                <h3 className="text-[1.4rem] font-semibold leading-tight text-[var(--text-primary)]">
                  {getOfferPositioning(exitIntentOffer).displayName}
                </h3>
                <p className="text-sm leading-6 text-[var(--text-secondary)]">
                  {getOfferTriggerPresentation(exitIntentOffer).featuredSummary}
                </p>
                <div className="flex flex-wrap items-end gap-2">
                  {getOfferTotalEnergy(exitIntentOffer) > exitIntentOffer.energy_amount ? (
                    <p className="text-sm text-[var(--text-tertiary)] line-through">{exitIntentOffer.energy_amount} ⚡</p>
                  ) : null}
                  <p className="text-2xl font-semibold text-[var(--text-primary)]">
                    {getOfferTotalEnergy(exitIntentOffer)} ⚡
                  </p>
                  <p className="text-xl font-semibold text-[var(--accent-gold)]">
                    {formatOfferPrice(exitIntentOffer, selectedCurrency)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] text-[var(--text-secondary)]"
                onClick={handleDismissExitIntent}
                aria-label="Закрыть предложение"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 flex gap-3">
              <Button
                className="flex-1"
                onClick={() => {
                  void handleOpenBannerOffer(exitIntentOffer, "exit_intent_modal");
                }}
              >
                {getOfferTriggerPresentation(exitIntentOffer).featuredCta || "Забрать бонус"}
              </Button>
              <Button variant="outline" className="flex-1" onClick={handleDismissExitIntent}>
                Уйти
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {historyOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-transparent p-0 sm:items-center sm:p-4">
          <div className="flex max-h-[88vh] w-full max-w-2xl flex-col rounded-t-3xl border border-white/15 bg-[#0b0d16] p-5 shadow-[0_40px_90px_rgba(0,0,0,0.78)] sm:rounded-3xl">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">История операций</h3>
                <p className="text-xs text-[var(--text-secondary)]">Все изменения баланса энергии</p>
              </div>
              <button
                type="button"
                className="rounded-full border border-white/15 p-2 text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
                onClick={() => setHistoryOpen(false)}
                aria-label="Закрыть историю"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="min-h-[160px] flex-1 space-y-2 overflow-y-auto pr-1">
              {historyLoading ? (
                <div className="space-y-2">
                  <div className="h-14 animate-pulse rounded-xl bg-white/10" />
                  <div className="h-14 animate-pulse rounded-xl bg-white/10" />
                  <div className="h-14 animate-pulse rounded-xl bg-white/10" />
                </div>
              ) : null}

              {!historyLoading && historyItems.length === 0 && !historyError ? (
                <p className="rounded-xl border border-white/15 bg-[#171a26] p-3 text-sm text-[var(--text-secondary)]">
                  Операций пока нет.
                </p>
              ) : null}

              {historyItems.map((item) => {
                const positive = item.delta >= 0;
                const deltaLabel = `${positive ? "+" : ""}${item.delta} ⚡`;
                return (
                  <div key={item.id} className="rounded-xl border border-white/15 bg-[#1b1f2d] p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-[var(--text-primary)]">{item.display_title}</p>
                        {item.display_subtitle ? (
                          <p className="mt-0.5 text-xs text-[var(--text-secondary)]">{item.display_subtitle}</p>
                        ) : null}
                        <p className="mt-1 text-[11px] text-[var(--text-tertiary)]">{formatWalletHistoryTimestamp(item.created_at)}</p>
                      </div>
                      <div className={`text-sm font-semibold ${positive ? "text-emerald-200" : "text-red-200"}`}>{deltaLabel}</div>
                    </div>
                    {typeof item.balance_after === "number" ? (
                      <p className="mt-1 text-[11px] text-[var(--text-tertiary)]">Баланс после операции: {item.balance_after} ⚡</p>
                    ) : null}
                  </div>
                );
              })}

              {historyError ? (
                <p className="rounded-xl border border-red-400/35 bg-red-500/10 p-3 text-sm text-red-100">{historyError}</p>
              ) : null}
            </div>

            <div className="mt-4 flex gap-2">
              <Button
                variant="outline"
                className="flex-1 border-white/20"
                onClick={() => void loadWalletHistory({ reset: true })}
                disabled={historyLoading || historyLoadingMore}
              >
                Обновить
              </Button>
              <Button
                className="flex-1"
                onClick={() => void loadWalletHistory({ reset: false })}
                disabled={!historyNextCursor || historyLoading || historyLoadingMore}
              >
                {historyLoadingMore ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Загружаем...
                  </span>
                ) : (
                  "Показать ещё"
                )}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {purchaseNotice ? (
        <div className="fixed inset-x-0 bottom-20 z-50 flex justify-center px-4 pb-safe">
          <div
            className={`w-full max-w-md rounded-2xl border p-4 shadow-[0_24px_50px_rgba(0,0,0,0.58)] backdrop-blur-xl ${
              purchaseNotice.tone === "success"
                ? "border-emerald-400/40 bg-[rgba(20,43,33,0.94)]"
                : "border-red-400/40 bg-[rgba(52,24,28,0.94)]"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-white">{purchaseNotice.title}</h3>
                <p className="mt-1 text-sm text-white/80">{purchaseNotice.message}</p>
              </div>
              <button
                type="button"
                onClick={() => setPurchaseNotice(null)}
                className="rounded-full border border-white/20 p-1.5 text-white/75 transition hover:text-white"
                aria-label="Закрыть"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <Button size="sm" className="mt-3 w-full" onClick={() => setPurchaseNotice(null)}>
              Понятно
            </Button>
          </div>
        </div>
      ) : null}
    </>
  );
}
