import { useCallback, useEffect, useMemo, useState } from "react";
import { BadgePercent, CalendarClock, Crown, Eye, FlaskConical, Gift, Globe2, LayoutDashboard, Loader2, Rocket, ScrollText, ShieldAlert, Sparkles, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useProfile } from "@/hooks/useProfile";
import {
  adminArchiveDiscountRule,
  adminAssignDiscountRule,
  adminCreateDiscountRule,
  adminDisableAssignment,
  adminDuplicateDiscountRule,
  adminExpireAssignment,
  adminGetDashboardSummary,
  adminGetDiscountAnalytics,
  adminGetDiscountStats,
  adminGetPricingOfferMatrix,
  adminGetRecentActions,
  adminGetRecentPurchases,
  adminGetRecentUsages,
  adminGetUserOfferDebug,
  adminListPricingCountryTiers,
  adminListAssignments,
  adminListAssignmentsHistory,
  adminListDiscountRules,
  adminListDiscountUsages,
  adminProbeDiscountAccess,
  adminReorderDiscountRules,
  adminResolveDiscountDebug,
  adminSearchUsers,
  adminSimulateDiscountDismiss,
  adminSimulateDiscountPurchase,
  adminSimulateDiscountShow,
  adminToggleDiscountRule,
  adminUpsertPricingCountryTier,
  adminUpdateDiscountRule,
  type AdminAnalyticsResponse,
  type AdminDashboardSummaryResponse,
  type AdminPricingCountryTierItem,
  type AdminPricingCountryTierListResponse,
  type AdminPricingOfferMatrixItem,
  type AdminPricingOfferMatrixResponse,
  type AdminUserOfferDebugResponse,
  type AdminUserSearchItem,
  type DiscountAssignmentResponse,
  type DiscountResolveDebugResponse,
  type DiscountRuleResponse,
  type DiscountStatsResponse
} from "@/lib/api";

const ADMIN_USER_ID = "eacd5034-10e3-496b-8868-b25df9c28711";

type AdminTab = "dashboard" | "rules" | "preview" | "pricing" | "personal" | "tests" | "logs";

type RuleDraft = {
  id?: string;
  code: string;
  title: string;
  description: string;
  trigger_type: string;
  target_provider: "robokassa" | "telegram_stars" | "";
  target_purchase_type: string;
  target_currency: "RUB" | "USD" | "EUR" | "XTR" | "";
  target_offer_code: string;
  discount_type: "percent" | "fixed_amount" | "override_price";
  discount_value: string;
  bonus_energy: string;
  bonus_percent: string;
  priority: string;
  display_order: string;
  starts_at: string;
  ends_at: string;
  cooldown_hours: string;
  global_cooldown_hours: string;
  max_shows_per_day: string;
  max_uses_total: string;
  max_uses_per_user: string;
  source: string;
  is_active: boolean;
  is_test: boolean;
};

const DEFAULT_RULE_DRAFT: RuleDraft = {
  code: "",
  title: "",
  description: "",
  trigger_type: "first_purchase",
  target_provider: "robokassa",
  target_purchase_type: "energy",
  target_currency: "RUB",
  target_offer_code: "",
  discount_type: "percent",
  discount_value: "25",
  bonus_energy: "0",
  bonus_percent: "25",
  priority: "100",
  display_order: "100",
  starts_at: "",
  ends_at: "",
  cooldown_hours: "0",
  global_cooldown_hours: "0",
  max_shows_per_day: "0",
  max_uses_total: "0",
  max_uses_per_user: "0",
  source: "admin",
  is_active: true,
  is_test: false
};

const TAB_ITEMS: Array<{ id: AdminTab; label: string; icon: typeof LayoutDashboard }> = [
  { id: "dashboard", label: "Обзор", icon: LayoutDashboard },
  { id: "rules", label: "Акции", icon: BadgePercent },
  { id: "preview", label: "Превью", icon: Eye },
  { id: "pricing", label: "Тиры цен", icon: Globe2 },
  { id: "personal", label: "Персональные", icon: Users },
  { id: "tests", label: "Тесты", icon: FlaskConical },
  { id: "logs", label: "Журнал", icon: ScrollText }
];

type PricingTierDraft = {
  country_code: string;
  pricing_tier: "A" | "B" | "C";
  notes: string;
  is_active: boolean;
};

const DEFAULT_PRICING_TIER_DRAFT: PricingTierDraft = {
  country_code: "",
  pricing_tier: "B",
  notes: "",
  is_active: true
};

const TRIGGER_OPTIONS = [
  { value: "scheduled", label: "Плановая акция" },
  { value: "first_purchase", label: "Первая покупка" },
  { value: "zero_balance", label: "Нулевой баланс" },
  { value: "low_energy", label: "Мало энергии" },
  { value: "exit_intent", label: "Попытка уйти / paywall" },
  { value: "comeback", label: "Возврат пользователя" },
  { value: "post_ads", label: "После рекламы" },
  { value: "vip", label: "VIP-сегмент" },
  { value: "personal", label: "Персональное предложение" },
  { value: "manual", label: "Ручной оффер" }
] as const;

const PROVIDER_OPTIONS = [
  { value: "", label: "Оба канала" },
  { value: "telegram_stars", label: "Telegram Stars" },
  { value: "robokassa", label: "Рубли для РФ" }
] as const;

const DISCOUNT_TYPE_OPTIONS = [
  { value: "percent", label: "Скидка в %" },
  { value: "fixed_amount", label: "Фиксированная скидка" },
  { value: "override_price", label: "Жёсткая цена" }
] as const;

const RULE_PRESETS: Array<{
  id: string;
  label: string;
  description: string;
  patch: Partial<RuleDraft>;
}> = [
  {
    id: "first_purchase",
    label: "Первая покупка",
    description: "Мягкий welcome-оффер для первого платежа",
    patch: {
      trigger_type: "first_purchase",
      target_provider: "",
      target_currency: "",
      discount_type: "percent",
      discount_value: "15",
      bonus_energy: "0",
      bonus_percent: "20",
      priority: "40",
      display_order: "40",
      title: "Первое пополнение",
      description: "Welcome-оффер для первой покупки",
      code: "first_purchase_offer"
    }
  },
  {
    id: "zero_balance",
    label: "Нулевой баланс",
    description: "Оффер для пользователей, у которых энергия закончилась",
    patch: {
      trigger_type: "zero_balance",
      target_provider: "",
      target_currency: "",
      discount_type: "percent",
      discount_value: "15",
      bonus_energy: "0",
      bonus_percent: "25",
      priority: "45",
      display_order: "45",
      title: "Энергия закончилась",
      description: "Оффер при нулевом балансе",
      code: "zero_balance_rescue"
    }
  },
  {
    id: "low_energy",
    label: "Низкий баланс",
    description: "Подталкивает к пополнению, когда энергии почти не осталось",
    patch: {
      trigger_type: "low_energy",
      target_provider: "",
      target_currency: "",
      discount_type: "percent",
      discount_value: "10",
      bonus_energy: "2",
      bonus_percent: "0",
      priority: "60",
      display_order: "60",
      title: "Быстрое пополнение",
      description: "Оффер при низком балансе энергии",
      code: "low_energy_rescue"
    }
  },
  {
    id: "comeback",
    label: "Возврат",
    description: "Возвращает в ритуал после паузы",
    patch: {
      trigger_type: "comeback",
      target_provider: "",
      target_currency: "",
      discount_type: "percent",
      discount_value: "15",
      bonus_energy: "0",
      bonus_percent: "15",
      priority: "70",
      display_order: "70",
      title: "Возвращение в ритуал",
      description: "Comeback-оффер после паузы",
      code: "comeback_offer"
    }
  },
  {
    id: "exit_intent",
    label: "Перед выходом",
    description: "Мягкий оффер, когда пользователь не купил и собирается уйти",
    patch: {
      trigger_type: "exit_intent",
      target_provider: "",
      target_currency: "",
      discount_type: "percent",
      discount_value: "0",
      bonus_energy: "0",
      bonus_percent: "20",
      priority: "70",
      display_order: "70",
      title: "Спецпредложение",
      description: "Оффер перед выходом из paywall",
      code: "exit_intent_offer"
    }
  },
  {
    id: "post_ads",
    label: "После рекламы",
    description: "Мягкий апсейл сразу после рекламного ритуала",
    patch: {
      trigger_type: "post_ads",
      target_provider: "",
      target_currency: "",
      discount_type: "percent",
      discount_value: "0",
      bonus_energy: "0",
      bonus_percent: "20",
      priority: "80",
      display_order: "80",
      title: "Бонус после ритуала",
      description: "Оффер после рекламы",
      code: "post_ads_offer"
    }
  },
  {
    id: "scheduled",
    label: "Плановая акция",
    description: "Ограниченная акция на период или событие",
    patch: {
      trigger_type: "scheduled",
      target_provider: "",
      target_currency: "",
      discount_type: "percent",
      discount_value: "15",
      bonus_energy: "0",
      bonus_percent: "0",
      priority: "80",
      display_order: "80",
      title: "Временная акция",
      description: "Плановый промо-период",
      code: "scheduled_offer"
    }
  }
];

