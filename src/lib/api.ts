import type { SpreadId } from "@/data/rws_spreads";

// api.ts
const API_ORIGIN = ((import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "https://api.freakdev.site")
  .trim()
  .replace(/\/+$/, "");
export const API_BASE = `${API_ORIGIN}/api`;

export const WIDGET_KEYS = [
  "card_of_day",
  "individual_horoscope",
  "numerology_forecast"
] as const;

export type WidgetKey = (typeof WIDGET_KEYS)[number];
export const DEFAULT_WIDGET_KEYS: WidgetKey[] = [
  "card_of_day",
  "individual_horoscope",
  "numerology_forecast"
];

export class ApiError extends Error {
  code?: string;
  status?: number;
  payload?: unknown;

  constructor(message: string, options?: { code?: string; status?: number; payload?: unknown }) {
    super(message);
    this.name = "ApiError";
    this.code = options?.code;
    this.status = options?.status;
    this.payload = options?.payload;
  }
}

// ====== ВСПОМОГАТЕЛЬНОЕ ======
function getInitData(): string {
  const initData = window.Telegram?.WebApp?.initData;
  if (!initData) {
    throw new Error("Не удалось получить данные Telegram WebApp. Откройте приложение через Telegram.");
  }
  return initData;
}

function getTelegramId(): number | null {
  // @ts-ignore
  const user = window?.Telegram?.WebApp?.initDataUnsafe?.user;
  return user?.id ?? null;
}

function withTelegramId(url: string): string {
  const telegramId = getTelegramId();
  if (!telegramId) {
    throw new Error("Не найдены данные Telegram пользователя");
  }
  const joiner = url.includes("?") ? "&" : "?";
  return `${url}${joiner}telegram_id=${encodeURIComponent(String(telegramId))}`;
}

function withAuthHeaders(headers?: HeadersInit, includeJson = false): HeadersInit {
  const base: Record<string, string> = {
    "X-Telegram-Init-Data": getInitData()
  };
  if (includeJson) {
    base["Content-Type"] = "application/json";
  }
  return {
    ...base,
    ...headers
  };
}

async function parseResponse(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  const data = await parseResponse(res);
  const maybeObject = typeof data === "object" && data !== null ? (data as Record<string, unknown>) : null;

  if (!res.ok) {
    const detail = maybeObject?.detail;
    const code =
      (typeof maybeObject?.code === "string" && maybeObject.code) ||
      (typeof detail === "object" && detail !== null && typeof (detail as Record<string, unknown>).code === "string"
        ? ((detail as Record<string, unknown>).code as string)
        : undefined);
    const msg =
      typeof data === "string"
        ? data
        : (typeof detail === "string"
            ? detail
            : typeof detail === "object" && detail !== null && typeof (detail as Record<string, unknown>).message === "string"
              ? ((detail as Record<string, unknown>).message as string)
              : (maybeObject?.message as string | undefined)) ?? `API Error: ${res.status}`;

    throw new ApiError(msg, { code, status: res.status, payload: data });
  }

  if (!maybeObject) {
    throw new ApiError("Некорректный ответ сервера", { status: res.status, payload: data });
  }

  return maybeObject as T;
}

// ====== ТИПЫ ПОД РЕАЛЬНЫЙ БЭКЕНД ======

// /api/init_webapp (оставляем как было у тебя)
export interface AuthWebAppPayload {
  telegram_id: number;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  language_code: string | null;
}
export interface AuthWebAppResponse {
  user: {
    display_name: string;
    energy_balance: number;
    lang: string | null;
  };
  settings: {
    notifications: boolean;
    theme: "light" | "dark" | "system";
  };
}

// /api/profile — то, что реально отдаёт бэкенд
export interface BirthProfile {
  full_name: string | null;
  birth_date: string | null;
  birth_time_local: string | null;
  birth_time_known: boolean;
  birth_place_text: string | null;
  birth_lat: number | null;
  birth_lon: number | null;
  birth_tz_name: string | null;
  birth_tz_offset_min: number | null;
  gender: "male" | "female" | "other" | null;
  detected_country?: string | null;
  interface_language?: string | null;
  current_tz_name?: string | null;
  current_tz_offset_min?: number | null;
  current_tz_confirmed?: boolean | null;
  zodiac_sign?: string | null;
  detected_region_tier?: string | null;
  pricing_country_confirmed?: boolean | null;
  pricing_country_source?: string | null;
  pricing_country_confidence?: string | null;
  pricing_ip_country?: string | null;
  pricing_telegram_lang?: string | null;
  pricing_device_lang?: string | null;
  pricing_country_confirmed_at?: string | null;
}

export interface ProfileResponse {
  user: {
    id?: string | null;
    is_admin?: boolean;
    display_name: string | null;
    energy_balance: number;
    lang: string | null;
    current_tz_name: string | null;
    current_tz_offset_min: number | null;
    current_tz_confirmed?: boolean | null;
    telegram: {
      username: string | null;
      first_name: string | null;
      last_name: string | null;
      is_premium: boolean;
    };
  };
  preferences: {
    widgets: WidgetKey[];
  };
  birth_profile?: BirthProfile | null;
}

// /api/profile/update — то, что реально принимает бэкенд
export interface UpdateProfilePayload {
  display_name?: string | null;
  lang?: string | null;
  widgets?: WidgetKey[]; // массив строк!
  current_tz_name?: string | null;
  current_tz_offset_min?: number | null;
  current_tz_confirmed?: boolean;
  detected_lang_device?: string | null;
  detected_lang_telegram?: string | null;
  birth_profile?: {
    full_name?: string | null;
    birth_date?: string | null;
    birth_time_local?: string | null;
    birth_time_known?: boolean;
    birth_place_text?: string | null;
    birth_lat?: number | null;
    birth_lon?: number | null;
    birth_tz_name?: string | null;
    birth_tz_offset_min?: number | null;
    gender?: "male" | "female" | "other" | null;
    detected_country?: string | null;
    detected_region_tier?: string | null;
    interface_language?: string | null;
    current_tz_name?: string | null;
    current_tz_offset_min?: number | null;
    current_tz_confirmed?: boolean | null;
    pricing_country_confirmed?: boolean | null;
    pricing_country_source?: string | null;
    pricing_country_confidence?: string | null;
    pricing_ip_country?: string | null;
    pricing_telegram_lang?: string | null;
    pricing_device_lang?: string | null;
  };
}

export interface HoroscopeFreeTodayContentSection {
  key?: string | null;
  title?: string | null;
  emoji?: string | null;
  text?: string | null;
}

export interface HoroscopeFreeTodayContentLegacy {
  summary?: string | null;
  sections?: HoroscopeFreeTodayContentSection[] | null;
  best_time?: string | null;
  lucky_color?: string | null;
}

export interface HoroscopeLocalizedJson {
  day_theme?: string | null;
  mood?: string | null;
  love?: { focus?: string | null; advice?: string | null } | null;
  career?: { focus?: string | null; advice?: string | null } | null;
  money?: { focus?: string | null; advice?: string | null } | null;
  health?: { focus?: string | null; advice?: string | null } | null;
  lucky?: { color?: string | null; number?: string | null | number; time_window?: string | null } | null;
  affirmation?: string | null;
  [key: string]: unknown;
}

export interface HoroscopeFreeTodayMeta {
  local_date?: string | null;
  zodiac_sign?: string | null;
  gender_label?: string | null;
  period_label?: string | null;
  generated_at?: string | null;
  cached?: boolean;
  source?: {
    name?: string | null;
    version?: string | null;
  } | null;
}

export interface HoroscopeFreeTodayContent {
  text_md?: string | null;
  localized_json?: HoroscopeLocalizedJson | HoroscopeFreeTodayContentLegacy | null;
}

export interface HoroscopeFreeTodayResponse {
  success: boolean;
  core_id?: string | null;
  meta?: HoroscopeFreeTodayMeta | null;
  content?: HoroscopeFreeTodayContent | null;
}

export type HoroscopeIssueStatus = "queued" | "pending" | "processing" | "ready" | "error";

export interface HoroscopeIssueResponse {
  id: string;
  user_id?: string | null;
  product_code: string;
  layout_type?: string | null;
  kind?: string | null;
  status: HoroscopeIssueStatus;
  lang?: string | null;
  tz_name?: string | null;
  tz_offset_min?: number | null;
  zodiac_sign?: string | null;
  gender?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  generated_for_local_date?: string | null;
  summary_text?: string | null;
  content_md?: string | null;
  content_json?: Record<string, unknown> | null;
  delivery_slot?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface HoroscopeIssuesListResponse {
  items?: HoroscopeIssueResponse[];
  issues?: HoroscopeIssueResponse[];
}

export interface HoroscopeOneoffPurchaseResponse {
  success?: boolean;
  status?: string | null;
  issue?: HoroscopeIssueResponse | null;
  issue_id?: string | null;
  issue_status?: HoroscopeIssueStatus | null;
  energy_spent?: number | null;
  energy_balance?: number | null;
  message?: string | null;
}

export interface HoroscopeSubscriptionPurchaseResponse {
  success?: boolean;
  status?: string | null;
  plan_code?: string | null;
  subscription_id?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  next_run_at?: string | null;
  energy_spent?: number | null;
  energy_balance?: number | null;
  message?: string | null;
}

export interface HoroscopeSubscriptionStatusResponse {
  has_subscription?: boolean;
  active?: boolean;
  status?: string | null;
  plan_code?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  next_run_at?: string | null;
  last_run_at?: string | null;
  last_issue_id?: string | null;
  last_delivery_slot?: string | null;
  morning_time_local?: string | null;
  evening_time_local?: string | null;
  tz_name?: string | null;
  tz_offset_min?: number | null;
}

export type BackendReadingStatus = "pending" | "queued" | "processing" | "ready" | "error";

export interface ReadingOutputCard {
  position_index: number;
  card_code: string;
  position_label?: string | null;
  meaning?: string | null;
  reversed?: boolean;
  card_name?: string | null;
  image_path?: string | null;
}

export interface ReadingOutputPayload {
  headline?: string | null;
  summary?: string | null;
  core_theme?: string | null;
  dynamics?: string | null;
  risks?: string | null;
  opportunities?: string | null;
  advice?: string | null;
  cards?: ReadingOutputCard[];
  // legacy compatibility
  interpretation?: string | null;
  question?: string | null;
  generated_at?: string | null;
}

export interface CreateReadingCardInput {
  position_index: number;
  card_code: string;
  reversed: boolean;
  position_label?: string;
  card_name?: string;
}

export interface CreateReadingPayload {
  type: "tarot";
  spread_id: SpreadId;
  deck_id: string;
  spread_title?: string;
  deck_title?: string;
  question: string;
  cards: CreateReadingCardInput[];
  locale: string;
  energy_cost?: number;
  kind?: string;
  source?: string;
  daily_card_date?: string;
}

export interface CreateReadingResponse {
  id: string;
  status: BackendReadingStatus;
}

export interface ReadingResponse {
  id: string;
  status: BackendReadingStatus;
  input_payload: unknown;
  output_payload: ReadingOutputPayload | null;
  summary_text: string | null;
  energy_spent: number;
  balance?: number;
  error: string | null;
}

export interface ViewReadingResponse {
  id: string;
  status: BackendReadingStatus;
  output_payload: ReadingOutputPayload | null;
  summary_text: string | null;
  energy_spent: number;
  balance: number;
}

export interface DailyCardTodayResponse {
  id: string;
  local_date: string;
  tz_name?: string | null;
  tz_offset_min: number;
  locale: string;
  deck_id: string;
  deck_title?: string | null;
  spread_id: string;
  spread_title?: string | null;
  card_code: string;
  card_name?: string | null;
  reversed: boolean;
  reading_id?: string | null;
  status: BackendReadingStatus;
  is_shared?: boolean;
  interpretation_locked?: boolean;
  unlock_energy_cost?: number;
  summary_text?: string | null;
  output_payload?: ReadingOutputPayload | null;
  error?: string | null;
}

export interface EnergyBalanceResponse {
  energy_balance: number;
}

export interface SubscriptionStatusResponse {
  has_subscription: boolean;
  plan_code?: string | null;
  ends_at?: string | null;
}

export interface AdsConfigResponse {
  ads_enabled: boolean;
  task_block_id: string;
}

export type AdRewardKind = "daily_x2" | "reward_regular" | "task_regular";

export interface EnergyAdsRewardState {
  available: boolean;
  next_reward_kind: "daily_x2" | "reward_regular" | null;
  next_energy: number;
  available_at: string | null;
  cooldown_seconds_left: number;
  banner_type: "daily_x2" | "reward_regular" | "cooldown" | "unavailable";
  message: string | null;
}

export interface EnergyAdsTaskState {
  available: boolean;
  next_reward_kind: "task_regular" | null;
  next_energy: number;
  available_at: string | null;
  cooldown_seconds_left: number;
  message: string | null;
}

export interface EnergyAdsStateResponse {
  ads_enabled: boolean;
  server_now: string;
  local_date: string;
  local_tz_offset_min: number;
  reward_available_at: string | null;
  task_available_at: string | null;
  banner_type: string | null;
  banner_text: string | null;
  energy_balance: number | null;
  adsgram_block_id: string | null;
  adsgram_task_block_id: string | null;
  reward: EnergyAdsRewardState;
  task: EnergyAdsTaskState;
}

export interface EnergyAdsStartResponse {
  session_id: string;
  reward_kind: AdRewardKind;
  expected_energy: number;
  claimed_energy: number;
  ads_required: number;
  ads_completed: number;
  cooldown_seconds: number;
  session_status: "created" | "waiting_callback" | "rewarded" | "expired" | "cancelled";
  expires_at: string | null;
  local_date: string;
  ad_provider: string | null;
  ad_format: string | null;
  adsgram_block_id: string | null;
}

export interface EnergyAdsCompleteResponse {
  success: boolean;
  session_id: string;
  reward_kind: AdRewardKind;
  energy_credited: number;
  energy_balance: number;
  cooldown_until: string | null;
  reward_available_at: string | null;
  task_available_at: string | null;
  next_reward_kind: "daily_x2" | "reward_regular" | null;
  next_task_kind: "task_regular" | null;
  message: string;
}

export interface DailyRewardStartResponse {
  reward_id: string | null;
  amount: number;
  expires_at: string | null;
  next_available_at: string | null;
}

export interface DailyRewardClaimResponse {
  new_balance: number;
  claimed_at: string;
}

export interface DailyBonusStatusResponse {
  status: string;
  amount: number;
  next_available_at: string | null;
  rewarded_at?: string | null;
  energy_balance?: number | null;
  nextAvailableAt?: string | null;
  rewardedAt?: string | null;
  energyBalance?: number | null;
}

export interface DailyBonusStartResponse {
  reward_session_id: string | null;
  reward_id?: string | null;
  amount: number;
  expires_at: string | null;
  next_available_at: string | null;
  rewardSessionId?: string | null;
  rewardId?: string | null;
  expiresAt?: string | null;
  nextAvailableAt?: string | null;
  adsgram_block_id?: string | null;
  adsgramBlockId?: string | null;
  adsgram?: {
    block_id?: string | null;
    blockId?: string | null;
  } | null;
}

export interface DailyBonusClaimResponse {
  next_available_at?: string | null;
  nextAvailableAt?: string | null;
  energy_balance?: number | null;
  energyBalance?: number | null;
  status?: string | null;
}

export interface RobokassaCreatePaymentResponse {
  purchase_id: string;
  invoice_id: number;
  payment_url: string;
  amount_minor: number;
  currency: string;
  product_code: string;
  product_title: string;
  energy_credited: number;
  status: string;
}

export interface PaymentOfferResponse {
  offer_id: string;
  offer_code: string;
  title: string;
  label: string | null;
  provider: "robokassa" | "telegram_stars";
  purchase_type: string;
  currency: string;
  base_amount: string;
  final_amount: string;
  discount_amount: string | null;
  discount_percent: string | null;
  bonus_percent: string | null;
  energy_amount: number;
  bonus_energy: number;
  final_energy_amount: number;
  stars_amount: number | null;
  trigger_type: string;
  priority: number;
  source: string | null;
  valid_until: string | null;
  rule_id: string | null;
  assignment_id: string | null;
}

export interface PaymentOffersResponse {
  provider: "robokassa" | "telegram_stars";
  purchase_type: string;
  currency: string;
  source: string;
  trigger_type: string;
  offers: PaymentOfferResponse[];
}

export interface MarkOfferShownItem {
  offer_id: string;
  usage_id: string | null;
  status: "tracked" | "skipped";
}

export interface MarkOffersShownResponse {
  items: MarkOfferShownItem[];
}

export interface DiscountUsageResponse {
  usage_id: string;
  resolution_status: string;
  resolved_at: string | null;
}

export interface OfferSurfaceStateResponse {
  state_id: string;
  trigger_type: string;
  surface: string;
  offer_id: string | null;
  rule_id: string | null;
  status: string;
  shown_at: string | null;
  dismissed_at: string | null;
  dismissed_until: string | null;
  cooldown_until: string | null;
  updated_at: string | null;
}

export interface OfferSurfaceStateListResponse {
  items: OfferSurfaceStateResponse[];
}

export interface OfferPlacementResponse {
  trigger_type: string;
  surface: string;
  offer: PaymentOfferResponse | null;
}

export interface OfferPlacementsResponse {
  preferred_provider: "robokassa" | "telegram_stars";
  preferred_currency: string;
  pricing_tier: string | null;
  resolved_triggers: string[];
  home_popup: OfferPlacementResponse | null;
  home_banner: OfferPlacementResponse | null;
  profile_banner: OfferPlacementResponse | null;
  energy_banner: OfferPlacementResponse | null;
  exit_intent_modal: OfferPlacementResponse | null;
  energy_featured_trigger: string | null;
}

export interface TelegramStarsCreatePaymentResponse {
  payment_id: string;
  purchase_id: string;
  status: string;
  invoice_url: string;
  invoice_link: string;
  payment_url: string;
  invoice_payload: string;
  offer_id: string | null;
  offer_code: string | null;
  offer_title: string | null;
  amount_stars: number;
  currency: string;
  energy_amount: number;
  bonus_energy: number;
  energy_credited: number;
}

export interface TelegramStarsOfferResponse {
  offer_id: string;
  title: string;
  label: string | null;
  offer_code: string;
  amount_stars: number;
  energy_amount: number;
  bonus_energy: number;
  total_energy: number;
  final_amount: string;
  currency: string;
  provider: string;
  source: string | null;
}

export interface TelegramStarsOffersResponse {
  provider: string;
  purchase_type: string;
  currency: string;
  source: string;
  offers: TelegramStarsOfferResponse[];
}

export interface TelegramStarsPaymentStatusResponse {
  payment_id: string;
  status: string;
  fulfillment_status: string;
  purchase_type: string;
  offer_id: string | null;
  offer_code: string | null;
  offer_title: string | null;
  amount_stars: number;
  currency: string;
  energy_amount: number;
  bonus_energy: number;
  energy_credited: number;
  created_at: string | null;
  paid_at: string | null;
  fulfilled_at: string | null;
}

export interface PurchaseStatusResponse {
  purchase_id: string;
  invoice_id: number;
  status: string;
  amount_minor: number;
  currency: string;
  product_code: string;
  product_title: string;
  energy_credited: number;
  created_at: string;
  paid_at: string | null;
}

export interface ReferralProgramResponse {
  referral_code: string;
  referral_link: string;
  share_inline_query: string;
  total_invited: number;
  total_activated: number;
  total_purchased: number;
  total_earned_energy_from_referrals: number;
  preview_text: string;
}

export interface WalletHistoryItemResponse {
  id: string;
  created_at: string;
  delta: number;
  balance_after: number | null;
  reason: string;
  ref_type: string | null;
  ref_id: string | null;
  display_title: string;
  display_subtitle: string | null;
}

export interface WalletHistoryResponse {
  items: WalletHistoryItemResponse[];
  next_cursor: string | null;
}

export interface DiscountRuleResponse {
  id: string;
  code: string;
  title: string;
  description: string | null;
  is_active: boolean;
  priority: number;
  trigger_type: string;
  target_provider: string | null;
  target_purchase_type: string | null;
  target_currency: string | null;
  target_offer_code: string | null;
  discount_type: string;
  discount_value: string;
  bonus_energy: number;
  bonus_percent: string | null;
  starts_at: string | null;
  ends_at: string | null;
  cooldown_hours: number | null;
  global_cooldown_hours: number | null;
  max_shows_per_day: number | null;
  max_uses_total: number | null;
  max_uses_per_user: number | null;
  stackable: boolean;
  stop_processing: boolean;
  audience_filter: Record<string, unknown>;
  source: string | null;
  is_test: boolean;
  display_order: number | null;
  archived_at: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string | null;
  updated_at: string | null;
  meta: Record<string, unknown>;
}

export interface DiscountAssignmentResponse {
  id: string;
  user_id: string;
  rule_id: string;
  is_active: boolean;
  assigned_at: string | null;
  activated_at: string | null;
  expires_at: string | null;
  usage_count: number;
  show_count: number;
  last_shown_at: string | null;
  last_used_at: string | null;
  meta: Record<string, unknown>;
}

export interface DiscountStatsResponse {
  active_rules: number;
  total_rules: number;
  usages_shown: number;
  usages_purchased: number;
  usages_dismissed: number;
  conversion_rate: number;
}

export interface AdminUserOfferDebugResponse {
  user_id: string;
  state: Record<string, unknown>;
  current_offer: Record<string, unknown> | null;
}

export interface DiscountResolveDebugCandidate {
  trigger_type: string;
  offer: PaymentOfferResponse;
  selected: boolean;
}

export interface DiscountResolveDebugResponse {
  user_id: string;
  provider: string;
  currency: string;
  source: string;
  requested_trigger_type: string;
  resolved_triggers: string[];
  local_date: string;
  can_show_offer: boolean;
  balance: number;
  user_context: Record<string, unknown>;
  selected_offers: PaymentOfferResponse[];
  candidates: DiscountResolveDebugCandidate[];
  state: Record<string, unknown>;
  current_offer: Record<string, unknown> | null;
}

export interface DiscountDebugUsagesResponse {
  user_id: string;
  items: Record<string, unknown>[];
}

export interface DiscountSimulateShowResponse {
  resolve: DiscountResolveDebugResponse;
  shown: MarkOffersShownResponse;
}

export interface AdminAccessResponse {
  allowed: boolean;
  user_id: string;
}

export interface AdminDashboardSummaryResponse {
  users_total: number;
  users_today: number;
  ads_main_today: number;
  ads_task_today: number;
  purchases_today: number;
  revenue_rub_today: string;
  revenue_usd_today: string;
  revenue_eur_today: string;
}

export interface AdminUserSearchItem {
  user_id: string;
  display_name: string | null;
  username: string | null;
  telegram_user_id: number | null;
  created_at: string | null;
}

export interface AdminUserSearchResponse {
  query: string;
  items: AdminUserSearchItem[];
}

export interface AdminAnalyticsResponse {
  active_rules: number;
  archived_rules: number;
  test_rules: number;
  users_with_assignments: number;
  total_usages: number;
  purchased_usages: number;
  conversion_rate: number;
}

export interface AdminPricingCountryTierItem {
  country_code: string;
  pricing_tier: "A" | "B" | "C";
  is_active: boolean;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface AdminPricingCountryTierListResponse {
  items: AdminPricingCountryTierItem[];
  total_mapped: number;
  tier_a: number;
  tier_b: number;
  tier_c: number;
  fallback_tier: "B";
  reference_country_total: number;
  unmapped_count: number;
  coverage_percent: number;
}

export interface AdminPricingOfferMatrixItem {
  provider: string;
  currency: string;
  pricing_tier: string;
  code: string;
  title: string;
  base_amount: string | null;
  stars_amount: number | null;
  energy_amount: number;
  bonus_energy: number;
  total_energy: number;
  is_featured: boolean;
  sort_order: number;
}

export interface AdminPricingOfferMatrixResponse {
  items: AdminPricingOfferMatrixItem[];
}

export interface HoroscopeWorkerHeartbeat {
  status?: string | null;
  pid?: number | null;
  started_at?: string | null;
  updated_at?: string | null;
  interval_sec?: number | null;
  due_limit?: number | null;
  delivery_limit?: number | null;
  last_tick_at?: string | null;
  last_success_at?: string | null;
  last_error?: string | null;
  due_processed?: number | null;
  deliveries_processed?: number | null;
}

export interface HoroscopeWorkerStatusResponse {
  success: boolean;
  worker: HoroscopeWorkerHeartbeat | null;
  running: boolean;
}

export interface HoroscopeWorkerRunResponse {
  success: boolean;
  processed?: number;
  results?: Record<string, unknown>[];
  error?: string;
}

export interface ShareCreateResponse {
  share_token: string;
  expires_at: string;
}

// ====== ВЫЗОВЫ API ======

export async function authWebApp(payload: AuthWebAppPayload): Promise<AuthWebAppResponse> {
  const res = await fetch(`${API_BASE}/webapp/auth`, {
    method: "POST",
    headers: withAuthHeaders(undefined, true),
    body: JSON.stringify(payload)
  });
  return handleResponse<AuthWebAppResponse>(res);
}

export async function getProfile(): Promise<ProfileResponse> {
  const res = await fetch(`${API_BASE}/profile`, {
    method: "GET",
    headers: withAuthHeaders()
  });
  return handleResponse<ProfileResponse>(res);
}

export async function updateProfile(payload: UpdateProfilePayload): Promise<ProfileResponse> {
  const telegram_id = getTelegramId();
  if (!telegram_id) throw new Error("Не найдены данные Telegram пользователя");

  const bodyPayload: Record<string, unknown> = {
    telegram_id
  };

  if (payload.display_name !== undefined) {
    bodyPayload.display_name = payload.display_name;
  }

  if (payload.lang !== undefined) {
    bodyPayload.lang = payload.lang;
  }

  if (payload.current_tz_name !== undefined) {
    bodyPayload.current_tz_name = payload.current_tz_name;
  }

  if (payload.current_tz_offset_min !== undefined) {
    bodyPayload.current_tz_offset_min = payload.current_tz_offset_min;
  }

  if (payload.current_tz_confirmed !== undefined) {
    bodyPayload.current_tz_confirmed = payload.current_tz_confirmed;
  }

  if (payload.detected_lang_device !== undefined) {
    bodyPayload.detected_lang_device = payload.detected_lang_device;
  }

  if (payload.detected_lang_telegram !== undefined) {
    bodyPayload.detected_lang_telegram = payload.detected_lang_telegram;
  }

  if (payload.widgets !== undefined) {
    bodyPayload.widgets = payload.widgets;
  }

  if (payload.birth_profile) {
    const birthProfilePayload: Record<string, unknown> = {};

    Object.entries(payload.birth_profile).forEach(([key, value]) => {
      if (value !== undefined) {
        birthProfilePayload[key] = value;
      }
    });

    if (Object.keys(birthProfilePayload).length > 0) {
      (bodyPayload as Record<string, unknown>).birth_profile = birthProfilePayload;
    }
  }

  const res = await fetch(`${API_BASE}/profile/update`, {
    method: "POST",
    headers: withAuthHeaders(undefined, true),
    body: JSON.stringify(bodyPayload)
  });
  return handleResponse<ProfileResponse>(res);
}

export async function createReading(payload: CreateReadingPayload): Promise<CreateReadingResponse> {
  const res = await fetch(withTelegramId(`${API_BASE}/readings`), {
    method: "POST",
    headers: withAuthHeaders(undefined, true),
    body: JSON.stringify(payload)
  });
  return handleResponse<CreateReadingResponse>(res);
}

export async function getReading(readingId: string): Promise<ReadingResponse> {
  const res = await fetch(withTelegramId(`${API_BASE}/readings/${readingId}`), {
    method: "GET",
    headers: withAuthHeaders()
  });
  return handleResponse<ReadingResponse>(res);
}

export async function viewReading(readingId: string): Promise<ViewReadingResponse> {
  const res = await fetch(withTelegramId(`${API_BASE}/readings/${readingId}/view`), {
    method: "POST",
    headers: withAuthHeaders()
  });
  return handleResponse<ViewReadingResponse>(res);
}

export async function getDailyCardToday(): Promise<DailyCardTodayResponse> {
  const res = await fetch(`${API_BASE}/daily/card/today`, {
    method: "GET",
    headers: withAuthHeaders()
  });
  return handleResponse<DailyCardTodayResponse>(res);
}

export async function getEnergy(): Promise<EnergyBalanceResponse> {
  const res = await fetch(`${API_BASE}/profile/energy`, {
    method: "GET",
    headers: withAuthHeaders()
  });
  return handleResponse<EnergyBalanceResponse>(res);
}

export async function getSubscriptionStatus(): Promise<SubscriptionStatusResponse> {
  const res = await fetch(`${API_BASE}/subscription/status`, {
    method: "GET",
    headers: withAuthHeaders()
  });
  return handleResponse<SubscriptionStatusResponse>(res);
}

export async function getAdsConfig(): Promise<AdsConfigResponse> {
  const res = await fetch(`${API_BASE}/ads/config`, {
    method: "GET",
    headers: withAuthHeaders()
  });
  return handleResponse<AdsConfigResponse>(res);
}

export async function getEnergyAdsState(): Promise<EnergyAdsStateResponse> {
  const res = await fetch(`${API_BASE}/energy/ads/state`, {
    method: "GET",
    headers: withAuthHeaders()
  });
  return handleResponse<EnergyAdsStateResponse>(res);
}

export async function startEnergyRewardAd(mode: "reward" | "task"): Promise<EnergyAdsStartResponse> {
  const endpoint = mode === "task" ? "/energy/ads/task/start" : "/energy/ads/reward/start";
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: "POST",
    headers: withAuthHeaders(undefined, true),
    body: JSON.stringify({})
  });
  return handleResponse<EnergyAdsStartResponse>(res);
}

export async function completeEnergyRewardAd(payload: {
  session_id: string;
  provider_session_id?: string;
  callback_token?: string;
  ads_completed_increment?: number;
  provider_payload?: Record<string, unknown>;
}): Promise<EnergyAdsCompleteResponse> {
  const res = await fetch(`${API_BASE}/energy/ads/complete`, {
    method: "POST",
    headers: withAuthHeaders(undefined, true),
    body: JSON.stringify(payload)
  });
  return handleResponse<EnergyAdsCompleteResponse>(res);
}

export async function startDailyReward(): Promise<DailyRewardStartResponse> {
  const res = await fetch(`${API_BASE}/rewards/daily/start`, {
    method: "POST",
    headers: withAuthHeaders(undefined, true),
    body: JSON.stringify({})
  });
  return handleResponse<DailyRewardStartResponse>(res);
}

export async function claimDailyReward(payload: {
  reward_id: string;
}): Promise<DailyRewardClaimResponse> {
  const res = await fetch(`${API_BASE}/rewards/daily/claim`, {
    method: "POST",
    headers: withAuthHeaders(undefined, true),
    body: JSON.stringify(payload)
  });
  return handleResponse<DailyRewardClaimResponse>(res);
}

export async function getDailyBonusStatus(): Promise<DailyBonusStatusResponse> {
  const res = await fetch(`${API_BASE}/daily-bonus/status`, {
    method: "GET",
    headers: withAuthHeaders()
  });
  return handleResponse<DailyBonusStatusResponse>(res);
}

export async function startDailyBonus(): Promise<DailyBonusStartResponse> {
  const res = await fetch(`${API_BASE}/daily-bonus/start`, {
    method: "POST",
    headers: withAuthHeaders(undefined, true),
    body: JSON.stringify({})
  });
  return handleResponse<DailyBonusStartResponse>(res);
}

export async function claimDailyBonus(payload: {
  reward_session_id?: string;
  reward_id?: string;
  ad_event_payload?: Record<string, unknown>;
}): Promise<DailyBonusClaimResponse> {
  const res = await fetch(`${API_BASE}/daily-bonus/claim`, {
    method: "POST",
    headers: withAuthHeaders(undefined, true),
    body: JSON.stringify(payload)
  });
  return handleResponse<DailyBonusClaimResponse>(res);
}

export async function getFreeHoroscopeToday(params?: { lang?: string | null }): Promise<HoroscopeFreeTodayResponse> {
  const search = new URLSearchParams();
  const lang = params?.lang?.trim();
  if (lang) {
    search.set("lang", lang);
  }
  const endpoint = search.toString()
    ? `${API_BASE}/horoscope/free/today?${search.toString()}`
    : `${API_BASE}/horoscope/free/today`;
  const res = await fetch(endpoint, {
    method: "GET",
    headers: withAuthHeaders()
  });
  return handleResponse<HoroscopeFreeTodayResponse>(res);
}

export async function purchaseHoroscopeOneoff(payload: {
  product_code:
    | "horoscope_oneoff_personal_today"
    | "horoscope_oneoff_tomorrow"
    | "horoscope_oneoff_week"
    | "horoscope_oneoff_month"
    | "horoscope_oneoff_3months"
    | "horoscope_oneoff_6months"
    | "horoscope_oneoff_year";
  lang?: string;
  source?: string;
}): Promise<HoroscopeOneoffPurchaseResponse> {
  const res = await fetch(`${API_BASE}/horoscope/oneoff/purchase`, {
    method: "POST",
    headers: withAuthHeaders(undefined, true),
    body: JSON.stringify(payload)
  });
  return handleResponse<HoroscopeOneoffPurchaseResponse>(res);
}

export async function purchaseHoroscopeSubscription(payload: {
  plan_code: "horoscope_sub_daily_lite" | "horoscope_sub_daily_plus";
  lang?: string;
  source?: string;
}): Promise<HoroscopeSubscriptionPurchaseResponse> {
  const res = await fetch(`${API_BASE}/horoscope/subscription/purchase`, {
    method: "POST",
    headers: withAuthHeaders(undefined, true),
    body: JSON.stringify(payload)
  });
  return handleResponse<HoroscopeSubscriptionPurchaseResponse>(res);
}

export async function getHoroscopeIssues(limit = 30): Promise<HoroscopeIssueResponse[] | HoroscopeIssuesListResponse> {
  const search = new URLSearchParams();
  search.set("limit", String(limit));
  const res = await fetch(`${API_BASE}/horoscope/issues?${search.toString()}`, {
    method: "GET",
    headers: withAuthHeaders()
  });
  return handleResponse<HoroscopeIssueResponse[] | HoroscopeIssuesListResponse>(res);
}

export async function getHoroscopeIssue(issueId: string): Promise<HoroscopeIssueResponse> {
  const res = await fetch(`${API_BASE}/horoscope/issues/${encodeURIComponent(issueId)}`, {
    method: "GET",
    headers: withAuthHeaders()
  });
  return handleResponse<HoroscopeIssueResponse>(res);
}

export async function processHoroscopeIssue(issueId: string): Promise<{
  success: boolean;
  issue?: HoroscopeIssueResponse;
  error?: string;
}> {
  const res = await fetch(`${API_BASE}/horoscope/issues/${encodeURIComponent(issueId)}/process`, {
    method: "POST",
    headers: withAuthHeaders(undefined, true),
    body: JSON.stringify({})
  });
  return handleResponse<{
    success: boolean;
    issue?: HoroscopeIssueResponse;
    error?: string;
  }>(res);
}

export async function getHoroscopeSubscriptionStatus(): Promise<HoroscopeSubscriptionStatusResponse> {
  const res = await fetch(`${API_BASE}/horoscope/subscription/status`, {
    method: "GET",
    headers: withAuthHeaders()
  });
  return handleResponse<HoroscopeSubscriptionStatusResponse>(res);
}

export async function updateHoroscopeSubscriptionSchedule(payload: {
  morning_time_local?: string;
  evening_time_local?: string;
}): Promise<HoroscopeSubscriptionStatusResponse> {
  const res = await fetch(`${API_BASE}/horoscope/subscription/schedule`, {
    method: "POST",
    headers: withAuthHeaders(undefined, true),
    body: JSON.stringify(payload)
  });
  return handleResponse<HoroscopeSubscriptionStatusResponse>(res);
}

export async function createRobokassaPayment(payload: {
  product_code?: string;
  offer_id?: string;
  usage_id?: string;
  currency_code?: "RUB" | "USD" | "EUR";
  idempotency_key?: string;
}): Promise<RobokassaCreatePaymentResponse> {
  const res = await fetch(`${API_BASE}/payments/robokassa/create`, {
    method: "POST",
    headers: withAuthHeaders(undefined, true),
    body: JSON.stringify(payload)
  });
  return handleResponse<RobokassaCreatePaymentResponse>(res);
}

export async function getPaymentOffers(params: {
  provider: "robokassa" | "telegram_stars";
  currency?: "RUB" | "USD" | "EUR" | "XTR";
  source?: string;
  trigger_type?: string;
  detected_country?: string;
  telegram_lang?: string;
  device_lang?: string;
}): Promise<PaymentOffersResponse> {
  const searchParams = new URLSearchParams();
  searchParams.set("provider", params.provider);
  if (params.currency) searchParams.set("currency", params.currency);
  if (params.source) searchParams.set("source", params.source);
  if (params.trigger_type) searchParams.set("trigger_type", params.trigger_type);
  if (params.detected_country) searchParams.set("detected_country", params.detected_country);
  if (params.telegram_lang) searchParams.set("telegram_lang", params.telegram_lang);
  if (params.device_lang) searchParams.set("device_lang", params.device_lang);

  const res = await fetch(`${API_BASE}/payments/offers?${searchParams.toString()}`, {
    method: "GET",
    headers: withAuthHeaders()
  });
  return handleResponse<PaymentOffersResponse>(res);
}

export async function markPaymentOffersShown(payload: {
  offer_ids: string[];
  source?: string;
  local_date?: string;
  trigger_snapshot?: Record<string, unknown>;
}): Promise<MarkOffersShownResponse> {
  const res = await fetch(`${API_BASE}/payments/offers/mark-shown`, {
    method: "POST",
    headers: withAuthHeaders(undefined, true),
    body: JSON.stringify(payload)
  });
  return handleResponse<MarkOffersShownResponse>(res);
}

export async function markPaymentOfferDismissed(usage_id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/payments/offers/mark-dismissed`, {
    method: "POST",
    headers: withAuthHeaders(undefined, true),
    body: JSON.stringify({ usage_id })
  });
  await handleResponse<Record<string, unknown>>(res);
}

export async function markPaymentOfferExpired(usage_id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/payments/offers/mark-expired`, {
    method: "POST",
    headers: withAuthHeaders(undefined, true),
    body: JSON.stringify({ usage_id })
  });
  await handleResponse<Record<string, unknown>>(res);
}

