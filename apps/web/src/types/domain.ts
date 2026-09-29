import type { AccountType, CategoryKind, TxType } from "@gestao/shared";

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  currency: string;
  initialBalance: number;
  currentBalance: number;
  color?: string | null;
  closingDay?: number | null;
  dueDay?: number | null;
  archivedAt?: string | null;
  /** Só em cartões com fechamento definido: total da fatura em aberto. */
  openInvoiceTotal?: number | null;
  openInvoiceDueDate?: string | null;
}

export interface Category {
  id: string;
  name: string;
  kind: CategoryKind;
  icon?: string | null;
  color?: string | null;
  parentId?: string | null;
  /** Dinheiro que só passa pela conta: fica fora de receita/despesa. */
  excludeFromReports?: boolean;
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
  installmentNo?: number | null;
  installmentTotal?: number | null;
  isCardPayment?: boolean;
  transferGroupId?: string | null;
  account?: Account | null;
  category?: Category | null;
}

export interface Invoice {
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  total: number;
  transactions: Transaction[];
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

/** Item que compõe uma barra do gráfico — usado nos tooltips detalhados. */
export interface BreakdownItem {
  label: string;
  amount: number;
  date?: string;
}

export interface CategoryTotal {
  categoryId: string | null;
  name: string;
  color: string;
  total: number;
  pct: number;
  items: BreakdownItem[];
  itemCount: number;
}

export interface MonthlyPoint {
  month: string;
  income: number;
  expense: number;
  net: number;
  incomeBreakdown: BreakdownItem[];
  expenseBreakdown: BreakdownItem[];
}

export interface BalancePoint {
  month: string;
  balance: number;
  delta: number;
}