const QUICK_CAMPAIGNS: Array<{
  id: string;
  label: string;
  description: string;
  icon: typeof Gift;
  patch: () => Partial<RuleDraft>;
}> = [
  {
    id: "zero_balance",
    label: "Нулевой баланс",
    description: "Сценарий для пользователя, у которого энергия закончилась",
    icon: ShieldAlert,
    patch: () => ({
      code: "zero_balance_offer",
      title: "Энергия закончилась",
      description: "Оффер при нулевом балансе",
      trigger_type: "zero_balance",
      target_provider: "",
      target_currency: "",
      discount_type: "percent",
      discount_value: "15",
      bonus_energy: "0",
      bonus_percent: "25",
      priority: "45",
      display_order: "45",
      target_offer_code: "",
      is_active: true
    })
  },
  {
    id: "welcome",
    label: "Welcome offer",
    description: "Первое пополнение с мягкой выгодой для снятия страха первой оплаты",
    icon: Gift,
    patch: () => ({
      code: "welcome_offer",
      title: "Первое пополнение",
      description: "Welcome-оффер для первой покупки",
      trigger_type: "first_purchase",
      target_provider: "",
      target_currency: "",
      discount_type: "percent",
      discount_value: "15",
      bonus_energy: "0",
      bonus_percent: "20",
      priority: "40",
      display_order: "40",
      target_offer_code: "",
      is_active: true
    })
  },
  {
    id: "exit_intent",
    label: "Exit intent",
    description: "Дожимающий оффер, если пользователь не купил и собирается уйти",
    icon: Eye,
    patch: () => ({
      code: "exit_intent_offer",
      title: "Спецпредложение",
      description: "Оффер перед выходом из paywall",
      trigger_type: "exit_intent",
      target_provider: "",
      target_currency: "",
      discount_type: "percent",
      discount_value: "0",
      bonus_energy: "0",
      bonus_percent: "20",
      priority: "70",
      display_order: "70",
      target_offer_code: "",
      is_active: true
    })
  },
  {
    id: "post_ads",
    label: "Post-ads offer",
    description: "Апсейл после рекламного ритуала с мягким бонусом к энергии",
    icon: Sparkles,
    patch: () => ({
      code: "post_ads_offer",
      title: "Бонус после ритуала",
      description: "Оффер после рекламы",
      trigger_type: "post_ads",
      target_provider: "",
      target_currency: "",
      discount_type: "percent",
      discount_value: "0",
      bonus_energy: "0",
      bonus_percent: "20",
      priority: "80",
      display_order: "80",
      target_offer_code: "",
      is_active: true
    })
  },
  {
    id: "weekend",
    label: "Акция выходного дня",
    description: "Быстрый плановый промо-период с фиксированным окном показа",
    icon: CalendarClock,
    patch: () => ({
      code: "weekend_flash",
      title: "Акция выходного дня",
      description: "Плановая акция на ограниченный период",
      trigger_type: "scheduled",
      target_provider: "",
      target_currency: "",
      discount_type: "percent",
      discount_value: "15",
      bonus_energy: "0",
      bonus_percent: "0",
      priority: "55",
      display_order: "55",
      starts_at: toDatetimeLocalInput(new Date()),
      ends_at: toDatetimeLocalInput(new Date(Date.now() + 48 * 60 * 60 * 1000)),
      target_offer_code: "",
      is_active: true
    })
  },
  {
    id: "comeback",
    label: "Comeback offer",
    description: "Возвращает в ритуал пользователей после паузы",
    icon: Rocket,
    patch: () => ({
      code: "comeback_offer",
      title: "Возвращение в ритуал",
      description: "Оффер для пользователей после паузы",
      trigger_type: "comeback",
      target_provider: "",
      target_currency: "",
      discount_type: "percent",
      discount_value: "15",
      bonus_energy: "0",
      bonus_percent: "15",
      priority: "70",
      display_order: "70",
      target_offer_code: "",
      is_active: true
    })
  },
  {
    id: "vip",
    label: "VIP-предложение",
    description: "Большой пакет для пользователей с высокой вовлечённостью",
    icon: Crown,
    patch: () => ({
      code: "vip_stock_offer",
      title: "Премиальный запас",
      description: "Объёмный пакет для активных пользователей",
      trigger_type: "vip",
      target_provider: "",
      target_currency: "",
      discount_type: "percent",
      discount_value: "10",
      bonus_energy: "0",
      bonus_percent: "25",
      priority: "85",
      display_order: "85",
      target_offer_code: "energy_200",
      is_active: true
    })
  }
];

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (num: number) => String(num).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(
    date.getMinutes()
  )}`;
}

function toDatetimeLocalInput(date: Date): string {
  const pad = (num: number) => String(num).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(
    date.getMinutes()
  )}`;
}

function fromRule(rule: DiscountRuleResponse): RuleDraft {
  return {
    id: rule.id,
    code: rule.code,
    title: rule.title,
    description: rule.description ?? "",
    trigger_type: rule.trigger_type,
    target_provider: (rule.target_provider as "robokassa" | "telegram_stars" | null) ?? "",
    target_purchase_type: rule.target_purchase_type ?? "energy",
    target_currency: (rule.target_currency as "RUB" | "USD" | "EUR" | "XTR" | null) ?? "",
    target_offer_code: rule.target_offer_code ?? "",
    discount_type: (rule.discount_type as "percent" | "fixed_amount" | "override_price") ?? "percent",
    discount_value: rule.discount_value,
    bonus_energy: String(rule.bonus_energy ?? 0),
    bonus_percent: rule.bonus_percent ?? "",
    priority: String(rule.priority ?? 100),
    display_order: String(rule.display_order ?? rule.priority ?? 100),
    starts_at: toDatetimeLocal(rule.starts_at),
    ends_at: toDatetimeLocal(rule.ends_at),
    cooldown_hours: String(rule.cooldown_hours ?? 0),
    global_cooldown_hours: String(rule.global_cooldown_hours ?? 0),
    max_shows_per_day: String(rule.max_shows_per_day ?? 0),
    max_uses_total: String(rule.max_uses_total ?? 0),
    max_uses_per_user: String(rule.max_uses_per_user ?? 0),
    source: rule.source ?? "admin",
    is_active: rule.is_active,
    is_test: rule.is_test ?? false
  };
}