export async function recordOfferEvent(payload: {
  trigger_type: string;
  surface: string;
  offer_id?: string;
  rule_id?: string | null;
  event_type: string;
  session_key?: string;
  dismissed_until?: string | null;
  cooldown_until?: string | null;
  context?: Record<string, unknown>;
}): Promise<OfferSurfaceStateResponse> {
  const res = await fetch(`${API_BASE}/offers/events`, {
    method: "POST",
    headers: withAuthHeaders(undefined, true),
    body: JSON.stringify(payload)
  });
  return handleResponse<OfferSurfaceStateResponse>(res);
}

export async function getOfferSurfaceState(params?: {
  surface?: string;
  trigger_type?: string;
}): Promise<OfferSurfaceStateListResponse> {
  const searchParams = new URLSearchParams();
  if (params?.surface) searchParams.set("surface", params.surface);
  if (params?.trigger_type) searchParams.set("trigger_type", params.trigger_type);
  const suffix = searchParams.toString();
  const res = await fetch(`${API_BASE}/offers/surface-state${suffix ? `?${suffix}` : ""}`, {
    method: "GET",
    headers: withAuthHeaders()
  });
  return handleResponse<OfferSurfaceStateListResponse>(res);
}

export async function getOfferPlacements(params?: {
  provider?: "robokassa" | "telegram_stars";
  currency?: "RUB" | "USD" | "EUR" | "XTR";
  source?: string;
  detected_country?: string;
  telegram_lang?: string;
  device_lang?: string;
  session_key?: string;
  session_is_first?: boolean;
  session_seconds?: number;
  session_screen_count?: number;
  session_energy_visited?: boolean;
  session_paid_action_attempted?: boolean;
  session_reward_ad_completed?: boolean;
  energy_page_seconds?: number;
}): Promise<OfferPlacementsResponse> {
  const searchParams = new URLSearchParams();
  if (params?.provider) searchParams.set("provider", params.provider);
  if (params?.currency) searchParams.set("currency", params.currency);
  if (params?.source) searchParams.set("source", params.source);
  if (params?.detected_country) searchParams.set("detected_country", params.detected_country);
  if (params?.telegram_lang) searchParams.set("telegram_lang", params.telegram_lang);
  if (params?.device_lang) searchParams.set("device_lang", params.device_lang);
  if (params?.session_key) searchParams.set("session_key", params.session_key);
  if (typeof params?.session_is_first === "boolean") searchParams.set("session_is_first", String(params.session_is_first));
  if (typeof params?.session_seconds === "number") searchParams.set("session_seconds", String(Math.max(0, Math.floor(params.session_seconds))));
  if (typeof params?.session_screen_count === "number") searchParams.set("session_screen_count", String(Math.max(0, Math.floor(params.session_screen_count))));
  if (typeof params?.session_energy_visited === "boolean") searchParams.set("session_energy_visited", String(params.session_energy_visited));
  if (typeof params?.session_paid_action_attempted === "boolean") searchParams.set("session_paid_action_attempted", String(params.session_paid_action_attempted));
  if (typeof params?.session_reward_ad_completed === "boolean") searchParams.set("session_reward_ad_completed", String(params.session_reward_ad_completed));
  if (typeof params?.energy_page_seconds === "number") searchParams.set("energy_page_seconds", String(Math.max(0, Math.floor(params.energy_page_seconds))));
  const suffix = searchParams.toString();
  const res = await fetch(`${API_BASE}/offers/placements${suffix ? `?${suffix}` : ""}`, {
    method: "GET",
    headers: withAuthHeaders()
  });
  return handleResponse<OfferPlacementsResponse>(res);
}

