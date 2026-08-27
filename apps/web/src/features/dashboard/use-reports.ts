import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import type { CategoryTotal, MonthlyPoint, ReportSummary } from "@/types/domain";

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