function prettyDate(iso: unknown): string {
  if (typeof iso !== "string" || !iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return String(iso);
  return date.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function ruleSummary(rule: DiscountRuleResponse): string {
  const discount =
    rule.discount_type === "percent"
      ? `-${rule.discount_value}%`
      : rule.discount_type === "fixed_amount"
        ? `-${rule.discount_value}`
        : `цена ${rule.discount_value}`;
  const bonus =
    Number(rule.bonus_energy || 0) > 0
      ? ` +${rule.bonus_energy}⚡`
      : Number(rule.bonus_percent || 0) > 0
        ? ` +${rule.bonus_percent}% энергии`
        : "";
  return `${discount}${bonus}`;
}

function triggerLabel(value: string): string {
  return TRIGGER_OPTIONS.find((item) => item.value === value)?.label ?? value;
}

function providerLabel(value: string | null | undefined): string {
  if (!value) return "Оба канала";
  return PROVIDER_OPTIONS.find((item) => item.value === value)?.label ?? value;
}

function discountTypeLabel(value: string): string {
  return DISCOUNT_TYPE_OPTIONS.find((item) => item.value === value)?.label ?? value;
}

function compactRuleTarget(rule: DiscountRuleResponse): string {
  const provider = providerLabel(rule.target_provider);
  const currency = rule.target_currency || "все валюты";
  return `${provider} • ${currency}`;
}

function assignmentRuleLabel(ruleId: string, rules: DiscountRuleResponse[]): string {
  const rule = rules.find((item) => item.id === ruleId);
  return rule ? `${rule.title} (${rule.code})` : ruleId;
}

function normalizeDraft(draft: RuleDraft): RuleDraft {
  if (draft.target_provider === "telegram_stars") {
    return { ...draft, target_currency: "XTR" };
  }
  if (draft.target_provider === "robokassa" && (!draft.target_currency || draft.target_currency === "XTR")) {
    return { ...draft, target_currency: "RUB" };
  }
  if (!draft.target_provider) {
    return { ...draft, target_currency: "" };
  }
  return draft;
}

function buildRulePayload(ruleDraft: RuleDraft) {
  const audienceFilter =
    ruleDraft.trigger_type === "zero_balance"
      ? { require_zero_balance: true }
      : ruleDraft.trigger_type === "comeback"
        ? { min_days_inactive: 3 }
        : {};
  return {
    code: ruleDraft.code.trim().toLowerCase(),
    title: ruleDraft.title.trim(),
    description: ruleDraft.description || null,
    trigger_type: ruleDraft.trigger_type,
    target_provider: ruleDraft.target_provider || null,
    target_purchase_type: ruleDraft.target_purchase_type || "energy",
    target_currency: ruleDraft.target_currency || null,
    target_offer_code: ruleDraft.target_offer_code || null,
    discount_type: ruleDraft.discount_type,
    discount_value: Number(ruleDraft.discount_value || "0"),
    bonus_energy: Number(ruleDraft.bonus_energy || "0"),
    bonus_percent: ruleDraft.bonus_percent.trim() ? Number(ruleDraft.bonus_percent) : null,
    priority: Number(ruleDraft.priority || "100"),
    display_order: Number(ruleDraft.display_order || ruleDraft.priority || "100"),
    starts_at: ruleDraft.starts_at ? new Date(ruleDraft.starts_at).toISOString() : null,
    ends_at: ruleDraft.ends_at ? new Date(ruleDraft.ends_at).toISOString() : null,
    cooldown_hours: Number(ruleDraft.cooldown_hours || "0"),
    global_cooldown_hours: Number(ruleDraft.global_cooldown_hours || "0"),
    max_shows_per_day: Number(ruleDraft.max_shows_per_day || "0"),
    max_uses_total: Number(ruleDraft.max_uses_total || "0"),
    max_uses_per_user: Number(ruleDraft.max_uses_per_user || "0"),
    source: ruleDraft.source || "admin",
    is_active: ruleDraft.is_active,
    is_test: ruleDraft.is_test,
    audience_filter: audienceFilter,
    meta: {}
  };
}

function previewTitle(draft: RuleDraft): string {
  if (draft.title.trim()) return draft.title.trim();
  return "Новый оффер";
}

function previewValue(draft: RuleDraft): string {
  const discount =
    draft.discount_type === "percent"
      ? `-${draft.discount_value || "0"}%`
      : draft.discount_type === "fixed_amount"
        ? `-${draft.discount_value || "0"}`
        : `цена ${draft.discount_value || "0"}`;
  const bonusEnergy = Number(draft.bonus_energy || "0");
  const bonusPercent = Number(draft.bonus_percent || "0");
  if (bonusEnergy > 0) return `${discount} +${bonusEnergy}⚡`;
  if (bonusPercent > 0) return `${discount} +${bonusPercent}% энергии`;
  return discount;
}

function previewCta(draft: RuleDraft): string {
  if (draft.target_provider === "telegram_stars") return "Открыть оплату в Stars";
  if (draft.target_provider === "robokassa") return "Открыть оплату в рублях";
  return "Открыть предложение";
}

type OfferPreviewSurface = "home_popup" | "home_banner" | "profile_banner" | "energy_banner" | "exit_intent_modal" | "energy_featured";

function triggerPreviewLabel(trigger: string): string {
  return TRIGGER_OPTIONS.find((item) => item.value === trigger)?.label ?? trigger;
}

function getPreviewSurfacesForTrigger(trigger: string): OfferPreviewSurface[] {
  switch (trigger) {
    case "personal":
      return ["home_popup", "energy_featured"];
    case "first_purchase":
      return ["home_banner", "profile_banner", "energy_featured"];
    case "zero_balance":
      return ["home_popup", "energy_featured"];
    case "low_energy":
      return ["home_banner", "energy_featured"];
    case "comeback":
      return ["home_popup", "energy_featured"];
    case "exit_intent":
      return ["exit_intent_modal", "energy_featured"];
    case "post_ads":
      return ["energy_banner", "energy_featured"];
    case "vip":
      return ["profile_banner", "energy_featured"];
    case "scheduled":
    case "manual":
    default:
      return ["energy_featured"];
  }
}

function getPreviewCopy(trigger: string) {
  switch (trigger) {
    case "personal":
      return {
        badge: "Персональное предложение",
        title: "Для вас открыто точечное предложение",
        body: "Этот оффер появляется не у всех. Он собран под ваш текущий ритм, вовлечённость и сценарии внутри приложения.",
        cta: "Открыть предложение"
      };
    case "first_purchase":
      return {
        badge: "Акция на первую покупку",
        title: "Стартовый оффер уже открыт",
        body: "Более мягкий вход в платный слой: бонусная энергия и лучший старт без лишнего барьера на первом платеже.",
        cta: "Открыть энергию"
      };
    case "zero_balance":
      return {
        badge: "Энергия закончилась",
        title: "Быстро верните доступ к сценариям",
        body: "Пользователь упёрся в ноль энергии и не может продолжить платные действия. Здесь оффер должен быть прямым и аварийно полезным.",
        cta: "Пополнить сейчас"
      };
    case "low_energy":
      return {
        badge: "Низкий запас энергии",
        title: "Запас лучше усилить заранее",
        body: "Это мягкое предупреждение: пользователь ещё может пользоваться продуктом, но скоро упрётся в дефицит.",
        cta: "Усилить запас"
      };
    case "comeback":
      return {
        badge: "С возвращением",
        title: "Хороший момент вернуться в ритуал",
        body: "Такой оффер встречает после паузы и должен ощущаться как мягкое возвращение в продукт, а не как навязчивая распродажа.",
        cta: "Вернуться в ритм"
      };
    case "exit_intent":
      return {
        badge: "Бонус перед выходом",
        title: "Небольшой бонус перед уходом",
        body: "Показывается только при выходе со страницы энергии. Его задача — мягко дожать пользователя, но не раздражать повтором.",
        cta: "Забрать бонус"
      };
    case "post_ads":
      return {
        badge: "После рекламного ритуала",
        title: "Можно усилить запас сразу после задания",
        body: "Это тёплый upsell после рекламы: без popup, только спокойный banner с понятным переходом в платный слой.",
        cta: "Усилить запас сейчас"
      };
    case "vip":
      return {
        badge: "VIP-предложение",
        title: "Открыт усиленный запас энергии",
        body: "Показывается активным пользователям как объёмный пакет без ощущения дешёвой распродажи.",
        cta: "Открыть VIP-запас"
      };
    case "scheduled":
      return {
        badge: "Временная акция",
        title: "Ограниченное по времени предложение",
        body: "Общая маркетинговая акция. Обычно живёт на странице энергии и иногда может поддерживаться мягким баннером.",
        cta: "Открыть предложение"
      };
    case "manual":
    default:
      return {
        badge: "Особое предложение",
        title: "Ручной оффер",
        body: "Служебный формат для точечных кампаний, который можно отдельно запустить и проверить в админке.",
        cta: "Открыть предложение"
      };
  }
}

function surfacePreviewLabel(surface: OfferPreviewSurface): string {
  switch (surface) {
    case "home_popup":
      return "Главная · Popup";
    case "home_banner":
      return "Главная · Banner";
    case "profile_banner":
      return "Профиль · Banner";
    case "energy_banner":
      return "Энергия · Banner";
    case "exit_intent_modal":
      return "Энергия · Exit intent modal";
    case "energy_featured":
    default:
      return "Энергия · Featured offer";
  }
}

function pricingTierTone(tier: "A" | "B" | "C"): string {
  if (tier === "A") return "border-emerald-300/25 bg-emerald-400/10 text-emerald-100";
  if (tier === "B") return "border-sky-300/25 bg-sky-400/10 text-sky-100";
  return "border-violet-300/25 bg-violet-400/10 text-violet-100";
}

function pricingTierLabel(tier: "A" | "B" | "C"): string {
  if (tier === "A") return "Tier A";
  if (tier === "B") return "Tier B";
  return "Tier C";
}

function regionDisplayName(countryCode: string): string {
  try {
    const displayNames = new Intl.DisplayNames(["ru"], { type: "region" });
    return displayNames.of(countryCode.toUpperCase()) || countryCode.toUpperCase();
  } catch {
    return countryCode.toUpperCase();
  }
}

export default function AdminDiscountsPage() {
  const navigate = useNavigate();
  const { profile, loading } = useProfile();
  const [activeTab, setActiveTab] = useState<AdminTab>("dashboard");

  const [accessLoading, setAccessLoading] = useState(true);
  const [accessGranted, setAccessGranted] = useState(false);

  const [dashboard, setDashboard] = useState<AdminDashboardSummaryResponse | null>(null);
  const [recentPurchases, setRecentPurchases] = useState<Record<string, unknown>[]>([]);
  const [recentUsages, setRecentUsages] = useState<Record<string, unknown>[]>([]);
  const [recentActions, setRecentActions] = useState<Record<string, unknown>[]>([]);
  const [stats, setStats] = useState<DiscountStatsResponse | null>(null);
  const [analytics, setAnalytics] = useState<AdminAnalyticsResponse | null>(null);
  const [pricingSummary, setPricingSummary] = useState<AdminPricingCountryTierListResponse | null>(null);
  const [pricingMatrix, setPricingMatrix] = useState<AdminPricingOfferMatrixResponse | null>(null);
  const [pricingLoading, setPricingLoading] = useState(false);
  const [pricingError, setPricingError] = useState<string | null>(null);
  const [pricingSearch, setPricingSearch] = useState("");
  const [pricingTierFilter, setPricingTierFilter] = useState<"all" | "A" | "B" | "C">("all");
  const [pricingDraft, setPricingDraft] = useState<PricingTierDraft>(DEFAULT_PRICING_TIER_DRAFT);
  const [pricingSaving, setPricingSaving] = useState(false);
  const [pricingActionError, setPricingActionError] = useState<string | null>(null);

  const [rules, setRules] = useState<DiscountRuleResponse[]>([]);
  const [rulesLoading, setRulesLoading] = useState(false);
  const [ruleFilter, setRuleFilter] = useState<"all" | "active" | "inactive" | "archived">("all");
  const [ruleTriggerFilter, setRuleTriggerFilter] = useState("all");
  const [ruleProviderFilter, setRuleProviderFilter] = useState("all");
  const [ruleError, setRuleError] = useState<string | null>(null);
  const [ruleDraft, setRuleDraft] = useState<RuleDraft>(DEFAULT_RULE_DRAFT);
  const [ruleSaving, setRuleSaving] = useState(false);
  const [ruleActionError, setRuleActionError] = useState<string | null>(null);

  const [assignments, setAssignments] = useState<DiscountAssignmentResponse[]>([]);
  const [assignmentsHistory, setAssignmentsHistory] = useState<Record<string, unknown>[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [userOptions, setUserOptions] = useState<AdminUserSearchItem[]>([]);
  const [selectedUser, setSelectedUser] = useState<AdminUserSearchItem | null>(null);
  const [selectedRuleId, setSelectedRuleId] = useState("");
  const [assignError, setAssignError] = useState<string | null>(null);
  const [assignLoading, setAssignLoading] = useState(false);

  const [testUserId, setTestUserId] = useState("");
  const [testProvider, setTestProvider] = useState<"robokassa" | "telegram_stars">("robokassa");
  const [testCurrency, setTestCurrency] = useState<"RUB" | "USD" | "EUR" | "XTR">("RUB");
  const [testTriggerType, setTestTriggerType] = useState("auto");
  const [testSource, setTestSource] = useState("energy_page");
  const [testBalanceOverride, setTestBalanceOverride] = useState("");
  const [simulateUsageId, setSimulateUsageId] = useState("");
  const [simulatePaymentId, setSimulatePaymentId] = useState("");
  const [testLoading, setTestLoading] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);
  const [debugData, setDebugData] = useState<AdminUserOfferDebugResponse | null>(null);
  const [resolveData, setResolveData] = useState<DiscountResolveDebugResponse | null>(null);
  const [debugUsages, setDebugUsages] = useState<Record<string, unknown>[]>([]);
  const [previewTriggerType, setPreviewTriggerType] = useState<string>("first_purchase");

  const strictAdminByProfile = Boolean(profile?.user?.is_admin) || profile?.user?.id === ADMIN_USER_ID;

  const checkAccess = useCallback(() => {
    let cancelled = false;
    let retries = 0;
    const maxRetries = 5;

    const probe = async () => {
      if (cancelled) return;
      try {
        const access = await adminProbeDiscountAccess();
        if (!cancelled) {
          setAccessGranted(access.allowed && access.user_id === ADMIN_USER_ID);
          setAccessLoading(false);
        }
      } catch {
        if (cancelled) return;
        retries += 1;
        if (retries < maxRetries) {
          window.setTimeout(() => {
            void probe();
          }, 900);
          return;
        }
        setAccessGranted(false);
        setAccessLoading(false);
      }
    };

    setAccessLoading(true);
    void probe();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadDashboard = useCallback(async () => {
    const [summary, discountStats, discountAnalytics, purchases, usages, actions] = await Promise.all([
      adminGetDashboardSummary(),
      adminGetDiscountStats(),
      adminGetDiscountAnalytics(),
      adminGetRecentPurchases(15),
      adminGetRecentUsages(20),
      adminGetRecentActions(20)
    ]);
    setDashboard(summary);
    setStats(discountStats);
    setAnalytics(discountAnalytics);
    setRecentPurchases(purchases.items ?? []);
    setRecentUsages(usages.items ?? []);
    setRecentActions(actions.items ?? []);
  }, []);

  const loadRules = useCallback(async () => {
    try {
      setRulesLoading(true);
      setRuleError(null);
      const next = await adminListDiscountRules();
      setRules(next);
    } catch (error) {
      setRuleError(error instanceof Error ? error.message : "Не удалось загрузить правила");
    } finally {
      setRulesLoading(false);
    }
  }, []);

  const loadPricing = useCallback(async () => {
    try {
      setPricingLoading(true);
      setPricingError(null);
      const [summary, matrix] = await Promise.all([
        adminListPricingCountryTiers(true),
        adminGetPricingOfferMatrix("telegram_stars")
      ]);
      setPricingSummary(summary);
      setPricingMatrix(matrix);
    } catch (error) {
      setPricingError(error instanceof Error ? error.message : "Не удалось загрузить тиры цен");
    } finally {
      setPricingLoading(false);
    }
  }, []);

  const loadAssignments = useCallback(
    async (userId?: string) => {
      const [list, history] = await Promise.all([
        adminListAssignments(userId),
        adminListAssignmentsHistory({ user_id: userId, limit: 60 })
      ]);
      setAssignments(list);
      setAssignmentsHistory(history.items ?? []);
    },
    []
  );

  const loadDebug = useCallback(async () => {
    if (!testUserId.trim()) return;
    const [userOffer, resolve, usages] = await Promise.all([
      adminGetUserOfferDebug(testUserId.trim()),
      adminResolveDiscountDebug({
        user_id: testUserId.trim(),
        provider: testProvider,
        currency: testProvider === "telegram_stars" ? "XTR" : testCurrency,
        trigger_type: testTriggerType,
        source: testSource,
        balance_override: testBalanceOverride.trim() ? Number(testBalanceOverride) : undefined
      }),
      adminListDiscountUsages(testUserId.trim(), 30)
    ]);
    setDebugData(userOffer);
    setResolveData(resolve);
    setDebugUsages(usages.items ?? []);
  }, [testBalanceOverride, testCurrency, testProvider, testSource, testTriggerType, testUserId]);

  useEffect(() => checkAccess(), [checkAccess]);

  useEffect(() => {
    if (!accessGranted) return;
    void loadDashboard();
    void loadRules();
    void loadPricing();
    void loadAssignments();
  }, [accessGranted, loadAssignments, loadDashboard, loadPricing, loadRules]);

  useEffect(() => {
    const trimmed = userSearch.trim();
    if (!trimmed) {
      setUserOptions([]);
      return;
    }
    const timer = window.setTimeout(() => {
      void adminSearchUsers(trimmed, 12)
        .then((data) => setUserOptions(data.items ?? []))
        .catch(() => setUserOptions([]));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [userSearch]);

  useEffect(() => {
    if (selectedUser?.user_id) {
      setTestUserId(selectedUser.user_id);
      void loadAssignments(selectedUser.user_id);
    }
  }, [selectedUser, loadAssignments]);

  useEffect(() => {
    if (ruleDraft.target_provider === "telegram_stars" && ruleDraft.target_currency !== "XTR") {
      setRuleDraft((prev) => ({ ...prev, target_currency: "XTR" }));
    }
    if (ruleDraft.target_provider === "robokassa" && (!ruleDraft.target_currency || ruleDraft.target_currency === "XTR")) {
      setRuleDraft((prev) => ({ ...prev, target_currency: "RUB" }));
    }
  }, [ruleDraft.target_currency, ruleDraft.target_provider]);

  useEffect(() => {
    if (testProvider === "telegram_stars" && testCurrency !== "XTR") {
      setTestCurrency("XTR");
    }
    if (testProvider === "robokassa" && testCurrency === "XTR") {
      setTestCurrency("RUB");
    }
  }, [testCurrency, testProvider]);

  const filteredRules = useMemo(() => {
    return rules.filter((rule) => {
      const isArchived = Boolean(rule.archived_at) || Boolean((rule.meta as Record<string, unknown>)?.archived);
      if (ruleFilter === "active" && !rule.is_active) return false;
      if (ruleFilter === "inactive" && (rule.is_active || isArchived)) return false;
      if (ruleFilter === "archived" && !isArchived) return false;
      if (ruleFilter === "all" && isArchived) return false;
      if (ruleTriggerFilter !== "all" && rule.trigger_type !== ruleTriggerFilter) return false;
      if (ruleProviderFilter !== "all" && (rule.target_provider ?? "all") !== ruleProviderFilter) return false;
      return true;
    });
  }, [ruleFilter, ruleProviderFilter, ruleTriggerFilter, rules]);

  const rulesOverview = useMemo(() => {
    const active = rules.filter((rule) => rule.is_active && !rule.archived_at);
    return {
      all: active.length,
      stars: active.filter((rule) => rule.target_provider === "telegram_stars").length,
      rub: active.filter((rule) => rule.target_provider === "robokassa").length,
      personal: active.filter((rule) => rule.trigger_type === "personal").length,
      scheduled: active.filter((rule) => rule.trigger_type === "scheduled").length
    };
  }, [rules]);

  const filteredPricingMappings = useMemo(() => {
    const items = pricingSummary?.items ?? [];
    const query = pricingSearch.trim().toLowerCase();
    return items.filter((item) => {
      if (pricingTierFilter !== "all" && item.pricing_tier !== pricingTierFilter) return false;
      if (!query) return true;
      const code = item.country_code.toLowerCase();
      const name = regionDisplayName(item.country_code).toLowerCase();
      return code.includes(query) || name.includes(query);
    });
  }, [pricingSearch, pricingSummary?.items, pricingTierFilter]);

  const pricingMatrixByTier = useMemo(() => {
    const grouped: Record<string, AdminPricingOfferMatrixItem[]> = {};
    for (const item of pricingMatrix?.items ?? []) {
      if (!grouped[item.pricing_tier]) grouped[item.pricing_tier] = [];
      grouped[item.pricing_tier].push(item);
    }
    return grouped;
  }, [pricingMatrix?.items]);

  const previewDraft = useMemo(() => normalizeDraft(ruleDraft), [ruleDraft]);
  const previewSurfaces = useMemo(
    () => getPreviewSurfacesForTrigger(previewTriggerType),
    [previewTriggerType]
  );
  const previewCopy = useMemo(
    () => getPreviewCopy(previewTriggerType),
    [previewTriggerType]
  );

  const applyQuickCampaign = useCallback(
    async (patch: Partial<RuleDraft>, mode: "prepare" | "launch") => {
      const merged = normalizeDraft({
        ...DEFAULT_RULE_DRAFT,
        ...ruleDraft,
        ...patch,
        id: undefined
      });

      if (mode === "prepare") {
        setRuleDraft(merged);
        setRuleActionError(null);
        return;
      }

      try {
        setRuleSaving(true);
        setRuleActionError(null);
        const payload = buildRulePayload(merged);
        const existing = rules.find((item) => item.code === payload.code);
        if (existing) {
          await adminUpdateDiscountRule(existing.id, payload);
          setRuleDraft({ ...merged, id: existing.id });
        } else {
          await adminCreateDiscountRule(payload);
          setRuleDraft(merged);
        }
        await Promise.all([loadRules(), loadDashboard()]);
      } catch (error) {
        setRuleActionError(error instanceof Error ? error.message : "Не удалось запустить акцию");
      } finally {
        setRuleSaving(false);
      }
    },
    [loadDashboard, loadRules, ruleDraft, rules]
  );

  if ((loading && !profile) || accessLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-[var(--text-secondary)]">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Загружаем админ-панель...
      </div>
    );
  }

  if (!strictAdminByProfile && !accessGranted) {
    return (
      <Card className="border border-red-500/30 bg-red-500/10 p-6">
        <div className="flex items-start gap-3">
          <ShieldAlert className="mt-0.5 h-5 w-5 text-red-200" />
          <div>
            <p className="text-base font-semibold text-red-100">Доступ запрещён</p>
            <p className="mt-1 text-sm text-red-100/80">
              Админ-панель доступна только авторизованному админу.
            </p>
            <Button className="mt-4" variant="outline" onClick={() => navigate("/profile")}>
              Вернуться в профиль
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4 pb-8">
      <Card className="rounded-[24px] border border-white/10 bg-[var(--bg-card)]/85 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-lg font-semibold text-[var(--text-primary)]">Админка скидок и офферов</p>
            <p className="text-sm text-[var(--text-secondary)]">Акции, персональные предложения, тесты и аналитика</p>
          </div>
          <Button
            variant="outline"
            className="border-white/20"
            onClick={() => {
              void Promise.all([loadDashboard(), loadRules(), loadPricing(), loadAssignments(selectedUser?.user_id)]);
            }}
          >
            Обновить всё
          </Button>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <MetricCard title="Активных правил" value={stats?.active_rules ?? 0} />
          <MetricCard title="Покупок по акциям" value={stats?.usages_purchased ?? 0} />
          <MetricCard title="Конверсия" value={`${analytics?.conversion_rate ?? stats?.conversion_rate ?? 0}%`} />
          <MetricCard title="Назначений" value={analytics?.users_with_assignments ?? 0} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {TAB_ITEMS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={`rounded-full border px-4 py-2 text-sm transition ${
                activeTab === id
                  ? "border-[var(--accent-pink)]/60 bg-[var(--accent-pink)]/20 text-[var(--text-primary)]"
                  : "border-white/20 bg-white/5 text-[var(--text-secondary)]"
              }`}
            >
              <span className="inline-flex items-center gap-2">
                <Icon className="h-4 w-4" />
                {label}
              </span>
            </button>
          ))}
        </div>
      </Card>

      {activeTab === "dashboard" ? (
        <div className="space-y-4">
          <Card className="rounded-[24px] border border-white/10 bg-[var(--bg-card)]/85 p-5">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <MetricCard title="Пользователи" value={dashboard?.users_total ?? 0} />
              <MetricCard title="Сегодня новых" value={dashboard?.users_today ?? 0} />
              <MetricCard title="Реклама main" value={dashboard?.ads_main_today ?? 0} />
              <MetricCard title="Реклама task" value={dashboard?.ads_task_today ?? 0} />
              <MetricCard title="Покупки" value={dashboard?.purchases_today ?? 0} />
              <MetricCard title="RUB" value={dashboard?.revenue_rub_today ?? "0"} />
              <MetricCard title="USD" value={dashboard?.revenue_usd_today ?? "0"} />
              <MetricCard title="EUR" value={dashboard?.revenue_eur_today ?? "0"} />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
              <MetricCard title="Правил активно" value={stats?.active_rules ?? 0} />
              <MetricCard title="Показов" value={stats?.usages_shown ?? 0} />
              <MetricCard title="Покупок по акциям" value={stats?.usages_purchased ?? 0} />
              <MetricCard title="Конверсия %" value={analytics?.conversion_rate ?? stats?.conversion_rate ?? 0} />
            </div>
          </Card>

          <TwoColumnList
            leftTitle="Последние покупки"
            leftItems={recentPurchases}
            rightTitle="Последние показы скидок"
            rightItems={recentUsages}
          />
        </div>
      ) : null}

      {activeTab === "rules" ? (
        <div className="space-y-4">
          <Card className="rounded-[24px] border border-white/10 bg-[var(--bg-card)]/85 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-base font-semibold text-[var(--text-primary)]">Быстрые сценарии</p>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  Готовые рабочие кампании. Можно сразу запустить правило или сначала подгрузить его в конструктор и подправить детали.
                </p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-[var(--text-secondary)]">
                <Eye className="h-3.5 w-3.5" />
                Быстрый запуск без ручного заполнения
              </div>
            </div>
            <div className="mt-4 grid gap-3 lg:grid-cols-[1.5fr_1fr]">
              <div className="grid gap-3 sm:grid-cols-2">
                {QUICK_CAMPAIGNS.map((campaign) => {
                  const Icon = campaign.icon;
                  return (
                    <div key={campaign.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="flex items-start gap-3">
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-2.5 text-[var(--accent-gold)]">
                          <Icon className="h-4.5 w-4.5" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-[var(--text-primary)]">{campaign.label}</p>
                          <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">{campaign.description}</p>
                        </div>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button variant="outline" className="border-white/20" onClick={() => void applyQuickCampaign(campaign.patch(), "prepare")}>
                          Подготовить
                        </Button>
                        <Button disabled={ruleSaving} onClick={() => void applyQuickCampaign(campaign.patch(), "launch")}>
                          Запустить сразу
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="rounded-2xl border border-[var(--accent-pink)]/20 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--text-tertiary)]">Как увидит пользователь</p>
                <div className="mt-3 rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(31,22,43,0.95),rgba(22,16,29,0.98))] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="rounded-full border border-[var(--accent-gold)]/30 bg-[var(--accent-gold)]/10 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-[var(--accent-gold)]">
                      {triggerLabel(previewDraft.trigger_type)}
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-[var(--text-secondary)]">
                      {providerLabel(previewDraft.target_provider)}
                    </span>
                  </div>
                  <p className="mt-4 text-2xl font-semibold leading-tight text-[var(--text-primary)]">{previewTitle(previewDraft)}</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                    {previewDraft.description?.trim() || "Короткое описание оффера появится здесь после настройки правила."}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="rounded-full border border-emerald-300/25 bg-emerald-400/10 px-3 py-1.5 text-xs text-emerald-100">
                      {previewValue(previewDraft)}
                    </span>
                    {previewDraft.target_offer_code ? (
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-[var(--text-secondary)]">
                        Пакет: {previewDraft.target_offer_code}
                      </span>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    className="mt-5 w-full rounded-full bg-[linear-gradient(180deg,#E4C48C,#CFA463)] px-4 py-3 text-sm font-semibold text-[#24170F]"
                  >
                    {previewCta(previewDraft)}
                  </button>
                </div>
              </div>
            </div>
          </Card>

          <Card className="rounded-[24px] border border-white/10 bg-[var(--bg-card)]/85 p-5">
            <p className="text-base font-semibold text-[var(--text-primary)]">Список правил</p>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Здесь видно, какие акции сейчас активны, для какого канала оплаты они работают и что именно дают.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
              <MetricCard title="Активных всего" value={rulesOverview.all} />
              <MetricCard title="Telegram Stars" value={rulesOverview.stars} />
              <MetricCard title="Рубли для РФ" value={rulesOverview.rub} />
              <MetricCard title="Персональные" value={rulesOverview.personal} />
              <MetricCard title="Плановые" value={rulesOverview.scheduled} />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <QuickFilterChip
                label="Все активные"
                onClick={() => {
                  setRuleFilter("active");
                  setRuleTriggerFilter("all");
                  setRuleProviderFilter("all");
                }}
              />
              <QuickFilterChip
                label="Только Stars"
                onClick={() => {
                  setRuleFilter("active");
                  setRuleTriggerFilter("all");
                  setRuleProviderFilter("telegram_stars");
                }}
              />
              <QuickFilterChip
                label="Только RUB"
                onClick={() => {
                  setRuleFilter("active");
                  setRuleTriggerFilter("all");
                  setRuleProviderFilter("robokassa");
                }}
              />
              <QuickFilterChip
                label="Персональные"
                onClick={() => {
                  setRuleFilter("active");
                  setRuleTriggerFilter("personal");
                  setRuleProviderFilter("all");
                }}
              />
              <QuickFilterChip
                label="Плановые"
                onClick={() => {
                  setRuleFilter("active");
                  setRuleTriggerFilter("scheduled");
                  setRuleProviderFilter("all");
                }}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <select
                className="rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm"
                value={ruleFilter}
                onChange={(e) => setRuleFilter(e.target.value as typeof ruleFilter)}
              >
                <option value="all">Активные + выключенные</option>
                <option value="active">Только активные</option>
                <option value="inactive">Только выключенные</option>
                <option value="archived">Архив</option>
              </select>
              <select
                className="rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm"
                value={ruleTriggerFilter}
                onChange={(e) => setRuleTriggerFilter(e.target.value)}
              >
                <option value="all">Любой триггер</option>
                {TRIGGER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <select
                className="rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm"
                value={ruleProviderFilter}
                onChange={(e) => setRuleProviderFilter(e.target.value)}
              >
                <option value="all">Любой провайдер</option>
                <option value="robokassa">Рубли для РФ</option>
                <option value="telegram_stars">Telegram Stars</option>
              </select>
              <Button
                variant="outline"
                className="border-white/20"
                onClick={() => {
                  setRuleDraft(DEFAULT_RULE_DRAFT);
                  setRuleActionError(null);
                }}
              >
                Новое правило
              </Button>
            </div>
            {ruleError ? <p className="mt-2 text-xs text-red-200">{ruleError}</p> : null}
            <div className="mt-3 space-y-2">
              {rulesLoading ? (
                <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                  <Loader2 className="h-4 w-4 animate-spin" /> Загружаем правила...
                </div>
              ) : null}
              {filteredRules.map((rule) => (
                <div key={rule.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-[var(--text-primary)]">{rule.title}</p>
                      <div className="mt-1 flex flex-wrap gap-2">
                        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-[var(--text-secondary)]">
                          {triggerLabel(rule.trigger_type)}
                        </span>
                        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-[var(--text-secondary)]">
                          {compactRuleTarget(rule)}
                        </span>
                        <span className="rounded-full border border-emerald-300/25 bg-emerald-400/10 px-2.5 py-1 text-[11px] text-emerald-100">
                          {ruleSummary(rule)}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-[var(--text-tertiary)]">
                        {rule.code}
                        {rule.starts_at || rule.ends_at
                          ? ` • ${rule.starts_at ? `с ${prettyDate(rule.starts_at)}` : ""}${rule.ends_at ? ` до ${prettyDate(rule.ends_at)}` : ""}`
                          : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <MiniAction
                        label={rule.is_active ? "Выключить" : "Включить"}
                        onClick={async () => {
                          await adminToggleDiscountRule(rule.id);
                          await loadRules();
                        }}
                      />
                      <MiniAction label="Ред." onClick={() => setRuleDraft(fromRule(rule))} />
                      <MiniAction
                        label="Дубль"
                        onClick={async () => {
                          await adminDuplicateDiscountRule(rule.id);
                          await loadRules();
                        }}
                      />
                      <MiniAction
                        label="Архив"
                        danger
                        onClick={async () => {
                          await adminArchiveDiscountRule(rule.id);
                          await loadRules();
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="rounded-[24px] border border-white/10 bg-[var(--bg-card)]/85 p-5">
            <p className="text-base font-semibold text-[var(--text-primary)]">
              {ruleDraft.id ? "Редактирование правила" : "Создание правила"}
            </p>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Используй шаблон ниже, а потом при необходимости подправь детали.
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {RULE_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  className="rounded-2xl border border-white/10 bg-white/5 p-3 text-left transition hover:border-[var(--accent-pink)]/40 hover:bg-[var(--accent-pink)]/10"
                  onClick={() =>
                    setRuleDraft((prev) => ({
                      ...prev,
                      ...preset.patch
                    }))
                  }
                >
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{preset.label}</p>
                  <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">{preset.description}</p>
                </button>
              ))}
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Служебный код">
                <Input value={ruleDraft.code} onChange={(e) => setRuleDraft((p) => ({ ...p, code: e.target.value }))} placeholder="first_purchase_offer" />
              </Field>
              <Field label="Название акции">
                <Input value={ruleDraft.title} onChange={(e) => setRuleDraft((p) => ({ ...p, title: e.target.value }))} placeholder="Первое пополнение" />
              </Field>
              <Field label="Короткое описание">
                <Input value={ruleDraft.description} onChange={(e) => setRuleDraft((p) => ({ ...p, description: e.target.value }))} placeholder="Что это за предложение" />
              </Field>
              <Field label="Триггер показа">
                <select className="rounded-xl border border-white/15 bg-white/5 px-3 py-2" value={ruleDraft.trigger_type} onChange={(e) => setRuleDraft((p) => ({ ...p, trigger_type: e.target.value }))}>
                  {TRIGGER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Канал оплаты">
                <select className="rounded-xl border border-white/15 bg-white/5 px-3 py-2" value={ruleDraft.target_provider} onChange={(e) => setRuleDraft((p) => ({ ...p, target_provider: e.target.value as RuleDraft["target_provider"] }))}>
                  {PROVIDER_OPTIONS.map((option) => (
                    <option key={option.value || "all"} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Валюта">
                <select className="rounded-xl border border-white/15 bg-white/5 px-3 py-2" value={ruleDraft.target_currency} onChange={(e) => setRuleDraft((p) => ({ ...p, target_currency: e.target.value as RuleDraft["target_currency"] }))}>
                  <option value="">Все валюты</option>
                  <option value="RUB">RUB</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="XTR">XTR</option>
                </select>
              </Field>
              <Field label="Тип скидки">
                <select className="rounded-xl border border-white/15 bg-white/5 px-3 py-2" value={ruleDraft.discount_type} onChange={(e) => setRuleDraft((p) => ({ ...p, discount_type: e.target.value as RuleDraft["discount_type"] }))}>
                  {DISCOUNT_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Значение скидки">
                <Input value={ruleDraft.discount_value} onChange={(e) => setRuleDraft((p) => ({ ...p, discount_value: e.target.value }))} placeholder="15" />
              </Field>
              <Field label="Бонус энергии">
                <Input value={ruleDraft.bonus_energy} onChange={(e) => setRuleDraft((p) => ({ ...p, bonus_energy: e.target.value }))} placeholder="0" />
              </Field>
              <Field label="Бонус % энергии">
                <Input value={ruleDraft.bonus_percent} onChange={(e) => setRuleDraft((p) => ({ ...p, bonus_percent: e.target.value }))} placeholder="20" />
              </Field>
              <Field label="Для конкретного пакета">
                <Input value={ruleDraft.target_offer_code} onChange={(e) => setRuleDraft((p) => ({ ...p, target_offer_code: e.target.value }))} placeholder="energy_60" />
              </Field>
              <Field label="Тип покупки">
                <Input value={ruleDraft.target_purchase_type} onChange={(e) => setRuleDraft((p) => ({ ...p, target_purchase_type: e.target.value }))} placeholder="energy" />
              </Field>
              <Field label="Приоритет">
                <Input value={ruleDraft.priority} onChange={(e) => setRuleDraft((p) => ({ ...p, priority: e.target.value }))} placeholder="100" />
              </Field>
              <Field label="Порядок в UI">
                <Input value={ruleDraft.display_order} onChange={(e) => setRuleDraft((p) => ({ ...p, display_order: e.target.value }))} placeholder="100" />
              </Field>
              <Field label="Начало действия">
                <Input type="datetime-local" value={ruleDraft.starts_at} onChange={(e) => setRuleDraft((p) => ({ ...p, starts_at: e.target.value }))} />
              </Field>
              <Field label="Конец действия">
                <Input type="datetime-local" value={ruleDraft.ends_at} onChange={(e) => setRuleDraft((p) => ({ ...p, ends_at: e.target.value }))} />
              </Field>
              <Field label="Пауза на пользователя (часы)">
                <Input value={ruleDraft.cooldown_hours} onChange={(e) => setRuleDraft((p) => ({ ...p, cooldown_hours: e.target.value }))} placeholder="0" />
              </Field>
              <Field label="Глобальная пауза (часы)">
                <Input value={ruleDraft.global_cooldown_hours} onChange={(e) => setRuleDraft((p) => ({ ...p, global_cooldown_hours: e.target.value }))} placeholder="0" />
              </Field>
              <Field label="Показов в день">
                <Input value={ruleDraft.max_shows_per_day} onChange={(e) => setRuleDraft((p) => ({ ...p, max_shows_per_day: e.target.value }))} placeholder="0" />
              </Field>
              <Field label="Лимит использований всего">
                <Input value={ruleDraft.max_uses_total} onChange={(e) => setRuleDraft((p) => ({ ...p, max_uses_total: e.target.value }))} placeholder="0" />
              </Field>
              <Field label="Лимит на пользователя">
                <Input value={ruleDraft.max_uses_per_user} onChange={(e) => setRuleDraft((p) => ({ ...p, max_uses_per_user: e.target.value }))} placeholder="0" />
              </Field>
              <Field label="Источник">
                <Input value={ruleDraft.source} onChange={(e) => setRuleDraft((p) => ({ ...p, source: e.target.value }))} placeholder="admin" />
              </Field>
            </div>
            <div className="mt-3 flex gap-3 text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={ruleDraft.is_active} onChange={(e) => setRuleDraft((p) => ({ ...p, is_active: e.target.checked }))} />
                Активно
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={ruleDraft.is_test} onChange={(e) => setRuleDraft((p) => ({ ...p, is_test: e.target.checked }))} />
                Тестовое правило
              </label>
            </div>
            {ruleActionError ? <p className="mt-2 text-xs text-red-200">{ruleActionError}</p> : null}
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                disabled={ruleSaving}
                onClick={async () => {
                  try {
                    setRuleSaving(true);
                    setRuleActionError(null);
                    const payload = buildRulePayload(normalizeDraft(ruleDraft));
                    if (ruleDraft.id) {
                      await adminUpdateDiscountRule(ruleDraft.id, payload);
                    } else {
                      await adminCreateDiscountRule(payload);
                    }
                    await loadRules();
                    await loadDashboard();
                    setRuleDraft(DEFAULT_RULE_DRAFT);
                  } catch (error) {
                    setRuleActionError(error instanceof Error ? error.message : "Не удалось сохранить правило");
                  } finally {
                    setRuleSaving(false);
                  }
                }}
              >
                {ruleSaving ? "Сохраняем..." : ruleDraft.id ? "Сохранить изменения" : "Создать правило"}
              </Button>
              <Button
                variant="outline"
                className="border-white/20"
                onClick={async () => {
                  const items = rules.map((item, index) => ({
                    rule_id: item.id,
                    display_order: index + 1,
                    priority: item.priority
                  }));
                  await adminReorderDiscountRules(items);
                  await loadRules();
                }}
              >
                Обновить порядок
              </Button>
            </div>
          </Card>
        </div>
      ) : null}

      {activeTab === "preview" ? (
        <div className="space-y-4">
          <Card className="rounded-[24px] border border-white/10 bg-[var(--bg-card)]/85 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-base font-semibold text-[var(--text-primary)]">Предпросмотр popup и баннеров</p>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  Здесь можно посмотреть, как разные trigger-сценарии выглядят для пользователя на главной, в профиле и на странице энергии.
                </p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-[var(--text-secondary)]">
                <Eye className="h-3.5 w-3.5" />
                Preview без реального показа пользователям
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-[280px_minmax(0,1fr)]">
              <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm font-semibold text-[var(--text-primary)]">Выберите trigger</p>
                <div className="grid gap-2">
                  {TRIGGER_OPTIONS.map((option) => {
                    const active = previewTriggerType === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setPreviewTriggerType(option.value)}
                        className={`rounded-2xl border px-4 py-3 text-left transition ${
                          active
                            ? "border-[var(--accent-pink)]/45 bg-[var(--accent-pink)]/12 text-[var(--text-primary)]"
                            : "border-white/10 bg-white/5 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                        }`}
                      >
                        <div className="text-sm font-medium">{option.label}</div>
                      </button>
                    );
                  })}
                </div>

                <div className="rounded-2xl border border-white/10 bg-[rgba(255,255,255,0.04)] p-4">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--text-tertiary)]">Что увидит пользователь</p>
                  <p className="mt-2 text-lg font-semibold text-[var(--text-primary)]">{triggerPreviewLabel(previewTriggerType)}</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{previewCopy.body}</p>
                </div>
              </div>

              <div className="space-y-4">
                {previewSurfaces.map((surface) => (
                  <div
                    key={`${previewTriggerType}:${surface}`}
                    className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(34,27,41,0.92),rgba(17,13,22,0.96))] p-4"
                  >
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-[var(--text-primary)]">{surfacePreviewLabel(surface)}</p>
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-[var(--text-secondary)]">
                        {surface.includes("popup") || surface.includes("modal") ? "Overlay" : "Inline"}
                      </span>
                    </div>

                    {surface === "home_popup" || surface === "exit_intent_modal" ? (
                      <div className="rounded-[28px] border border-[rgba(215,185,139,0.2)] bg-[linear-gradient(180deg,rgba(42,34,49,0.98),rgba(19,14,24,0.98))] p-5 shadow-[0_24px_60px_rgba(0,0,0,0.28)]">
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-3">
                            <span className="inline-flex rounded-full border border-[rgba(215,185,139,0.24)] bg-[rgba(215,185,139,0.12)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--accent-gold)]">
                              {previewCopy.badge}
                            </span>
                            <h3 className="text-[1.35rem] font-semibold leading-tight text-[var(--text-primary)]">
                              {previewCopy.title}
                            </h3>
                            <p className="text-sm leading-6 text-[var(--text-secondary)]">{previewCopy.body}</p>
                          </div>
                          <div className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-[var(--text-secondary)]">
                            ×
                          </div>
                        </div>
                        <div className="mt-5 flex gap-3">
                          <button
                            type="button"
                            className="flex-1 rounded-full bg-[linear-gradient(180deg,#E4C48C,#CFA463)] px-4 py-3 text-sm font-semibold text-[#24170F]"
                          >
                            {previewCopy.cta}
                          </button>
                          <button
                            type="button"
                            className="flex-1 rounded-full border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-[var(--text-primary)]"
                          >
                            Позже
                          </button>
                        </div>
                      </div>
                    ) : surface === "energy_featured" ? (
                      <div className="rounded-[28px] border border-[rgba(215,185,139,0.18)] bg-[linear-gradient(180deg,rgba(48,39,56,0.96),rgba(27,21,33,0.98))] p-5 shadow-[0_18px_40px_rgba(0,0,0,0.28)]">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div className="space-y-3">
                            <span className="inline-flex rounded-full border border-[rgba(215,185,139,0.24)] bg-[rgba(215,185,139,0.12)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--accent-gold)]">
                              {previewCopy.badge}
                            </span>
                            <h3 className="text-[2rem] font-semibold leading-none text-[var(--text-primary)]">
                              Премиальный запас
                            </h3>
                            <p className="text-sm leading-6 text-[var(--text-secondary)]">{previewCopy.body}</p>
                          </div>
                          <div className="min-w-[112px] text-left sm:text-right">
                            <p className="text-[2rem] font-semibold leading-none text-[var(--text-primary)]">75 ⚡</p>
                            <p className="text-2xl font-semibold text-[var(--accent-gold)]">
                              {previewTriggerType === "first_purchase" ? "524 ₽" : "759 ⭐"}
                            </p>
                            <p className="mt-1 text-xs text-[var(--text-tertiary)] line-through">
                              {previewTriggerType === "first_purchase" ? "699 ₽" : "949 ⭐"}
                            </p>
                          </div>
                        </div>
                        <div className="mt-5">
                          <button
                            type="button"
                            className="w-full rounded-full bg-[linear-gradient(180deg,#E4C48C,#CFA463)] px-4 py-3 text-sm font-semibold text-[#24170F]"
                          >
                            {previewCopy.cta}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-[24px] border border-[rgba(215,185,139,0.16)] bg-[linear-gradient(180deg,rgba(36,28,43,0.96),rgba(18,14,23,0.98))] p-5 shadow-[0_18px_40px_rgba(0,0,0,0.2)]">
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-2">
                            <p className="text-[11px] uppercase tracking-[0.28em] text-[var(--text-tertiary)]">Предложение</p>
                            <h3 className="text-[1.05rem] font-semibold text-[var(--text-primary)]">{previewCopy.title}</h3>
                            <p className="max-w-[34rem] text-sm leading-6 text-[var(--text-secondary)]">{previewCopy.body}</p>
                          </div>
                          <div className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-[var(--text-secondary)]">
                            ×
                          </div>
                        </div>
                        <div className="mt-4">
                          <button
                            type="button"
                            className="rounded-full border border-[rgba(215,185,139,0.22)] bg-[rgba(255,255,255,0.04)] px-5 py-3 text-sm font-semibold text-[var(--text-primary)]"
                          >
                            {previewCopy.cta}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      ) : null}

      {activeTab === "pricing" ? (
        <div className="space-y-4">
          <Card className="rounded-[24px] border border-white/10 bg-[var(--bg-card)]/85 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-base font-semibold text-[var(--text-primary)]">Карта региональных тиров</p>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  Сейчас Stars-цены явно заданы не для всех стран. Непокрытые страны автоматически уходят в fallback <span className="text-[var(--text-primary)]">Tier B</span>.
                </p>
              </div>
              <Button variant="outline" className="border-white/20" onClick={() => void loadPricing()}>
                Обновить тиры
              </Button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
              <MetricCard title="Явно настроено" value={pricingSummary?.total_mapped ?? 0} />
              <MetricCard title="Tier A" value={pricingSummary?.tier_a ?? 0} />
              <MetricCard title="Tier B" value={pricingSummary?.tier_b ?? 0} />
              <MetricCard title="Tier C" value={pricingSummary?.tier_c ?? 0} />
              <MetricCard title="Fallback B" value={pricingSummary?.unmapped_count ?? 0} />
            </div>
            <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">Покрытие по странам</p>
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">
                    Явно распределено {pricingSummary?.total_mapped ?? 0} из {pricingSummary?.reference_country_total ?? 249} стран.
                    Остальные используют стандартный fallback Tier B.
                  </p>
                </div>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-[var(--text-primary)]">
                  {pricingSummary?.coverage_percent ?? 0}% явного покрытия
                </span>
              </div>
            </div>
            {pricingError ? <p className="mt-2 text-xs text-red-200">{pricingError}</p> : null}
          </Card>

          <Card className="rounded-[24px] border border-white/10 bg-[var(--bg-card)]/85 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-base font-semibold text-[var(--text-primary)]">Матрица Stars-цен по тирам</p>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  Это текущие пакеты из каталога `v2`, которые реально увидит пользователь в зависимости от тира страны.
                </p>
              </div>
            </div>
            <div className="mt-4 grid gap-3 xl:grid-cols-3">
              {(["A", "B", "C"] as const).map((tier) => (
                <div key={tier} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{pricingTierLabel(tier)}</p>
                    <span className={`rounded-full border px-2.5 py-1 text-[11px] ${pricingTierTone(tier)}`}>
                      {pricingMatrixByTier[tier]?.length ?? 0} пакетов
                    </span>
                  </div>
                  <div className="mt-3 space-y-2">
                    {(pricingMatrixByTier[tier] ?? []).map((item) => (
                      <div key={`${tier}-${item.code}`} className="rounded-xl border border-white/10 bg-[rgba(255,255,255,0.04)] p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium text-[var(--text-primary)]">{item.title}</p>
                            <p className="text-xs text-[var(--text-secondary)]">
                              {item.total_energy} ⚡
                              {item.bonus_energy > 0 ? ` • +${item.bonus_energy} бонус` : ""}
                            </p>
                          </div>
                          <span className="text-sm font-semibold text-[var(--accent-gold)]">
                            {item.stars_amount ?? item.base_amount} {item.currency}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="rounded-[24px] border border-white/10 bg-[var(--bg-card)]/85 p-5">
            <div className="grid gap-4 xl:grid-cols-[1.1fr_1.6fr]">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-base font-semibold text-[var(--text-primary)]">Редактор страны</p>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  Подтверждённая страна пользователя будет использовать именно этот тир. Если страны нет в списке, по умолчанию включается fallback Tier B.
                </p>
                <div className="mt-4 space-y-3">
                  <Field label="Код страны ISO-2">
                    <Input
                      value={pricingDraft.country_code}
                      onChange={(e) => setPricingDraft((prev) => ({ ...prev, country_code: e.target.value.toUpperCase().slice(0, 2) }))}
                      placeholder="DE"
                    />
                  </Field>
                  <Field label="Название">
                    <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-[var(--text-secondary)]">
                      {pricingDraft.country_code ? regionDisplayName(pricingDraft.country_code) : "Введите код страны"}
                    </div>
                  </Field>
                  <Field label="Тир цен">
                    <select
                      className="rounded-xl border border-white/15 bg-white/5 px-3 py-2"
                      value={pricingDraft.pricing_tier}
                      onChange={(e) => setPricingDraft((prev) => ({ ...prev, pricing_tier: e.target.value as "A" | "B" | "C" }))}
                    >
                      <option value="A">Tier A</option>
                      <option value="B">Tier B</option>
                      <option value="C">Tier C</option>
                    </select>
                  </Field>
                  <Field label="Комментарий">
                    <Input
                      value={pricingDraft.notes}
                      onChange={(e) => setPricingDraft((prev) => ({ ...prev, notes: e.target.value }))}
                      placeholder="Например: high-income market"
                    />
                  </Field>
                  <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                    <input
                      type="checkbox"
                      checked={pricingDraft.is_active}
                      onChange={(e) => setPricingDraft((prev) => ({ ...prev, is_active: e.target.checked }))}
                    />
                    Активно
                  </label>
                  {pricingActionError ? <p className="text-xs text-red-200">{pricingActionError}</p> : null}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      disabled={pricingSaving || pricingDraft.country_code.trim().length !== 2}
                      onClick={async () => {
                        try {
                          setPricingSaving(true);
                          setPricingActionError(null);
                          await adminUpsertPricingCountryTier({
                            country_code: pricingDraft.country_code,
                            pricing_tier: pricingDraft.pricing_tier,
                            is_active: pricingDraft.is_active,
                            notes: pricingDraft.notes.trim() || null
                          });
                          await loadPricing();
                          setPricingDraft(DEFAULT_PRICING_TIER_DRAFT);
                        } catch (error) {
                          setPricingActionError(error instanceof Error ? error.message : "Не удалось сохранить страну");
                        } finally {
                          setPricingSaving(false);
                        }
                      }}
                    >
                      {pricingSaving ? "Сохраняем..." : "Сохранить тир"}
                    </Button>
                    <Button variant="outline" className="border-white/20" onClick={() => setPricingDraft(DEFAULT_PRICING_TIER_DRAFT)}>
                      Сбросить
                    </Button>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-[var(--text-primary)]">Явно распределённые страны</p>
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">
                      Сейчас явно настроено {pricingSummary?.total_mapped ?? 0} стран. По остальным будет работать fallback Tier B, пока ты не задашь им явный тир.
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Input
                    className="min-w-[220px] flex-1"
                    value={pricingSearch}
                    onChange={(e) => setPricingSearch(e.target.value)}
                    placeholder="Поиск по коду или названию страны"
                  />
                  <select
                    className="rounded-xl border border-white/15 bg-white/5 px-3 py-2"
                    value={pricingTierFilter}
                    onChange={(e) => setPricingTierFilter(e.target.value as "all" | "A" | "B" | "C")}
                  >
                    <option value="all">Все тиры</option>
                    <option value="A">Tier A</option>
                    <option value="B">Tier B</option>
                    <option value="C">Tier C</option>
                  </select>
                </div>
                <div className="mt-4 max-h-[640px] space-y-2 overflow-y-auto pr-1">
                  {pricingLoading ? (
                    <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                      <Loader2 className="h-4 w-4 animate-spin" /> Загружаем карту стран...
                    </div>
                  ) : null}
                  {filteredPricingMappings.map((item) => (
                    <div key={item.country_code} className="rounded-xl border border-white/10 bg-[rgba(255,255,255,0.04)] p-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-[var(--text-primary)]">
                            {regionDisplayName(item.country_code)} <span className="text-[var(--text-tertiary)]">({item.country_code})</span>
                          </p>
                          <div className="mt-1 flex flex-wrap gap-2">
                            <span className={`rounded-full border px-2.5 py-1 text-[11px] ${pricingTierTone(item.pricing_tier)}`}>
                              {pricingTierLabel(item.pricing_tier)}
                            </span>
                            {!item.is_active ? (
                              <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-[var(--text-secondary)]">
                                выключено
                              </span>
                            ) : null}
                            {item.notes ? (
                              <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-[var(--text-secondary)]">
                                {item.notes}
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-2 text-xs text-[var(--text-tertiary)]">Обновлено: {prettyDate(item.updated_at)}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {(["A", "B", "C"] as const).map((tier) => (
                            <button
                              key={`${item.country_code}-${tier}`}
                              type="button"
                              className={`rounded-full border px-3 py-1.5 text-xs transition ${
                                item.pricing_tier === tier
                                  ? pricingTierTone(tier)
                                  : "border-white/10 bg-white/5 text-[var(--text-secondary)]"
                              }`}
                              onClick={async () => {
                                await adminUpsertPricingCountryTier({
                                  country_code: item.country_code,
                                  pricing_tier: tier,
                                  is_active: true,
                                  notes: item.notes
                                });
                                await loadPricing();
                              }}
                            >
                              {pricingTierLabel(tier)}
                            </button>
                          ))}
                          <MiniAction
                            label="Ред."
                            onClick={() =>
                              setPricingDraft({
                                country_code: item.country_code,
                                pricing_tier: item.pricing_tier,
                                notes: item.notes ?? "",
                                is_active: item.is_active
                              })
                            }
                          />
                          <MiniAction
                            label={item.is_active ? "Выкл." : "Вкл."}
                            onClick={async () => {
                              await adminUpsertPricingCountryTier({
                                country_code: item.country_code,
                                pricing_tier: item.pricing_tier,
                                is_active: !item.is_active,
                                notes: item.notes
                              });
                              await loadPricing();
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>
      ) : null}

      {activeTab === "personal" ? (
        <div className="space-y-4">
          <Card className="rounded-[24px] border border-white/10 bg-[var(--bg-card)]/85 p-5">
            <p className="text-base font-semibold text-[var(--text-primary)]">Найти пользователя</p>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Найди человека по имени, username, telegram id или UUID, чтобы выдать ему персональный оффер.
            </p>
            <Input
              className="mt-3"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder="UUID / username / telegram id / имя"
            />
            <div className="mt-3 max-h-56 space-y-2 overflow-y-auto pr-1">
              {userOptions.map((item) => (
                <button
                  key={item.user_id}
                  type="button"
                  onClick={() => setSelectedUser(item)}
                  className={`w-full rounded-xl border px-3 py-2 text-left text-sm ${
                    selectedUser?.user_id === item.user_id
                      ? "border-[var(--accent-pink)]/60 bg-[var(--accent-pink)]/15"
                      : "border-white/10 bg-white/5"
                  }`}
                >
                  <p className="font-medium text-[var(--text-primary)]">
                    {item.display_name || "Без имени"} {item.username ? `@${item.username}` : ""}
                  </p>
                  <p className="text-xs text-[var(--text-tertiary)]">
                    {item.user_id} • tg: {item.telegram_user_id ?? "—"}
                  </p>
                </button>
              ))}
            </div>
          </Card>

          <Card className="rounded-[24px] border border-white/10 bg-[var(--bg-card)]/85 p-5">
            <p className="text-base font-semibold text-[var(--text-primary)]">Назначить персональную акцию</p>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              Пользователь: {selectedUser?.display_name || selectedUser?.username || selectedUser?.user_id || "не выбран"}
            </p>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <select
                className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm"
                value={selectedRuleId}
                onChange={(e) => setSelectedRuleId(e.target.value)}
              >
                <option value="">Выбери акцию</option>
                {rules.map((rule) => (
                  <option key={rule.id} value={rule.id}>
                    {rule.title} • {triggerLabel(rule.trigger_type)}
                  </option>
                ))}
              </select>
              <Button
                disabled={assignLoading || !selectedUser || !selectedRuleId}
                onClick={async () => {
                  if (!selectedUser || !selectedRuleId) return;
                  try {
                    setAssignLoading(true);
                    setAssignError(null);
                    await adminAssignDiscountRule({
                      user_id: selectedUser.user_id,
                      rule_id: selectedRuleId
                    });
                    await loadAssignments(selectedUser.user_id);
                  } catch (error) {
                    setAssignError(error instanceof Error ? error.message : "Ошибка назначения");
                  } finally {
                    setAssignLoading(false);
                  }
                }}
              >
                {assignLoading ? "Назначаем..." : "Назначить"}
              </Button>
            </div>
            {assignError ? <p className="mt-2 text-xs text-red-200">{assignError}</p> : null}

            <div className="mt-3 space-y-2">
              {assignments.map((item) => (
                <div key={item.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <p className="text-sm font-medium text-[var(--text-primary)]">{assignmentRuleLabel(item.rule_id, rules)}</p>
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">
                    Показов: {item.show_count} • Использований: {item.usage_count}
                  </p>
                  <p className="mt-1 text-xs text-[var(--text-tertiary)]">
                    Назначено: {prettyDate(item.assigned_at)} • Истекает: {prettyDate(item.expires_at)}
                  </p>
                  <div className="mt-2 flex gap-2">
                    <MiniAction
                      label="Выключить"
                      onClick={async () => {
                        await adminDisableAssignment(item.id);
                        await loadAssignments(selectedUser?.user_id);
                      }}
                    />
                    <MiniAction
                      label="Завершить"
                      danger
                      onClick={async () => {
                        await adminExpireAssignment(item.id);
                        await loadAssignments(selectedUser?.user_id);
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <details className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3">
              <summary className="cursor-pointer text-sm text-[var(--text-secondary)]">История назначений</summary>
              <pre className="mt-2 max-h-48 overflow-auto text-[11px] text-emerald-100/90">
                {JSON.stringify(assignmentsHistory, null, 2)}
              </pre>
            </details>
          </Card>
        </div>
      ) : null}

      {activeTab === "tests" ? (
        <Card className="rounded-[24px] border border-white/10 bg-[var(--bg-card)]/85 p-5">
          <p className="text-base font-semibold text-[var(--text-primary)]">Тестирование логики офферов</p>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Проверяй, какой оффер увидит конкретный пользователь, и симулируй показ, dismiss или покупку без ручных запросов.
          </p>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Input value={testUserId} onChange={(e) => setTestUserId(e.target.value)} placeholder="user_id" />
            <select className="rounded-xl border border-white/15 bg-white/5 px-3 py-2" value={testProvider} onChange={(e) => setTestProvider(e.target.value === "telegram_stars" ? "telegram_stars" : "robokassa")}>
              <option value="robokassa">Рубли для РФ</option>
              <option value="telegram_stars">Telegram Stars</option>
            </select>
            <select className="rounded-xl border border-white/15 bg-white/5 px-3 py-2" value={testCurrency} onChange={(e) => setTestCurrency(e.target.value as typeof testCurrency)}>
              <option value="RUB">RUB</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="XTR">XTR</option>
            </select>
            <Input value={testSource} onChange={(e) => setTestSource(e.target.value)} placeholder="source, например energy_page" />
            <Input value={testTriggerType} onChange={(e) => setTestTriggerType(e.target.value)} placeholder="trigger_type, например auto" />
            <Input value={testBalanceOverride} onChange={(e) => setTestBalanceOverride(e.target.value)} placeholder="balance override" />
            <Input value={simulateUsageId} onChange={(e) => setSimulateUsageId(e.target.value)} placeholder="usage_id после показа" />
            <Input value={simulatePaymentId} onChange={(e) => setSimulatePaymentId(e.target.value)} placeholder="payment_id, если нужен" />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              disabled={testLoading || !testUserId.trim()}
              onClick={async () => {
                try {
                  setTestLoading(true);
                  setTestError(null);
                  await loadDebug();
                } catch (error) {
                  setTestError(error instanceof Error ? error.message : "resolve failed");
                } finally {
                  setTestLoading(false);
                }
              }}
            >
              Проверить оффер
            </Button>
            <Button
              variant="outline"
              className="border-white/20"
              disabled={testLoading || !testUserId.trim()}
              onClick={async () => {
                try {
                  setTestLoading(true);
                  setTestError(null);
                  const result = await adminSimulateDiscountShow({
                    user_id: testUserId.trim(),
                    provider: testProvider,
                    currency: testProvider === "telegram_stars" ? "XTR" : testCurrency,
                    trigger_type: testTriggerType,
                    source: testSource,
                    balance_override: testBalanceOverride.trim() ? Number(testBalanceOverride) : undefined,
                    trigger_snapshot: { via: "admin_panel" }
                  });
                  setResolveData(result.resolve);
                  const usage = result.shown.items.find((item) => item.usage_id)?.usage_id;
                  if (usage) setSimulateUsageId(usage);
                  setDebugUsages((await adminListDiscountUsages(testUserId.trim(), 30)).items ?? []);
                } catch (error) {
                  setTestError(error instanceof Error ? error.message : "simulate show failed");
                } finally {
                  setTestLoading(false);
                }
              }}
            >
              Симулировать показ
            </Button>
            <Button
              variant="outline"
              className="border-white/20"
              disabled={testLoading || !simulateUsageId.trim()}
              onClick={async () => {
                try {
                  setTestLoading(true);
                  setTestError(null);
                  await adminSimulateDiscountDismiss(simulateUsageId.trim());
                  setDebugUsages((await adminListDiscountUsages(testUserId.trim(), 30)).items ?? []);
                } catch (error) {
                  setTestError(error instanceof Error ? error.message : "dismiss failed");
                } finally {
                  setTestLoading(false);
                }
              }}
            >
              Симулировать dismiss
            </Button>
            <Button
              variant="outline"
              className="border-white/20"
              disabled={testLoading || !simulateUsageId.trim()}
              onClick={async () => {
                try {
                  setTestLoading(true);
                  setTestError(null);
                  await adminSimulateDiscountPurchase({
                    usage_id: simulateUsageId.trim(),
                    payment_id: simulatePaymentId.trim() || undefined
                  });
                  setDebugUsages((await adminListDiscountUsages(testUserId.trim(), 30)).items ?? []);
                } catch (error) {
                  setTestError(error instanceof Error ? error.message : "purchase failed");
                } finally {
                  setTestLoading(false);
                }
              }}
            >
              Симулировать покупку
            </Button>
          </div>
          {testError ? <p className="mt-2 text-xs text-red-200">{testError}</p> : null}
          <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-2">
            <JsonBlock title="User offer state" value={debugData} />
            <JsonBlock title="Resolve result" value={resolveData} />
          </div>
          <JsonBlock title="Recent usages" value={debugUsages} />
        </Card>
      ) : null}

      {activeTab === "logs" ? (
        <div className="space-y-4">
          <Card className="rounded-[24px] border border-white/10 bg-[var(--bg-card)]/85 p-5">
            <p className="text-base font-semibold text-[var(--text-primary)]">Последние действия в админке</p>
            <div className="mt-3 space-y-2">
              {recentActions.map((item, idx) => (
                <div key={idx} className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <p className="text-sm text-[var(--text-primary)]">
                    {String(item.action ?? "action")} • {String(item.entity_type ?? "entity")}
                  </p>
                  <p className="text-xs text-[var(--text-secondary)]">{prettyDate(item.created_at)}</p>
                </div>
              ))}
            </div>
          </Card>
          <Card className="rounded-[24px] border border-white/10 bg-[var(--bg-card)]/85 p-5">
            <p className="text-base font-semibold text-[var(--text-primary)]">Debug snapshot</p>
            <JsonBlock title="Purchases" value={recentPurchases} />
            <JsonBlock title="Usages" value={recentUsages} />
          </Card>
        </div>
      ) : null}
    </div>
  );
}

function MetricCard({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-2">
      <p className="text-[11px] text-[var(--text-tertiary)]">{title}</p>
      <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{String(value)}</p>
    </div>
  );
}

function QuickFilterChip({
  label,
  onClick
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-[var(--text-secondary)] transition hover:border-[var(--accent-pink)]/40 hover:bg-[var(--accent-pink)]/10 hover:text-[var(--text-primary)]"
    >
      {label}
    </button>
  );
}

function Field({
  label,
  children
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="space-y-1.5">
      <span className="text-[11px] uppercase tracking-[0.18em] text-[var(--text-tertiary)]">{label}</span>
      {children}
    </label>
  );
}

function MiniAction({
  label,
  onClick,
  danger = false
}: {
  label: string;
  onClick: () => void | Promise<void>;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => void onClick()}
      className={`rounded-lg border px-2 py-1 text-xs ${
        danger
          ? "border-red-300/50 bg-red-500/10 text-red-100"
          : "border-white/20 bg-white/5 text-[var(--text-secondary)]"
      }`}
    >
      {label}
    </button>
  );
}

function JsonBlock({ title, value }: { title: string; value: unknown }) {
  return (
    <details className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3" open>
      <summary className="cursor-pointer text-xs text-[var(--text-secondary)]">{title}</summary>
      <pre className="mt-2 max-h-56 overflow-auto text-[11px] text-emerald-100/90">{JSON.stringify(value ?? {}, null, 2)}</pre>
    </details>
  );
}

function TwoColumnList({
  leftTitle,
  leftItems,
  rightTitle,
  rightItems
}: {
  leftTitle: string;
  leftItems: Record<string, unknown>[];
  rightTitle: string;
  rightItems: Record<string, unknown>[];
}) {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <Card className="rounded-[24px] border border-white/10 bg-[var(--bg-card)]/85 p-5">
        <p className="text-base font-semibold text-[var(--text-primary)]">{leftTitle}</p>
        <div className="mt-3 space-y-2">
          {leftItems.map((item, idx) => (
            <div key={idx} className="rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="text-sm text-[var(--text-primary)]">
                {(item.offer_title as string) || (item.offer_code as string) || (item.status as string) || "Запись"}
              </p>
              <p className="text-xs text-[var(--text-secondary)]">
                {(item.currency as string) ?? ""} {(item.amount_total as string) ?? ""}
              </p>
              <p className="text-xs text-[var(--text-tertiary)]">{prettyDate(item.created_at)}</p>
            </div>
          ))}
        </div>
      </Card>
      <Card className="rounded-[24px] border border-white/10 bg-[var(--bg-card)]/85 p-5">
        <p className="text-base font-semibold text-[var(--text-primary)]">{rightTitle}</p>
        <div className="mt-3 space-y-2">
          {rightItems.map((item, idx) => (
            <div key={idx} className="rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="text-sm text-[var(--text-primary)]">
                {(item.rule_title as string) || (item.rule_code as string) || String(item.resolution_status ?? "usage")}
              </p>
              <p className="text-xs text-[var(--text-secondary)]">
                status: {String(item.resolution_status ?? "—")} • bonus: {String(item.bonus_energy ?? 0)}
              </p>
              <p className="text-xs text-[var(--text-tertiary)]">{prettyDate(item.shown_at ?? item.created_at)}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