export async function getTelegramStarsOffers(source = "energy_page"): Promise<TelegramStarsOffersResponse> {
  const searchParams = new URLSearchParams({ source });
  const res = await fetch(`${API_BASE}/payments/telegram-stars/offers?${searchParams.toString()}`, {
    method: "GET",
    headers: withAuthHeaders()
  });
  return handleResponse<TelegramStarsOffersResponse>(res);
}

export async function createTelegramStarsPayment(payload: {
  offer_id?: string;
  product_code?: string;
  usage_id?: string;
  idempotency_key?: string;
}): Promise<TelegramStarsCreatePaymentResponse> {
  const res = await fetch(`${API_BASE}/payments/telegram-stars/create`, {
    method: "POST",
    headers: withAuthHeaders(undefined, true),
    body: JSON.stringify(payload)
  });
  return handleResponse<TelegramStarsCreatePaymentResponse>(res);
}

export async function adminListDiscountRules(): Promise<DiscountRuleResponse[]> {
  const res = await fetch(`${API_BASE}/admin/discounts/rules`, {
    method: "GET",
    headers: withAuthHeaders()
  });
  return handleResponse<DiscountRuleResponse[]>(res);
}

export async function adminProbeDiscountAccess(): Promise<AdminAccessResponse> {
  const res = await fetch(`${API_BASE}/admin/discounts/access`, {
    method: "GET",
    headers: withAuthHeaders()
  });
  return handleResponse<AdminAccessResponse>(res);
}

