import { useCallback, useEffect, useMemo, useState } from "react";
import type { Account } from "@/types/domain";

const STORAGE_KEY = "patrimonio:dashboard-hidden-accounts";

function readStored(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

/**
 * Controla quais contas entram nos gráficos de fluxo (receita/despesa).
 *
 * Persiste as contas OCULTAS, e não as visíveis: assim uma conta criada depois
 * já aparece por padrão, em vez de ficar invisível por não estar numa lista
 * salva meses atrás.
 */
export function useAccountFilter(accounts: Account[] | undefined) {
  const [hidden, setHidden] = useState<string[]>(readStored);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(hidden));
  }, [hidden]);

  const toggle = useCallback((accountId: string) => {
    setHidden((current) =>
      current.includes(accountId) ? current.filter((id) => id !== accountId) : [...current, accountId],
    );
  }, []);

  const showAll = useCallback(() => setHidden([]), []);

  const visibleIds = useMemo(
    () => (accounts ?? []).filter((account) => !hidden.includes(account.id)).map((account) => account.id),
    [accounts, hidden],
  );

  const total = accounts?.length ?? 0;
  const allVisible = total > 0 && visibleIds.length === total;
  const noneVisible = total > 0 && visibleIds.length === 0;

  return {
    toggle,
    showAll,
    noneVisible,
    isFiltered: total > 0 && !allVisible,
    isVisible: (accountId: string) => !hidden.includes(accountId),
    /** undefined = todas as contas, sem filtro na query. */
    selectedIds: allVisible ? undefined : visibleIds,
  };
}
