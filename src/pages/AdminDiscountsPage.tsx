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
  adminGetUserOfferDebug,
  adminListAssignments,
  adminListDiscountRules,
  adminToggleDiscountRule,
  type AdminUserOfferDebugResponse,
  type DiscountAssignmentResponse,
  type DiscountRuleResponse,
  type DiscountStatsResponse
} from "@/lib/api";

const ADMIN_USER_ID = "eacd5034-10e3-496b-8868-b25df9c28711";

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
  const isAdmin = profile?.user?.id === ADMIN_USER_ID;

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

  useEffect(() => {
    if (!isAdmin) return;
    void loadRules();
    void loadStats();
  }, [isAdmin, loadRules, loadStats]);

  const activeRulesCount = useMemo(() => rules.filter((rule) => rule.is_active).length, [rules]);

  if (loading && !profile) {
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
                const next = await adminGetUserOfferDebug(debugUserId.trim());
                setDebugData(next);
              } finally {
                setDebugLoading(false);
              }
            }}
          >
            {debugLoading ? "..." : "Проверить"}
          </Button>
        </div>
        {debugData ? (
          <pre className="mt-3 max-h-64 overflow-auto rounded-lg border border-white/10 bg-black/30 p-3 text-[11px] text-emerald-100/90">
            {JSON.stringify(debugData, null, 2)}
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