export async function adminGetDashboardSummary(): Promise<AdminDashboardSummaryResponse> {
  const res = await fetch(`${API_BASE}/admin/dashboard/summary`, {
    method: "GET",
    headers: withAuthHeaders()
  });
  return handleResponse<AdminDashboardSummaryResponse>(res);
}

export async function adminGetRecentPurchases(limit = 20): Promise<{ items: Record<string, unknown>[] }> {
  const res = await fetch(`${API_BASE}/admin/dashboard/recent-purchases?limit=${limit}`, {
    method: "GET",
    headers: withAuthHeaders()
  });
  return handleResponse<{ items: Record<string, unknown>[] }>(res);
}

export async function adminGetRecentUsages(limit = 30): Promise<{ items: Record<string, unknown>[] }> {
  const res = await fetch(`${API_BASE}/admin/dashboard/recent-usages?limit=${limit}`, {
    method: "GET",
    headers: withAuthHeaders()
  });
  return handleResponse<{ items: Record<string, unknown>[] }>(res);
}

export async function adminGetRecentActions(limit = 30): Promise<{ items: Record<string, unknown>[] }> {
  const res = await fetch(`${API_BASE}/admin/dashboard/recent-actions?limit=${limit}`, {
    method: "GET",
    headers: withAuthHeaders()
  });
  return handleResponse<{ items: Record<string, unknown>[] }>(res);
}

