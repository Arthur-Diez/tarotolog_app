import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useProfile } from "@/hooks/useProfile";
import {
  ApiError,
  createRobokassaPayment,
  getPurchaseStatus,
  type PurchaseStatusResponse
} from "@/lib/api";
import { openExternalLink } from "@/lib/telegram";

const PENDING_PURCHASE_STORAGE_KEY = "tarotolog_pending_purchase";

type PurchaseUiState = "idle" | "creating" | "awaiting_confirmation" | "succeeded" | "failed" | "pending";

interface PendingPurchaseStorage {
  purchase_id: string;
  invoice_id: number;
  product_code: string;
  created_at: string;
}

interface EnergyPackConfig {
  productCode: string;
  title: string;
  energyAmount: number;
  priceLabel: string;
}

const ENERGY_PACKS: EnergyPackConfig[] = [
  { productCode: "energy_50", title: "Пакет Старт", energyAmount: 10, priceLabel: "149 ₽" },
  { productCode: "energy_100", title: "Пакет Фокус", energyAmount: 25, priceLabel: "299 ₽" },
  { productCode: "energy_250", title: "Пакет Поток", energyAmount: 60, priceLabel: "599 ₽" }
];

const FAILED_STATUSES = new Set(["failed", "canceled", "refunded"]);

function readPendingPurchase(): PendingPurchaseStorage | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(PENDING_PURCHASE_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PendingPurchaseStorage;
    if (!parsed?.purchase_id) return null;
    return parsed;
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

function normalizeErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    return error.message || fallback;
  }
  if (error instanceof Error) {
    return error.message || fallback;
  }
  return fallback;
}

