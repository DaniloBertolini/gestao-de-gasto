import type { AccountType, CategoryKind, TxType } from "@gestao/shared";

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  currency: string;
  initialBalance: number;
  currentBalance: number;
  color?: string | null;
  archivedAt?: string | null;
}

export interface Category {
  id: string;
  name: string;
  kind: CategoryKind;
  icon?: string | null;
  color?: string | null;
  parentId?: string | null;
  children?: Category[];
}

export interface Transaction {
  id: string;
  accountId?: string | null;
  categoryId?: string | null;
  type: TxType;
  amount: number;
  date: string;
  description?: string | null;
  notes?: string | null;
  paid: boolean;
  account?: Account | null;
  category?: Category | null;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: { total: number; page: number; perPage: number; hasMore: boolean };
}

export interface ReportSummary {
  income: number;
  expense: number;
  net: number;
  savingsRate: number;
  prevPeriodDelta: { income: number; expense: number; net: number };
}

export interface CategoryTotal {
  categoryId: string | null;
  name: string;
  color: string;
  total: number;
  pct: number;
}

export interface MonthlyPoint {
  month: string;
  income: number;
  expense: number;
  net: number;
}