export async function adminGetHoroscopeWorkerStatus(): Promise<HoroscopeWorkerStatusResponse> {
  const res = await fetch(`${API_BASE}/horoscope/worker/status`, {
    method: "GET",
    headers: withAuthHeaders()
  });
  return handleResponse<HoroscopeWorkerStatusResponse>(res);
}

export async function adminRunDueHoroscopeSubscriptions(limit = 50): Promise<HoroscopeWorkerRunResponse> {
  const res = await fetch(`${API_BASE}/horoscope/subscription/due/run?limit=${limit}`, {
    method: "POST",
    headers: withAuthHeaders()
  });
  return handleResponse<HoroscopeWorkerRunResponse>(res);
}

export async function adminRunQueuedHoroscopeDeliveries(limit = 50): Promise<HoroscopeWorkerRunResponse> {
  const res = await fetch(`${API_BASE}/horoscope/deliveries/queued/run?limit=${limit}`, {
    method: "POST",
    headers: withAuthHeaders()
  });
  return handleResponse<HoroscopeWorkerRunResponse>(res);
}

export async function adminSearchUsers(q: string, limit = 20): Promise<AdminUserSearchResponse> {
  const query = new URLSearchParams({ q, limit: String(limit) });
  const res = await fetch(`${API_BASE}/admin/users/search?${query.toString()}`, {
    method: "GET",
    headers: withAuthHeaders()
  });
  return handleResponse<AdminUserSearchResponse>(res);
}

