import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, ShieldAlert } from "lucide-react";
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
  adminGetRecentActions,
  adminGetRecentPurchases,
  adminGetRecentUsages,
  adminGetUserOfferDebug,
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
  adminUpdateDiscountRule,
  type AdminAnalyticsResponse,
  type AdminDashboardSummaryResponse,
  type AdminUserOfferDebugResponse,
  type AdminUserSearchItem,
  type DiscountAssignmentResponse,
  type DiscountResolveDebugResponse,
  type DiscountRuleResponse,
  type DiscountStatsResponse
} from "@/lib/api";

const ADMIN_USER_ID = "eacd5034-10e3-496b-8868-b25df9c28711";

type AdminTab = "dashboard" | "rules" | "personal" | "tests" | "logs";

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

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
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
    void loadAssignments();
  }, [accessGranted, loadAssignments, loadDashboard, loadRules]);

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
            <p className="text-lg font-semibold text-[var(--text-primary)]">Admin Panel</p>
            <p className="text-sm text-[var(--text-secondary)]">Скидки, офферы, тестирование и аналитика</p>
          </div>
          <Button
            variant="outline"
            className="border-white/20"
            onClick={() => {
              void Promise.all([loadDashboard(), loadRules(), loadAssignments(selectedUser?.user_id)]);
            }}
          >
            Обновить всё
          </Button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {([
            ["dashboard", "Dashboard"],
            ["rules", "Акции"],
            ["personal", "Персональные"],
            ["tests", "Тесты"],
            ["logs", "Логи"]
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setActiveTab(value)}
              className={`rounded-full border px-4 py-2 text-sm transition ${
                activeTab === value
                  ? "border-[var(--accent-pink)]/60 bg-[var(--accent-pink)]/20 text-[var(--text-primary)]"
                  : "border-white/20 bg-white/5 text-[var(--text-secondary)]"
              }`}
            >
              {label}
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
                <option value="scheduled">scheduled</option>
                <option value="first_purchase">first_purchase</option>
                <option value="zero_balance">zero_balance</option>
                <option value="low_energy">low_energy</option>
                <option value="exit_intent">exit_intent</option>
                <option value="comeback">comeback</option>
                <option value="post_ads">post_ads</option>
                <option value="vip">vip</option>
                <option value="personal">personal</option>
              </select>
              <select
                className="rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm"
                value={ruleProviderFilter}
                onChange={(e) => setRuleProviderFilter(e.target.value)}
              >
                <option value="all">Любой провайдер</option>
                <option value="robokassa">robokassa</option>
                <option value="telegram_stars">telegram_stars</option>
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
                      <p className="text-xs text-[var(--text-tertiary)]">
                        {rule.code} • {rule.trigger_type} • {rule.target_provider ?? "all"} • {rule.target_currency ?? "all"}
                      </p>
                      <p className="mt-1 text-xs text-emerald-100">{ruleSummary(rule)}</p>
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
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Input value={ruleDraft.code} onChange={(e) => setRuleDraft((p) => ({ ...p, code: e.target.value }))} placeholder="code" />
              <Input value={ruleDraft.title} onChange={(e) => setRuleDraft((p) => ({ ...p, title: e.target.value }))} placeholder="title" />
              <Input value={ruleDraft.description} onChange={(e) => setRuleDraft((p) => ({ ...p, description: e.target.value }))} placeholder="description" />
              <select className="rounded-xl border border-white/15 bg-white/5 px-3 py-2" value={ruleDraft.trigger_type} onChange={(e) => setRuleDraft((p) => ({ ...p, trigger_type: e.target.value }))}>
                <option value="scheduled">scheduled</option>
                <option value="first_purchase">first_purchase</option>
                <option value="zero_balance">zero_balance</option>
                <option value="low_energy">low_energy</option>
                <option value="exit_intent">exit_intent</option>
                <option value="comeback">comeback</option>
                <option value="post_ads">post_ads</option>
                <option value="vip">vip</option>
                <option value="personal">personal</option>
                <option value="manual">manual</option>
              </select>
              <select className="rounded-xl border border-white/15 bg-white/5 px-3 py-2" value={ruleDraft.target_provider} onChange={(e) => setRuleDraft((p) => ({ ...p, target_provider: e.target.value as RuleDraft["target_provider"] }))}>
                <option value="">all providers</option>
                <option value="robokassa">robokassa</option>
                <option value="telegram_stars">telegram_stars</option>
              </select>
              <select className="rounded-xl border border-white/15 bg-white/5 px-3 py-2" value={ruleDraft.target_currency} onChange={(e) => setRuleDraft((p) => ({ ...p, target_currency: e.target.value as RuleDraft["target_currency"] }))}>
                <option value="">all currencies</option>
                <option value="RUB">RUB</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="XTR">XTR</option>
              </select>
              <Input value={ruleDraft.target_purchase_type} onChange={(e) => setRuleDraft((p) => ({ ...p, target_purchase_type: e.target.value }))} placeholder="purchase_type (energy)" />
              <Input value={ruleDraft.target_offer_code} onChange={(e) => setRuleDraft((p) => ({ ...p, target_offer_code: e.target.value }))} placeholder="offer_code (optional)" />
              <select className="rounded-xl border border-white/15 bg-white/5 px-3 py-2" value={ruleDraft.discount_type} onChange={(e) => setRuleDraft((p) => ({ ...p, discount_type: e.target.value as RuleDraft["discount_type"] }))}>
                <option value="percent">percent</option>
                <option value="fixed_amount">fixed_amount</option>
                <option value="override_price">override_price</option>
              </select>
              <Input value={ruleDraft.discount_value} onChange={(e) => setRuleDraft((p) => ({ ...p, discount_value: e.target.value }))} placeholder="discount_value" />
              <Input value={ruleDraft.bonus_energy} onChange={(e) => setRuleDraft((p) => ({ ...p, bonus_energy: e.target.value }))} placeholder="bonus_energy" />
              <Input value={ruleDraft.bonus_percent} onChange={(e) => setRuleDraft((p) => ({ ...p, bonus_percent: e.target.value }))} placeholder="bonus_percent" />
              <Input value={ruleDraft.priority} onChange={(e) => setRuleDraft((p) => ({ ...p, priority: e.target.value }))} placeholder="priority" />
              <Input value={ruleDraft.display_order} onChange={(e) => setRuleDraft((p) => ({ ...p, display_order: e.target.value }))} placeholder="display_order" />
              <Input type="datetime-local" value={ruleDraft.starts_at} onChange={(e) => setRuleDraft((p) => ({ ...p, starts_at: e.target.value }))} />
              <Input type="datetime-local" value={ruleDraft.ends_at} onChange={(e) => setRuleDraft((p) => ({ ...p, ends_at: e.target.value }))} />
              <Input value={ruleDraft.cooldown_hours} onChange={(e) => setRuleDraft((p) => ({ ...p, cooldown_hours: e.target.value }))} placeholder="cooldown_hours" />
              <Input value={ruleDraft.global_cooldown_hours} onChange={(e) => setRuleDraft((p) => ({ ...p, global_cooldown_hours: e.target.value }))} placeholder="global_cooldown_hours" />
              <Input value={ruleDraft.max_shows_per_day} onChange={(e) => setRuleDraft((p) => ({ ...p, max_shows_per_day: e.target.value }))} placeholder="max_shows_per_day" />
              <Input value={ruleDraft.max_uses_total} onChange={(e) => setRuleDraft((p) => ({ ...p, max_uses_total: e.target.value }))} placeholder="max_uses_total" />
              <Input value={ruleDraft.max_uses_per_user} onChange={(e) => setRuleDraft((p) => ({ ...p, max_uses_per_user: e.target.value }))} placeholder="max_uses_per_user" />
              <Input value={ruleDraft.source} onChange={(e) => setRuleDraft((p) => ({ ...p, source: e.target.value }))} placeholder="source" />
            </div>
            <div className="mt-3 flex gap-3 text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={ruleDraft.is_active} onChange={(e) => setRuleDraft((p) => ({ ...p, is_active: e.target.checked }))} />
                active
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={ruleDraft.is_test} onChange={(e) => setRuleDraft((p) => ({ ...p, is_test: e.target.checked }))} />
                test
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
                    const payload = {
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
                      audience_filter: {},
                      meta: {}
                    };
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

      {activeTab === "personal" ? (
        <div className="space-y-4">
          <Card className="rounded-[24px] border border-white/10 bg-[var(--bg-card)]/85 p-5">
            <p className="text-base font-semibold text-[var(--text-primary)]">Поиск пользователя</p>
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
              Пользователь: {selectedUser?.user_id ?? "не выбран"}
            </p>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <select
                className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm"
                value={selectedRuleId}
                onChange={(e) => setSelectedRuleId(e.target.value)}
              >
                <option value="">Выбери rule</option>
                {rules.map((rule) => (
                  <option key={rule.id} value={rule.id}>
                    {rule.title} ({rule.code})
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
                  <p className="text-sm text-[var(--text-primary)]">
                    rule: {item.rule_id} • user: {item.user_id}
                  </p>
                  <p className="text-xs text-[var(--text-secondary)]">
                    show/use: {item.show_count}/{item.usage_count}
                  </p>
                  <div className="mt-2 flex gap-2">
                    <MiniAction
                      label="Disable"
                      onClick={async () => {
                        await adminDisableAssignment(item.id);
                        await loadAssignments(selectedUser?.user_id);
                      }}
                    />
                    <MiniAction
                      label="Expire"
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
          <p className="text-base font-semibold text-[var(--text-primary)]">Тестирование правил</p>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Input value={testUserId} onChange={(e) => setTestUserId(e.target.value)} placeholder="user_id" />
            <select className="rounded-xl border border-white/15 bg-white/5 px-3 py-2" value={testProvider} onChange={(e) => setTestProvider(e.target.value === "telegram_stars" ? "telegram_stars" : "robokassa")}>
              <option value="robokassa">robokassa</option>
              <option value="telegram_stars">telegram_stars</option>
            </select>
            <select className="rounded-xl border border-white/15 bg-white/5 px-3 py-2" value={testCurrency} onChange={(e) => setTestCurrency(e.target.value as typeof testCurrency)}>
              <option value="RUB">RUB</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="XTR">XTR</option>
            </select>
            <Input value={testSource} onChange={(e) => setTestSource(e.target.value)} placeholder="source" />
            <Input value={testTriggerType} onChange={(e) => setTestTriggerType(e.target.value)} placeholder="trigger_type" />
            <Input value={testBalanceOverride} onChange={(e) => setTestBalanceOverride(e.target.value)} placeholder="balance override" />
            <Input value={simulateUsageId} onChange={(e) => setSimulateUsageId(e.target.value)} placeholder="usage_id" />
            <Input value={simulatePaymentId} onChange={(e) => setSimulatePaymentId(e.target.value)} placeholder="payment_id (optional)" />
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
              Resolve rule
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
              Simulate show
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
              Simulate dismiss
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
              Simulate purchase
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
            <p className="text-base font-semibold text-[var(--text-primary)]">Последние admin actions</p>
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
