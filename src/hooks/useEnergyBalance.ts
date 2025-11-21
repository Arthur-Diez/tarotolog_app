import { useCallback, useEffect, useState } from "react";

import { getEnergy } from "@/lib/api";

interface UseEnergyBalanceResult {
  energy: number | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  setEnergyBalance: (value: number) => void;
}

export function useEnergyBalance(autoLoad = true): UseEnergyBalanceResult {
  const [energy, setEnergy] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getEnergy();
      setEnergy(response.energy_balance);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Не удалось получить баланс энергии";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (autoLoad) {
      void reload();
    }
  }, [autoLoad, reload]);

  const setEnergyBalance = useCallback((value: number) => {
    setEnergy(value);
  }, []);

  return { energy, loading, error, reload, setEnergyBalance };
}