export async function adminGetDiscountRule(ruleId: string): Promise<DiscountRuleResponse> {
  const res = await fetch(`${API_BASE}/admin/discounts/rules/${encodeURIComponent(ruleId)}`, {
    method: "GET",
    headers: withAuthHeaders()
  });
  return handleResponse<DiscountRuleResponse>(res);
}

export async function adminCreateDiscountRule(
  payload: Record<string, unknown>
): Promise<DiscountRuleResponse> {
  const res = await fetch(`${API_BASE}/admin/discounts/rules`, {
    method: "POST",
    headers: withAuthHeaders(undefined, true),
    body: JSON.stringify(payload)
  });
  return handleResponse<DiscountRuleResponse>(res);
}

export async function adminUpdateDiscountRule(
  ruleId: string,
  payload: Record<string, unknown>
): Promise<DiscountRuleResponse> {
  const res = await fetch(`${API_BASE}/admin/discounts/rules/${encodeURIComponent(ruleId)}`, {
    method: "PATCH",
    headers: withAuthHeaders(undefined, true),
    body: JSON.stringify(payload)
  });
  return handleResponse<DiscountRuleResponse>(res);
}

export async function adminToggleDiscountRule(ruleId: string): Promise<DiscountRuleResponse> {
  const res = await fetch(`${API_BASE}/admin/discounts/rules/${encodeURIComponent(ruleId)}/toggle`, {
    method: "POST",
    headers: withAuthHeaders(undefined, true),
    body: JSON.stringify({})
  });
  return handleResponse<DiscountRuleResponse>(res);
}

