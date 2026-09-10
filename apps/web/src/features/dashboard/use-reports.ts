import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import type { BalancePoint, CategoryAnomaly, CategoryTotal, MonthlyPoint, ReportSummary } from "@/types/domain";

/** Lista vazia = sem recorte (todas as contas); evita mandar filtro à toa. */
function accountParam(accountIds?: string[]) {
  return accountIds?.length ? { accountId: accountIds } : {};
}

export function useReportSummary(from: string, to: string) {
  return useQuery({
    queryKey: qk.reportSummary(from, to),
    queryFn: () => api.get<ReportSummary>("/reports/summary", { from, to }),
  });
}

export function useReportByCategory(
  from: string,
  to: string,
  type: "INCOME" | "EXPENSE" = "EXPENSE",
  accountIds?: string[],
  enabled = true,
) {
  return useQuery({
    queryKey: qk.reportByCategory(from, to, type, accountIds),
    queryFn: () => api.get<CategoryTotal[]>("/reports/by-category", { from, to, type, ...accountParam(accountIds) }),
    enabled,
  });
}

export function useMonthlySeries(months = 6, accountIds?: string[], enabled = true) {
  return useQuery({
    queryKey: qk.reportMonthlySeries(months, accountIds),
    queryFn: () => api.get<MonthlyPoint[]>("/reports/monthly-series", { months, ...accountParam(accountIds) }),
    enabled,
  });
}

export function useBalanceHistory(months = 12) {
  return useQuery({
    queryKey: qk.reportBalanceHistory(months),
    queryFn: () => api.get<BalancePoint[]>("/reports/balance-history", { months }),
  });
}

export function useCategoryAnomalies(months = 3, accountIds?: string[], enabled = true) {
  return useQuery({
    queryKey: qk.reportCategoryAnomalies(months, accountIds),
    queryFn: () => api.get<CategoryAnomaly[]>("/reports/category-anomalies", { months, ...accountParam(accountIds) }),
    enabled,
  });
}
