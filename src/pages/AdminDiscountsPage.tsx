import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, ShieldAlert } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useProfile } from "@/hooks/useProfile";
import {
  adminArchiveDiscountRule,
  adminAssignDiscountRule,
  adminCreateDiscountRule,
  adminGetDiscountStats,
  adminListDiscountUsages,
  adminGetUserOfferDebug,
  adminListAssignments,
  adminListDiscountRules,
  adminResolveDiscountDebug,
  adminSimulateDiscountDismiss,
  adminSimulateDiscountPurchase,
  adminSimulateDiscountShow,
  adminToggleDiscountRule,
  type DiscountResolveDebugResponse,
  type AdminUserOfferDebugResponse,
  type DiscountAssignmentResponse,
  type DiscountRuleResponse,
  type DiscountStatsResponse
} from "@/lib/api";

const ADMIN_USER_ID = "eacd5034-10e3-496b-8868-b25df9c28711";
const ADMIN_TELEGRAM_ID = 5773954061;
const ADMIN_USERNAME = "bytemed";

function getTelegramUserId(): number | null {
  if (typeof window === "undefined") return null;
  const tgId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
  return typeof tgId === "number" ? tgId : null;
}

function getTelegramUsername(): string | null {
  if (typeof window === "undefined") return null;
  const raw = window.Telegram?.WebApp?.initDataUnsafe?.user?.username;
  return typeof raw === "string" && raw.trim() ? raw.trim().toLowerCase() : null;
}

function getTelegramUserFromInitData(): { id: number | null; username: string | null } {
  if (typeof window === "undefined") return { id: null, username: null };
  const initData = window.Telegram?.WebApp?.initData;
  if (!initData) return { id: null, username: null };
  try {
    const params = new URLSearchParams(initData);
    const userRaw = params.get("user");
    if (!userRaw) return { id: null, username: null };
    const user = JSON.parse(userRaw) as { id?: unknown; username?: unknown };
    return {
      id: typeof user.id === "number" ? user.id : null,
      username: typeof user.username === "string" && user.username.trim() ? user.username.trim().toLowerCase() : null
    };
  } catch {
    return { id: null, username: null };
  }
}

const DEFAULT_RULE_DRAFT = {
  code: "scheduled_weekend_15",
  title: "Плановая скидка -15%",
  trigger_type: "scheduled",
  target_provider: "robokassa",
  target_purchase_type: "energy",
  target_currency: "RUB",
  discount_type: "percent",
  discount_value: "15",
  bonus_energy: "0",
  priority: "100",
  source: "admin"
};