export async function adminArchiveDiscountRule(ruleId: string): Promise<{ status: string }> {
  const res = await fetch(`${API_BASE}/admin/discounts/rules/${encodeURIComponent(ruleId)}`, {
    method: "DELETE",
    headers: withAuthHeaders()
  });
  return handleResponse<{ status: string }>(res);
}

export async function adminDuplicateDiscountRule(ruleId: string): Promise<DiscountRuleResponse> {
  const res = await fetch(`${API_BASE}/admin/discounts/rules/${encodeURIComponent(ruleId)}/duplicate`, {
    method: "POST",
    headers: withAuthHeaders(undefined, true),
    body: JSON.stringify({})
  });
  return handleResponse<DiscountRuleResponse>(res);
}

export async function adminReorderDiscountRules(
  items: Array<{ rule_id: string; display_order?: number; priority?: number }>
): Promise<{ status: string; updated: number }> {
  const res = await fetch(`${API_BASE}/admin/discounts/rules/reorder`, {
    method: "POST",
    headers: withAuthHeaders(undefined, true),
    body: JSON.stringify({ items })
  });
  return handleResponse<{ status: string; updated: number }>(res);
}

export async function adminAssignDiscountRule(payload: {
  user_id: string;
  rule_id: string;
  expires_at?: string | null;
  meta?: Record<string, unknown>;
}): Promise<DiscountAssignmentResponse> {
  const res = await fetch(`${API_BASE}/admin/discounts/assignments`, {
    method: "POST",
    headers: withAuthHeaders(undefined, true),
    body: JSON.stringify(payload)
  });
  return handleResponse<DiscountAssignmentResponse>(res);
}

export async function adminListAssignments(userId?: string): Promise<DiscountAssignmentResponse[]> {
  const params = new URLSearchParams();
  if (userId) params.set("user_id", userId);
  const suffix = params.toString() ? `?${params.toString()}` : "";
  const res = await fetch(`${API_BASE}/admin/discounts/assignments${suffix}`, {
    method: "GET",
    headers: withAuthHeaders()
  });
  return handleResponse<DiscountAssignmentResponse[]>(res);
}

export async function adminDisableAssignment(assignmentId: string): Promise<{ status: string; assignment_id: string }> {
  const res = await fetch(`${API_BASE}/admin/discounts/assignments/${encodeURIComponent(assignmentId)}/disable`, {
    method: "POST",
    headers: withAuthHeaders(undefined, true),
    body: JSON.stringify({})
  });
  return handleResponse<{ status: string; assignment_id: string }>(res);
}

export async function adminExpireAssignment(assignmentId: string): Promise<{ status: string; assignment_id: string }> {
  const res = await fetch(`${API_BASE}/admin/discounts/assignments/${encodeURIComponent(assignmentId)}/expire`, {
    method: "POST",
    headers: withAuthHeaders(undefined, true),
    body: JSON.stringify({})
  });
  return handleResponse<{ status: string; assignment_id: string }>(res);
}

