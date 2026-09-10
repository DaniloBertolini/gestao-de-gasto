import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import type { BalancePoint, CategoryAnomaly, CategoryTotal, MonthlyPoint, ReportSummary } from "@/types/domain";

export function useReportSummary(from: string, to: string) {
  return useQuery({
    queryKey: qk.reportSummary(from, to),
    queryFn: () => api.get<ReportSummary>("/reports/summary", { from, to }),
  });
}

export function useReportByCategory(from: string, to: string, type: "INCOME" | "EXPENSE" = "EXPENSE") {
  return useQuery({
    queryKey: qk.reportByCategory(from, to, type),
    queryFn: () => api.get<CategoryTotal[]>("/reports/by-category", { from, to, type }),
  });
}

export function useMonthlySeries(months = 6) {
  return useQuery({
    queryKey: qk.reportMonthlySeries(months),
    queryFn: () => api.get<MonthlyPoint[]>("/reports/monthly-series", { months }),
  });
}

export function useBalanceHistory(months = 12) {
  return useQuery({
    queryKey: qk.reportBalanceHistory(months),
    queryFn: () => api.get<BalancePoint[]>("/reports/balance-history", { months }),
  });
}

export function useCategoryAnomalies(months = 3) {
  return useQuery({
    queryKey: qk.reportCategoryAnomalies(months),
    queryFn: () => api.get<CategoryAnomaly[]>("/reports/category-anomalies", { months }),
  });
}