export default function AdminDiscountsPage() {
  const navigate = useNavigate();
  const { profile, loading } = useProfile();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const telegramUserId = getTelegramUserId();
  const telegramUsername = getTelegramUsername();
  const telegramFromInitData = getTelegramUserFromInitData();
  const isAdminByIdentity = useMemo(() => {
    const backendUsername = profile?.user?.telegram?.username?.trim().toLowerCase() ?? null;
    const userId = profile?.user?.id ?? null;
    return (
      profile?.user?.is_admin === true ||
      userId === ADMIN_USER_ID ||
      backendUsername === ADMIN_USERNAME ||
      telegramUserId === ADMIN_TELEGRAM_ID ||
      telegramUsername === ADMIN_USERNAME ||
      telegramFromInitData.id === ADMIN_TELEGRAM_ID ||
      telegramFromInitData.username === ADMIN_USERNAME
    );
  }, [profile?.user?.id, profile?.user?.telegram?.username, profile?.user?.is_admin, telegramUserId, telegramUsername, telegramFromInitData.id, telegramFromInitData.username]);

  const [rules, setRules] = useState<DiscountRuleResponse[]>([]);
  const [rulesLoading, setRulesLoading] = useState(false);
  const [rulesError, setRulesError] = useState<string | null>(null);
  const [stats, setStats] = useState<DiscountStatsResponse | null>(null);
  const [assignments, setAssignments] = useState<DiscountAssignmentResponse[]>([]);
  const [statsLoading, setStatsLoading] = useState(false);

  const [draft, setDraft] = useState(DEFAULT_RULE_DRAFT);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [assignUserId, setAssignUserId] = useState("");
  const [assignRuleId, setAssignRuleId] = useState("");
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);

  const [debugUserId, setDebugUserId] = useState("");
  const [debugData, setDebugData] = useState<AdminUserOfferDebugResponse | null>(null);
  const [debugLoading, setDebugLoading] = useState(false);
  const [resolveData, setResolveData] = useState<DiscountResolveDebugResponse | null>(null);
  const [debugUsages, setDebugUsages] = useState<Record<string, unknown>[]>([]);
  const [simulateLoading, setSimulateLoading] = useState(false);
  const [simulateError, setSimulateError] = useState<string | null>(null);
  const [simulateUsageId, setSimulateUsageId] = useState("");
  const [simulatePaymentId, setSimulatePaymentId] = useState("");
  const [testProvider, setTestProvider] = useState<"robokassa" | "telegram_stars">("robokassa");
  const [testCurrency, setTestCurrency] = useState("RUB");
  const [testTriggerType, setTestTriggerType] = useState("auto");
  const [testSource, setTestSource] = useState("energy_page");
  const [testBalanceOverride, setTestBalanceOverride] = useState("");

  const loadRules = useCallback(async () => {
    try {
      setRulesLoading(true);
      setRulesError(null);
      const next = await adminListDiscountRules();
      setRules(next);
    } catch (error) {
      setRulesError(error instanceof Error ? error.message : "Не удалось загрузить правила");
    } finally {
      setRulesLoading(false);
    }
  }, []);

  const loadStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const [nextStats, nextAssignments] = await Promise.all([
        adminGetDiscountStats(),
        adminListAssignments()
      ]);
      setStats(nextStats);
      setAssignments(nextAssignments);
    } catch {
      // ignore background stats errors
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const runResolveDebug = useCallback(async () => {
    const targetUserId = debugUserId.trim();
    if (!targetUserId) return;
    const payloadBalanceOverride =
      testBalanceOverride.trim().length > 0 ? Number(testBalanceOverride) : undefined;
    const response = await adminResolveDiscountDebug({
      user_id: targetUserId,
      provider: testProvider,
      currency: testProvider === "telegram_stars" ? "XTR" : (testCurrency as "RUB" | "USD" | "EUR"),
      trigger_type: testTriggerType,
      source: testSource.trim() || "energy_page",
      balance_override: Number.isFinite(payloadBalanceOverride as number)
        ? payloadBalanceOverride
        : undefined
    });
    setResolveData(response);
    const usageRows = await adminListDiscountUsages(targetUserId, 30);
    setDebugUsages(usageRows.items ?? []);
  }, [debugUserId, testBalanceOverride, testCurrency, testProvider, testSource, testTriggerType]);

  useEffect(() => {
    let cancelled = false;
    if (isAdminByIdentity) {
      setIsAdmin(true);
    }

    void adminGetDiscountStats()
      .then((nextStats) => {
        if (cancelled) return;
        setIsAdmin(true);
        setStats(nextStats);
      })
      .catch(() => {
        if (cancelled) return;
        if (!isAdminByIdentity) {
          setIsAdmin(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isAdminByIdentity]);

  useEffect(() => {
    if (!isAdmin) return;
    void loadRules();
    void loadStats();
  }, [isAdmin, loadRules, loadStats]);

  const activeRulesCount = useMemo(() => rules.filter((rule) => rule.is_active).length, [rules]);

  if ((loading && !profile) || isAdmin === null) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-[var(--text-secondary)]">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Загружаем админ-панель...
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <Card className="border border-red-500/30 bg-red-500/10 p-6">
        <div className="flex items-start gap-3">
          <ShieldAlert className="mt-0.5 h-5 w-5 text-red-200" />
          <div>
            <p className="text-base font-semibold text-red-100">Доступ запрещён</p>
            <p className="mt-1 text-sm text-red-100/80">Этот экран доступен только администратору.</p>
            <Button className="mt-4" variant="outline" onClick={() => navigate("/energy")}>Вернуться в Энергию</Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4 pb-8">
      <Card className="border border-white/10 bg-[var(--bg-card)]/85 p-5">
        <p className="text-lg font-semibold text-[var(--text-primary)]">Админка скидок</p>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Управление discount rules, персональными назначениями и отладкой офферов.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
          <div className="rounded-xl border border-white/10 bg-white/5 p-2">
            <p className="text-xs text-[var(--text-tertiary)]">Всего правил</p>
            <p className="mt-1 font-semibold text-[var(--text-primary)]">{stats?.total_rules ?? rules.length}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-2">
            <p className="text-xs text-[var(--text-tertiary)]">Активно</p>
            <p className="mt-1 font-semibold text-emerald-100">{stats?.active_rules ?? activeRulesCount}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-2">
            <p className="text-xs text-[var(--text-tertiary)]">Показы</p>
            <p className="mt-1 font-semibold text-[var(--text-primary)]">{stats?.usages_shown ?? 0}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-2">
            <p className="text-xs text-[var(--text-tertiary)]">Конверсия</p>
            <p className="mt-1 font-semibold text-[var(--accent-gold)]">{stats?.conversion_rate ?? 0}%</p>
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <Button size="sm" variant="outline" className="border-white/20" onClick={() => void loadRules()}>
            Обновить правила
          </Button>
          <Button size="sm" variant="outline" className="border-white/20" onClick={() => void loadStats()} disabled={statsLoading}>
            {statsLoading ? "Обновляем..." : "Обновить статистику"}
          </Button>
        </div>
      </Card>

      <Card className="border border-white/10 bg-[var(--bg-card)]/85 p-5">
        <p className="text-base font-semibold text-[var(--text-primary)]">Создать правило</p>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <input className="rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm" placeholder="code" value={draft.code} onChange={(e) => setDraft((prev) => ({ ...prev, code: e.target.value }))} />
          <input className="rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm" placeholder="title" value={draft.title} onChange={(e) => setDraft((prev) => ({ ...prev, title: e.target.value }))} />
          <input className="rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm" placeholder="trigger_type" value={draft.trigger_type} onChange={(e) => setDraft((prev) => ({ ...prev, trigger_type: e.target.value }))} />
          <input className="rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm" placeholder="target_provider" value={draft.target_provider} onChange={(e) => setDraft((prev) => ({ ...prev, target_provider: e.target.value }))} />
          <input className="rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm" placeholder="target_currency" value={draft.target_currency} onChange={(e) => setDraft((prev) => ({ ...prev, target_currency: e.target.value }))} />
          <input className="rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm" placeholder="discount_type" value={draft.discount_type} onChange={(e) => setDraft((prev) => ({ ...prev, discount_type: e.target.value }))} />
          <input className="rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm" placeholder="discount_value" value={draft.discount_value} onChange={(e) => setDraft((prev) => ({ ...prev, discount_value: e.target.value }))} />
          <input className="rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm" placeholder="bonus_energy" value={draft.bonus_energy} onChange={(e) => setDraft((prev) => ({ ...prev, bonus_energy: e.target.value }))} />
        </div>
        {createError ? <p className="mt-2 text-xs text-red-200">{createError}</p> : null}
        <Button
          className="mt-3"
          disabled={createLoading}
          onClick={async () => {
            try {
              setCreateLoading(true);
              setCreateError(null);
              await adminCreateDiscountRule({
                code: draft.code,
                title: draft.title,
                trigger_type: draft.trigger_type,
                target_provider: draft.target_provider,
                target_purchase_type: draft.target_purchase_type,
                target_currency: draft.target_currency,
                discount_type: draft.discount_type,
                discount_value: Number(draft.discount_value),
                bonus_energy: Number(draft.bonus_energy),
                priority: Number(draft.priority),
                source: draft.source,
                is_active: true,
                audience_filter: {},
                meta: {}
              });
              await loadRules();
              await loadStats();
            } catch (error) {
              setCreateError(error instanceof Error ? error.message : "Не удалось создать правило");
            } finally {
              setCreateLoading(false);
            }
          }}
        >
          {createLoading ? "Создаём..." : "Создать правило"}
        </Button>
      </Card>

      <Card className="border border-white/10 bg-[var(--bg-card)]/85 p-5">
        <p className="text-base font-semibold text-[var(--text-primary)]">Персональное назначение</p>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <input className="rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm" placeholder="user_id" value={assignUserId} onChange={(e) => setAssignUserId(e.target.value)} />
          <input className="rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm" placeholder="rule_id" value={assignRuleId} onChange={(e) => setAssignRuleId(e.target.value)} />
        </div>
        {assignError ? <p className="mt-2 text-xs text-red-200">{assignError}</p> : null}
        <Button
          className="mt-3"
          variant="outline"
          disabled={assignLoading}
          onClick={async () => {
            try {
              setAssignLoading(true);
              setAssignError(null);
              await adminAssignDiscountRule({ user_id: assignUserId, rule_id: assignRuleId });
              setAssignUserId("");
              setAssignRuleId("");
              await loadStats();
            } catch (error) {
              setAssignError(error instanceof Error ? error.message : "Не удалось назначить правило");
            } finally {
              setAssignLoading(false);
            }
          }}
        >
          {assignLoading ? "Назначаем..." : "Назначить"}
        </Button>

        <div className="mt-4 max-h-44 space-y-2 overflow-y-auto pr-1 text-xs">
          {assignments.slice(0, 50).map((item) => (
            <div key={item.id} className="rounded-lg border border-white/10 bg-white/5 p-2">
              <p className="text-[var(--text-primary)]">{item.user_id}</p>
              <p className="text-[var(--text-secondary)]">rule: {item.rule_id}</p>
              <p className="text-[var(--text-tertiary)]">show {item.show_count} / use {item.usage_count}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card className="border border-white/10 bg-[var(--bg-card)]/85 p-5">
        <p className="text-base font-semibold text-[var(--text-primary)]">Debug user offer</p>
        <div className="mt-3 flex gap-2">
          <input className="flex-1 rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm" placeholder="user_id" value={debugUserId} onChange={(e) => setDebugUserId(e.target.value)} />
          <Button
            variant="outline"
            className="border-white/20"
            disabled={debugLoading || !debugUserId.trim()}
            onClick={async () => {
              try {
                setDebugLoading(true);
                setSimulateError(null);
                const next = await adminGetUserOfferDebug(debugUserId.trim());
                setDebugData(next);
                await runResolveDebug();
              } finally {
                setDebugLoading(false);
              }
            }}
          >
            {debugLoading ? "..." : "Проверить"}
          </Button>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <input
            className="rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-xs"
            placeholder="provider"
            value={testProvider}
            onChange={(e) => setTestProvider(e.target.value === "telegram_stars" ? "telegram_stars" : "robokassa")}
          />
          <input
            className="rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-xs"
            placeholder="currency"
            value={testCurrency}
            onChange={(e) => setTestCurrency(e.target.value.toUpperCase())}
          />
          <input
            className="rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-xs"
            placeholder="trigger_type"
            value={testTriggerType}
            onChange={(e) => setTestTriggerType(e.target.value)}
          />
          <input
            className="rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-xs"
            placeholder="source"
            value={testSource}
            onChange={(e) => setTestSource(e.target.value)}
          />
        </div>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <input
            className="rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-xs"
            placeholder="balance_override (optional)"
            value={testBalanceOverride}
            onChange={(e) => setTestBalanceOverride(e.target.value)}
          />
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="border-white/20"
              disabled={simulateLoading || !debugUserId.trim()}
              onClick={async () => {
                try {
                  setSimulateLoading(true);
                  setSimulateError(null);
                  await runResolveDebug();
                } catch (error) {
                  setSimulateError(error instanceof Error ? error.message : "Resolve failed");
                } finally {
                  setSimulateLoading(false);
                }
              }}
            >
              Resolve rule
            </Button>
            <Button
              variant="outline"
              className="border-white/20"
              disabled={simulateLoading || !debugUserId.trim()}
              onClick={async () => {
                try {
                  setSimulateLoading(true);
                  setSimulateError(null);
                  const result = await adminSimulateDiscountShow({
                    user_id: debugUserId.trim(),
                    provider: testProvider,
                    currency: testProvider === "telegram_stars" ? "XTR" : (testCurrency as "RUB" | "USD" | "EUR"),
                    source: testSource.trim() || "admin_simulate",
                    trigger_type: testTriggerType.trim() || "auto",
                    balance_override: testBalanceOverride.trim().length > 0 ? Number(testBalanceOverride) : undefined,
                    trigger_snapshot: { from: "admin-panel" }
                  });
                  setResolveData(result.resolve);
                  setDebugUsages((await adminListDiscountUsages(debugUserId.trim(), 30)).items ?? []);
                  const tracked = result.shown.items.find((item) => item.usage_id)?.usage_id ?? "";
                  if (tracked) setSimulateUsageId(tracked);
                } catch (error) {
                  setSimulateError(error instanceof Error ? error.message : "Show simulation failed");
                } finally {
                  setSimulateLoading(false);
                }
              }}
            >
              Simulate show
            </Button>
          </div>
        </div>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto_auto]">
          <input
            className="rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-xs"
            placeholder="usage_id for dismiss/purchase"
            value={simulateUsageId}
            onChange={(e) => setSimulateUsageId(e.target.value)}
          />
          <input
            className="rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-xs"
            placeholder="payment_id (optional for purchase)"
            value={simulatePaymentId}
            onChange={(e) => setSimulatePaymentId(e.target.value)}
          />
          <Button
            variant="outline"
            className="border-white/20"
            disabled={simulateLoading || !simulateUsageId.trim()}
            onClick={async () => {
              try {
                setSimulateLoading(true);
                setSimulateError(null);
                await adminSimulateDiscountDismiss(simulateUsageId.trim());
                if (debugUserId.trim()) {
                  setDebugUsages((await adminListDiscountUsages(debugUserId.trim(), 30)).items ?? []);
                }
              } catch (error) {
                setSimulateError(error instanceof Error ? error.message : "Dismiss simulation failed");
              } finally {
                setSimulateLoading(false);
              }
            }}
          >
            Simulate dismiss
          </Button>
          <Button
            variant="outline"
            className="border-white/20"
            disabled={simulateLoading || !simulateUsageId.trim()}
            onClick={async () => {
              try {
                setSimulateLoading(true);
                setSimulateError(null);
                await adminSimulateDiscountPurchase({
                  usage_id: simulateUsageId.trim(),
                  payment_id: simulatePaymentId.trim() || undefined
                });
                if (debugUserId.trim()) {
                  setDebugUsages((await adminListDiscountUsages(debugUserId.trim(), 30)).items ?? []);
                }
              } catch (error) {
                setSimulateError(error instanceof Error ? error.message : "Purchase simulation failed");
              } finally {
                setSimulateLoading(false);
              }
            }}
          >
            Simulate purchase
          </Button>
        </div>
        {simulateError ? <p className="mt-2 text-xs text-red-200">{simulateError}</p> : null}
        {debugData ? (
          <pre className="mt-3 max-h-64 overflow-auto rounded-lg border border-white/10 bg-black/30 p-3 text-[11px] text-emerald-100/90">
            {JSON.stringify(debugData, null, 2)}
          </pre>
        ) : null}
        {resolveData ? (
          <pre className="mt-3 max-h-72 overflow-auto rounded-lg border border-white/10 bg-black/30 p-3 text-[11px] text-sky-100/90">
            {JSON.stringify(resolveData, null, 2)}
          </pre>
        ) : null}
        {debugUsages.length > 0 ? (
          <pre className="mt-3 max-h-56 overflow-auto rounded-lg border border-white/10 bg-black/30 p-3 text-[11px] text-fuchsia-100/90">
            {JSON.stringify(debugUsages, null, 2)}
          </pre>
        ) : null}
      </Card>

      <Card className="border border-white/10 bg-[var(--bg-card)]/85 p-5">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-base font-semibold text-[var(--text-primary)]">Правила</p>
          {rulesLoading ? <Loader2 className="h-4 w-4 animate-spin text-[var(--text-secondary)]" /> : null}
        </div>
        {rulesError ? <p className="mb-2 text-xs text-red-200">{rulesError}</p> : null}
        <div className="space-y-2">
          {rules.map((rule) => (
            <div key={rule.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  {rule.title} <span className="text-xs text-[var(--text-tertiary)]">({rule.code})</span>
                </p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="h-8 border-white/20 px-2 text-xs" onClick={() => void adminToggleDiscountRule(rule.id).then(loadRules)}>
                    {rule.is_active ? "Выключить" : "Включить"}
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 border-red-300/40 px-2 text-xs text-red-200" onClick={() => void adminArchiveDiscountRule(rule.id).then(loadRules)}>
                    Архив
                  </Button>
                </div>
              </div>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">
                {rule.trigger_type} • {rule.target_provider ?? "all"} • {rule.target_currency ?? "all"} • {rule.discount_type} {rule.discount_value}
              </p>
              {rule.bonus_energy > 0 ? <p className="mt-1 text-xs text-emerald-100">Бонус: +{rule.bonus_energy} ⚡</p> : null}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