export async function adminListAssignmentsHistory(params?: {
  user_id?: string;
  limit?: number;
}): Promise<{ items: Record<string, unknown>[] }> {
  const query = new URLSearchParams();
  if (params?.user_id) query.set("user_id", params.user_id);
  if (params?.limit) query.set("limit", String(params.limit));
  const suffix = query.toString() ? `?${query.toString()}` : "";
  const res = await fetch(`${API_BASE}/admin/discounts/assignments/history${suffix}`, {
    method: "GET",
    headers: withAuthHeaders()
  });
  return handleResponse<{ items: Record<string, unknown>[] }>(res);
}

export async function adminGetDiscountStats(): Promise<DiscountStatsResponse> {
  const res = await fetch(`${API_BASE}/admin/discounts/stats`, {
    method: "GET",
    headers: withAuthHeaders()
  });
  return handleResponse<DiscountStatsResponse>(res);
}

export async function adminGetDiscountAnalytics(): Promise<AdminAnalyticsResponse> {
  const res = await fetch(`${API_BASE}/admin/discounts/analytics`, {
    method: "GET",
    headers: withAuthHeaders()
  });
  return handleResponse<AdminAnalyticsResponse>(res);
}

export async function adminListPricingCountryTiers(includeInactive = true): Promise<AdminPricingCountryTierListResponse> {
  const params = new URLSearchParams();
  params.set("include_inactive", includeInactive ? "true" : "false");
  const res = await fetch(`${API_BASE}/admin/pricing/country-tiers?${params.toString()}`, {
    method: "GET",
    headers: withAuthHeaders()
  });
  return handleResponse<AdminPricingCountryTierListResponse>(res);
}

export async function adminUpsertPricingCountryTier(payload: {
  country_code: string;
  pricing_tier: "A" | "B" | "C";
  is_active?: boolean;
  notes?: string | null;
}): Promise<AdminPricingCountryTierItem> {
  const res = await fetch(`${API_BASE}/admin/pricing/country-tiers`, {
    method: "POST",
    headers: withAuthHeaders(undefined, true),
    body: JSON.stringify(payload)
  });
  return handleResponse<AdminPricingCountryTierItem>(res);
}

export async function adminGetPricingOfferMatrix(provider = "telegram_stars"): Promise<AdminPricingOfferMatrixResponse> {
  const params = new URLSearchParams();
  params.set("provider", provider);
  const res = await fetch(`${API_BASE}/admin/pricing/offer-matrix?${params.toString()}`, {
    method: "GET",
    headers: withAuthHeaders()
  });
  return handleResponse<AdminPricingOfferMatrixResponse>(res);
}

export async function adminGetUserOfferDebug(userId: string): Promise<AdminUserOfferDebugResponse> {
  const res = await fetch(`${API_BASE}/admin/discounts/debug/user-offer?user_id=${encodeURIComponent(userId)}`, {
    method: "GET",
    headers: withAuthHeaders()
  });
  return handleResponse<AdminUserOfferDebugResponse>(res);
}

export async function adminResolveDiscountDebug(params: {
  user_id: string;
  provider: "robokassa" | "telegram_stars";
  currency?: "RUB" | "USD" | "EUR" | "XTR";
  source?: string;
  trigger_type?: string;
  local_date?: string;
  balance_override?: number;
}): Promise<DiscountResolveDebugResponse> {
  const search = new URLSearchParams();
  search.set("user_id", params.user_id);
  search.set("provider", params.provider);
  if (params.currency) search.set("currency", params.currency);
  if (params.source) search.set("source", params.source);
  if (params.trigger_type) search.set("trigger_type", params.trigger_type);
  if (params.local_date) search.set("local_date", params.local_date);
  if (params.balance_override !== undefined) search.set("balance_override", String(params.balance_override));

  const res = await fetch(`${API_BASE}/admin/discounts/debug/resolve?${search.toString()}`, {
    method: "GET",
    headers: withAuthHeaders()
  });
  return handleResponse<DiscountResolveDebugResponse>(res);
}

export async function adminListDiscountUsages(userId: string, limit = 100): Promise<DiscountDebugUsagesResponse> {
  const res = await fetch(
    `${API_BASE}/admin/discounts/debug/usages?user_id=${encodeURIComponent(userId)}&limit=${limit}`,
    {
      method: "GET",
      headers: withAuthHeaders()
    }
  );
  return handleResponse<DiscountDebugUsagesResponse>(res);
}

export async function adminSimulateDiscountShow(payload: {
  user_id: string;
  provider?: "robokassa" | "telegram_stars";
  currency?: "RUB" | "USD" | "EUR" | "XTR";
  source?: string;
  trigger_type?: string;
  local_date?: string;
  balance_override?: number;
  trigger_snapshot?: Record<string, unknown>;
}): Promise<DiscountSimulateShowResponse> {
  const res = await fetch(`${API_BASE}/admin/discounts/debug/simulate/show`, {
    method: "POST",
    headers: withAuthHeaders(undefined, true),
    body: JSON.stringify(payload)
  });
  return handleResponse<DiscountSimulateShowResponse>(res);
}

export async function adminSimulateDiscountDismiss(usage_id: string): Promise<DiscountUsageResponse> {
  const res = await fetch(`${API_BASE}/admin/discounts/debug/simulate/dismiss`, {
    method: "POST",
    headers: withAuthHeaders(undefined, true),
    body: JSON.stringify({ usage_id })
  });
  return handleResponse<DiscountUsageResponse>(res);
}

export async function adminSimulateDiscountPurchase(payload: {
  usage_id: string;
  payment_id?: string;
}): Promise<DiscountUsageResponse> {
  const res = await fetch(`${API_BASE}/admin/discounts/debug/simulate/purchase`, {
    method: "POST",
    headers: withAuthHeaders(undefined, true),
    body: JSON.stringify(payload)
  });
  return handleResponse<DiscountUsageResponse>(res);
}

export async function getTelegramStarsPaymentStatus(paymentId: string): Promise<TelegramStarsPaymentStatusResponse> {
  const res = await fetch(`${API_BASE}/payments/${encodeURIComponent(paymentId)}`, {
    method: "GET",
    headers: withAuthHeaders()
  });
  return handleResponse<TelegramStarsPaymentStatusResponse>(res);
}

export async function getPurchaseStatus(purchaseId: string): Promise<PurchaseStatusResponse> {
  const res = await fetch(`${API_BASE}/purchases/${encodeURIComponent(purchaseId)}`, {
    method: "GET",
    headers: withAuthHeaders()
  });
  return handleResponse<PurchaseStatusResponse>(res);
}

export async function getReferralProgram(): Promise<ReferralProgramResponse> {
  const res = await fetch(`${API_BASE}/referrals/program`, {
    method: "GET",
    headers: withAuthHeaders()
  });
  return handleResponse<ReferralProgramResponse>(res);
}

export async function getWalletHistory(cursor?: string, limit = 20): Promise<WalletHistoryResponse> {
  const params = new URLSearchParams();
  params.set("limit", String(limit));
  if (cursor) params.set("cursor", cursor);
  const res = await fetch(`${API_BASE}/wallet/history?${params.toString()}`, {
    method: "GET",
    headers: withAuthHeaders()
  });
  return handleResponse<WalletHistoryResponse>(res);
}

export async function createShare(payload: { reading_id: string; image: Blob }): Promise<ShareCreateResponse> {
  const formData = new FormData();
  formData.append("reading_id", payload.reading_id);
  formData.append("image", payload.image, "reading.png");

  const res = await fetch(`${API_BASE}/share/create`, {
    method: "POST",
    headers: withAuthHeaders(),
    body: formData
  });
  return handleResponse<ShareCreateResponse>(res);
}