export default function EnergyPage() {
  const { profile, loading, refresh } = useProfile();
  const user = profile?.user;
  const energyBalance = user?.energy_balance ?? 0;

  const [uiState, setUiState] = useState<PurchaseUiState>("idle");
  const [statusText, setStatusText] = useState<string | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [activePurchase, setActivePurchase] = useState<PurchaseStatusResponse | null>(null);
  const [pendingPurchaseId, setPendingPurchaseId] = useState<string | null>(null);
  const [creatingProductCode, setCreatingProductCode] = useState<string | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);

  const applyPurchaseStatus = useCallback(
    async (purchase: PurchaseStatusResponse) => {
      setActivePurchase(purchase);

      if (purchase.status === "succeeded") {
        clearPendingPurchase();
        setPendingPurchaseId(null);
        setUiState("succeeded");
        setErrorText(null);
        setStatusText("Энергия успешно начислена.");
        await refresh();
        return;
      }

      if (FAILED_STATUSES.has(purchase.status)) {
        clearPendingPurchase();
        setPendingPurchaseId(null);
        setUiState("failed");
        setStatusText(null);
        setErrorText("Оплата не завершена.");
        return;
      }

      setPendingPurchaseId(purchase.purchase_id);
      setUiState("pending");
      setErrorText(null);
      setStatusText("Платёж ещё обрабатывается. Нажмите «Проверить статус» чуть позже.");
    },
    [refresh]
  );

  const checkPurchaseStatus = useCallback(
    async (purchaseId: string) => {
      if (!purchaseId) return;
      setCheckingStatus(true);
      try {
        const statusResponse = await getPurchaseStatus(purchaseId);
        await applyPurchaseStatus(statusResponse);
      } catch (error) {
        setUiState("pending");
        setErrorText(normalizeErrorMessage(error, "Не удалось проверить статус оплаты. Попробуйте ещё раз."));
      } finally {
        setCheckingStatus(false);
      }
    },
    [applyPurchaseStatus]
  );

  const handleBuyPack = useCallback(
    async (pack: EnergyPackConfig) => {
      setCreatingProductCode(pack.productCode);
      setUiState("creating");
      setStatusText(null);
      setErrorText(null);

      try {
        const payment = await createRobokassaPayment(pack.productCode);
        if (!payment.payment_url || !payment.purchase_id) {
          throw new Error("Не удалось создать платёж");
        }

        const pendingPayload: PendingPurchaseStorage = {
          purchase_id: payment.purchase_id,
          invoice_id: payment.invoice_id,
          product_code: payment.product_code,
          created_at: new Date().toISOString()
        };
        writePendingPurchase(pendingPayload);
        setPendingPurchaseId(payment.purchase_id);
        setActivePurchase({
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
        });
        setUiState("awaiting_confirmation");
        setStatusText("Мы ждём подтверждение оплаты. После оплаты вернитесь в мини-приложение.");

        openExternalLink(payment.payment_url);
      } catch (error) {
        setUiState("failed");
        setStatusText(null);
        setErrorText(normalizeErrorMessage(error, "Не удалось создать платёж. Попробуйте ещё раз."));
      } finally {
        setCreatingProductCode(null);
      }
    },
    []
  );

  useEffect(() => {
    const pending = readPendingPurchase();
    if (!pending?.purchase_id) return;
    setPendingPurchaseId(pending.purchase_id);
    setUiState("pending");
    setStatusText("Найден незавершённый платёж. Проверяем статус...");
    void checkPurchaseStatus(pending.purchase_id);
  }, [checkPurchaseStatus]);

  const canCheckStatus = Boolean(pendingPurchaseId) && !checkingStatus;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 rounded-[28px] border border-white/10 bg-[var(--bg-card)]/85 p-6 shadow-[0_30px_60px_rgba(0,0,0,0.6)]">
        <div className="flex h-16 w-16 items-center justify-center rounded-[18px] border border-white/15 bg-white/5">
          <Zap className="h-7 w-7 text-[var(--accent-gold)]" strokeWidth={1.4} />
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[var(--text-tertiary)]">Энергия аккаунта</p>
          {loading && !profile ? (
            <div className="mt-2 h-8 w-24 animate-pulse rounded-md bg-white/10" />
          ) : (
            <p className="mt-2 text-3xl font-semibold text-[var(--accent-pink)]">{energyBalance} ⚡</p>
          )}
          {user?.telegram.username ? (
            <p className="text-xs text-[var(--text-secondary)]">@{user.telegram.username}</p>
          ) : null}
        </div>
      </div>

      <Card className="border border-white/10 bg-[var(--bg-card)]/85 p-6">
        <div className="mb-4 space-y-1">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Пополнение энергии</h2>
          <p className="text-sm text-[var(--text-secondary)]">
            Выберите пакет и оплатите через Robokassa. Начисление произойдёт после подтверждения оплаты.
          </p>
        </div>

        <div className="grid gap-3">
          {ENERGY_PACKS.map((pack) => {
            const creatingThisPack = creatingProductCode === pack.productCode;

            return (
              <div
                key={pack.productCode}
                className="rounded-2xl border border-white/10 bg-[var(--surface-chip-bg)] px-4 py-3 shadow-[0_18px_30px_rgba(0,0,0,0.35)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-[var(--text-secondary)]">{pack.title}</p>
                    <p className="mt-1 text-xl font-semibold text-[var(--text-primary)]">{pack.energyAmount} ⚡</p>
                  </div>
                  <p className="text-base font-semibold text-[var(--accent-gold)]">{pack.priceLabel}</p>
                </div>
                <Button
                  className="mt-3 w-full"
                  variant="default"
                  disabled={Boolean(creatingProductCode) || checkingStatus}
                  onClick={() => {
                    void handleBuyPack(pack);
                  }}
                >
                  {creatingThisPack ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Подготовка платежа...
                    </span>
                  ) : (
                    "Купить"
                  )}
                </Button>
              </div>
            );
          })}
        </div>
      </Card>

      {(statusText || errorText || activePurchase || pendingPurchaseId) && (
        <Card
          className={`border p-5 ${
            uiState === "succeeded"
              ? "border-emerald-400/40 bg-emerald-400/10"
              : uiState === "failed"
                ? "border-red-400/40 bg-red-400/10"
                : "border-white/10 bg-[var(--bg-card)]/85"
          }`}
        >
          {statusText ? <p className="text-sm text-[var(--text-primary)]">{statusText}</p> : null}
          {errorText ? <p className="text-sm text-red-100">{errorText}</p> : null}

          {activePurchase ? (
            <p className="mt-2 text-xs text-[var(--text-secondary)]">
              Покупка #{activePurchase.invoice_id} • {activePurchase.product_title || activePurchase.product_code} • статус:{" "}
              {activePurchase.status}
            </p>
          ) : null}

          {pendingPurchaseId ? (
            <Button
              size="sm"
              variant="outline"
              className="mt-3 gap-2 border-white/20"
              disabled={!canCheckStatus}
              onClick={() => {
                if (!pendingPurchaseId) return;
                void checkPurchaseStatus(pendingPurchaseId);
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
          ) : null}
        </Card>
      )}
    </div>
  );
}
