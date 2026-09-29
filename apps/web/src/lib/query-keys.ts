export const qk = {
  me: ["me"] as const,
  accounts: (includeArchived?: boolean) => ["accounts", { includeArchived }] as const,
  categories: (kind?: string) => ["categories", { kind }] as const,
  transactions: (filters: Record<string, unknown>) => ["transactions", filters] as const,
  reportSummary: (from: string, to: string) => ["reports", "summary", from, to] as const,
  reportByCategory: (from: string, to: string, type: string, accountIds?: string[]) =>
    ["reports", "by-category", from, to, type, accountIds ?? null] as const,
  reportMonthlySeries: (months: number, accountIds?: string[]) =>
    ["reports", "monthly-series", months, accountIds ?? null] as const,
  reportBalanceHistory: (months: number) => ["reports", "balance-history", months] as const,
};
