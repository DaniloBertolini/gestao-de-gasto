import { useState } from "react";
import { endOfMonth, format, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatBRL } from "@gestao/shared";
import { Card, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useAuth } from "@/features/auth/auth-context";
import { useAccounts } from "@/features/accounts/use-accounts";
import { useCountUp } from "@/hooks/use-count-up";
import { cn, formatDate } from "@/lib/utils";
import type { Account, BalancePoint, BreakdownItem, CategoryTotal, MonthlyPoint } from "@/types/domain";
import { useAccountFilter } from "./use-account-filter";
import { useBalanceHistory, useMonthlySeries, useReportByCategory, useReportSummary } from "./use-reports";

const today = new Date();
const from = format(startOfMonth(today), "yyyy-MM-dd");
const to = format(endOfMonth(today), "yyyy-MM-dd");

/** Quantos itens cabem no tooltip; o resto aparece no detalhe, ao clicar. */
const TOOLTIP_LIMIT = 6;

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  CHECKING: "Conta corrente",
  SAVINGS: "Poupança",
  CASH: "Dinheiro",
  CREDIT_CARD: "Cartão de crédito",
  INVESTMENT: "Investimento",
};

const axisTick = { fill: "hsl(var(--ink-faint))", fontSize: 11, fontFamily: "var(--font-mono)" };

/** Detalhe completo aberto ao clicar numa barra. */
interface BarDetail {
  title: string;
  subtitle?: string;
  total: number;
  accent: string;
  items: BreakdownItem[];
}

export function DashboardPage() {
  const { user } = useAuth();
  const { data: accounts } = useAccounts();
  const accountFilter = useAccountFilter(accounts);
  const { selectedIds, noneVisible } = accountFilter;
  const flowEnabled = !noneVisible;

  const { data: summary } = useReportSummary(from, to);
  const { data: balanceHistory } = useBalanceHistory(12);
  const { data: series } = useMonthlySeries(6, selectedIds, flowEnabled);
  const { data: byCategory } = useReportByCategory(from, to, "EXPENSE", selectedIds, flowEnabled);

  const [detail, setDetail] = useState<BarDetail | null>(null);

  const totalBalance = accounts?.reduce((sum, a) => sum + a.currentBalance, 0) ?? 0;
  const animatedBalance = useCountUp(totalBalance);
  const firstName = user?.name?.split(" ")[0];

  function openMonthDetail(point: MonthlyPoint | undefined, type: "income" | "expense") {
    if (!point) return;
    const isIncome = type === "income";
    setDetail({
      title: isIncome ? "Receitas" : "Despesas",
      subtitle: point.month,
      total: isIncome ? point.income : point.expense,
      accent: isIncome ? "text-income" : "text-expense",
      items: isIncome ? point.incomeBreakdown : point.expenseBreakdown,
    });
  }

  function openCategoryDetail(category: CategoryTotal | undefined) {
    if (!category) return;
    setDetail({
      title: category.name,
      subtitle: `${category.itemCount} lançamento${category.itemCount > 1 ? "s" : ""} neste mês`,
      total: category.total,
      accent: "text-expense",
      items: category.items,
    });
  }

  return (
    <div className="mx-auto max-w-7xl p-4 md:p-10">
      <header className="mb-6 animate-reveal">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
          {format(today, "EEEE, d 'de' MMMM", { locale: ptBR })}
        </p>
        <h1 className="mt-1 font-display text-3xl font-semibold text-foreground md:text-4xl">
          Olá{firstName ? `, ${firstName}` : ""}.
        </h1>
      </header>

      <Dialog open={!!detail} onOpenChange={(open) => !open && setDetail(null)}>
        {detail && (
          <DialogContent title={detail.title} className="max-w-lg">
            <BarDetailView detail={detail} />
          </DialogContent>
        )}
      </Dialog>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="animate-reveal [animation-delay:60ms] lg:col-span-2">
          <CardTitle>Saldo total</CardTitle>
          <p className="mt-1 font-display text-5xl font-medium tabular-nums text-foreground md:text-6xl">
            {formatBRL(animatedBalance)}
          </p>

          <div className="mt-6 grid grid-cols-1 gap-5 border-t border-line pt-5 sm:grid-cols-3">
            <MiniStat label="Receitas" value={summary?.income ?? 0} delta={summary?.prevPeriodDelta.income} positive />
            <MiniStat label="Despesas" value={summary?.expense ?? 0} delta={summary?.prevPeriodDelta.expense} />
            <MiniStat label="Saldo do mês" value={summary?.net ?? 0} delta={summary?.prevPeriodDelta.net} positive />
          </div>
        </Card>

        <Card className="animate-reveal [animation-delay:90ms]">
          <CardTitle>Saldo por conta</CardTitle>
          {accounts?.length ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              {accounts.map((account) => {
                // Cartão não tem saldo próprio no modelo: o que importa é o
                // quanto já foi gasto na fatura que ainda vai ser paga.
                const isCard = account.type === "CREDIT_CARD" && account.closingDay;
                const value = isCard ? (account.openInvoiceTotal ?? 0) : account.currentBalance;

                return (
                  <div
                    key={account.id}
                    className="flex items-center justify-between gap-2 rounded-md border border-line px-3.5 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{account.name}</p>
                      <p className="text-[0.65rem] uppercase tracking-wider text-muted-foreground">
                        {isCard ? "Fatura em aberto" : (ACCOUNT_TYPE_LABELS[account.type] ?? account.type)}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 font-mono text-sm font-medium tabular-nums",
                        isCard || value < 0 ? "text-expense" : "text-foreground",
                      )}
                    >
                      {formatBRL(value)}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="mt-4 font-display text-base italic text-muted-foreground">Nenhuma conta cadastrada ainda.</p>
          )}
        </Card>

        <Card className="animate-reveal [animation-delay:105ms]">
          <CardTitle>Evolução do patrimônio — últimos 12 meses</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Seu saldo total ao fim de cada mês, somando todas as contas.
          </p>
          <div className="mt-5 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={balanceHistory ?? []} margin={{ left: 8, right: 8 }}>
                <defs>
                  <linearGradient id="balanceFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.22} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--line))" vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tick={axisTick} />
                <YAxis tickLine={false} axisLine={false} tick={axisTick} tickFormatter={(v) => formatBRL(v)} width={92} />
                <Tooltip cursor={{ stroke: "hsl(var(--line-strong))" }} content={<BalanceTooltip />} />
                <Area
                  type="monotone"
                  dataKey="balance"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#balanceFill)"
                  dot={{ r: 2.5, fill: "hsl(var(--primary))" }}
                  activeDot={{ r: 4 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <div className="lg:col-span-2">
          <AccountFilterBar accounts={accounts} filter={accountFilter} />
        </div>

        <Card className="animate-reveal [animation-delay:120ms]">
          <CardTitle>Receita × despesa — últimos 6 meses</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Passe o mouse para ver o que compõe o valor; clique na barra para ver tudo.
          </p>
          <div className="mt-5 h-64">
            {noneVisible ? (
              <EmptyChart />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={series ?? []} barGap={4}>
                  <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--line))" vertical={false} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tick={axisTick} />
                  <YAxis tickLine={false} axisLine={false} tick={axisTick} tickFormatter={(v) => formatBRL(v)} width={92} />
                  <Tooltip shared={false} cursor={{ fill: "hsl(var(--paper-alt))" }} content={<MonthlyTooltip />} />
                  <Bar
                    dataKey="income"
                    name="Receita"
                    fill="hsl(var(--income))"
                    radius={[3, 3, 0, 0]}
                    maxBarSize={28}
                    className="cursor-pointer"
                    onClick={(entry: { payload?: MonthlyPoint }) => openMonthDetail(entry?.payload, "income")}
                  />
                  <Bar
                    dataKey="expense"
                    name="Despesa"
                    fill="hsl(var(--expense))"
                    radius={[3, 3, 0, 0]}
                    maxBarSize={28}
                    className="cursor-pointer"
                    onClick={(entry: { payload?: MonthlyPoint }) => openMonthDetail(entry?.payload, "expense")}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card className="animate-reveal [animation-delay:180ms]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>Despesas por categoria — este mês</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                Passe o mouse para ver os lançamentos; clique na barra para ver todos.
              </p>
            </div>
            {!!byCategory?.length && (
              <button
                type="button"
                onClick={() =>
                  setDetail({
                    title: "Todas as despesas do mês",
                    subtitle: `${byCategory.length} categoria${byCategory.length > 1 ? "s" : ""}`,
                    total: byCategory.reduce((sum, c) => sum + c.total, 0),
                    accent: "text-expense",
                    items: byCategory.map((c) => ({ label: c.name, amount: c.total })),
                  })
                }
                className="shrink-0 text-xs font-medium text-primary underline decoration-accent decoration-2 underline-offset-2"
              >
                Ver todas
              </button>
            )}
          </div>
          <div className="mt-5 h-64">
            {noneVisible ? (
              <EmptyChart />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byCategory?.slice(0, 6) ?? []} layout="vertical" margin={{ left: 24 }}>
                  <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--line))" horizontal={false} />
                  <XAxis type="number" tickFormatter={(v) => formatBRL(v)} tick={axisTick} axisLine={false} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={112}
                    tick={{ ...axisTick, fontFamily: "var(--font-body)", fontSize: 12, fill: "hsl(var(--foreground))" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip cursor={{ fill: "hsl(var(--paper-alt))" }} content={<CategoryTooltip />} />
                  <Bar
                    dataKey="total"
                    radius={[0, 3, 3, 0]}
                    maxBarSize={20}
                    className="cursor-pointer"
                    onClick={(entry: { payload?: CategoryTotal }) => openCategoryDetail(entry?.payload)}
                  >
                    {(byCategory ?? []).slice(0, 6).map((entry) => (
                      <Cell key={entry.categoryId ?? "none"} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

function BarDetailView({ detail }: { detail: BarDetail }) {
  return (
    <div>
      {detail.subtitle && (
        <p className="text-[0.65rem] uppercase tracking-wider text-muted-foreground">{detail.subtitle}</p>
      )}
      <p className={cn("mt-0.5 font-display text-3xl font-medium tabular-nums", detail.accent)}>
        {formatBRL(detail.total)}
      </p>

      <ul className="mt-4 max-h-[22rem] divide-y divide-line overflow-y-auto border-t border-line">
        {detail.items.map((item, i) => (
          <li key={`${item.label}-${i}`} className="flex items-baseline justify-between gap-3 py-2.5 text-sm">
            <span className="min-w-0 text-foreground">
              <span className="break-words">{item.label}</span>
              {item.date && <span className="ml-2 text-xs text-muted-foreground">{formatDate(item.date, "dd/MM")}</span>}
            </span>
            <span className="shrink-0 font-mono tabular-nums text-foreground">{formatBRL(item.amount)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-full items-center justify-center">
      <p className="font-display text-base italic text-muted-foreground">Selecione ao menos uma conta acima.</p>
    </div>
  );
}

function AccountFilterBar({
  accounts,
  filter,
}: {
  accounts: Account[] | undefined;
  filter: ReturnType<typeof useAccountFilter>;
}) {
  if (!accounts?.length) return null;

  return (
    <div className="animate-reveal [animation-delay:110ms] flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-line-strong px-4 py-3">
      <span className="mr-1 text-[0.65rem] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
        Contas nos gráficos abaixo
      </span>
      {accounts.map((account) => {
        const active = filter.isVisible(account.id);
        return (
          <button
            key={account.id}
            type="button"
            onClick={() => filter.toggle(account.id)}
            aria-pressed={active}
            className={cn(
              "rounded-md border px-3 py-1 text-xs font-medium transition-colors",
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-line-strong bg-transparent text-muted-foreground line-through hover:bg-paper-alt",
            )}
          >
            {account.name}
          </button>
        );
      })}
      {filter.isFiltered && (
        <button
          type="button"
          onClick={filter.showAll}
          className="ml-auto text-xs font-medium text-primary underline decoration-accent decoration-2 underline-offset-2"
        >
          Mostrar todas
        </button>
      )}
    </div>
  );
}

/** Payload que o Recharts entrega para um tooltip customizado. */
interface TooltipPayload<T> {
  active?: boolean;
  payload?: { dataKey?: string | number; payload: T }[];
}

function MonthlyTooltip({ active, payload }: TooltipPayload<MonthlyPoint>) {
  const entry = payload?.[0];
  if (!active || !entry) return null;

  const isIncome = entry.dataKey === "income";
  const point = entry.payload;
  const items = isIncome ? point.incomeBreakdown : point.expenseBreakdown;
  const total = isIncome ? point.income : point.expense;

  return (
    <TooltipShell
      title={isIncome ? "Receitas" : "Despesas"}
      subtitle={point.month}
      total={total}
      accent={isIncome ? "text-income" : "text-expense"}
      items={items}
    />
  );
}

function BalanceTooltip({ active, payload }: TooltipPayload<BalancePoint>) {
  const entry = payload?.[0];
  if (!active || !entry) return null;

  const point = entry.payload;
  const grew = point.delta >= 0;

  return (
    <div className="rounded-md border border-line-strong bg-card p-3 shadow-[3px_3px_0_hsl(var(--ink)/0.12)]">
      <p className="text-[0.65rem] uppercase tracking-wider text-muted-foreground">{point.month}</p>
      <p className="mt-0.5 font-mono text-base font-medium tabular-nums text-foreground">{formatBRL(point.balance)}</p>
      <p className={cn("mt-1 font-mono text-xs tabular-nums", grew ? "text-income" : "text-expense")}>
        {grew ? "+" : "−"}
        {formatBRL(Math.abs(point.delta))} no mês
      </p>
    </div>
  );
}

function CategoryTooltip({ active, payload }: TooltipPayload<CategoryTotal>) {
  const entry = payload?.[0];
  if (!active || !entry) return null;

  const category = entry.payload;

  return (
    <TooltipShell
      title={category.name}
      subtitle={`${Math.round(category.pct * 100)}% das despesas do mês`}
      total={category.total}
      accent="text-expense"
      items={category.items}
    />
  );
}

function TooltipShell({
  title,
  subtitle,
  total,
  accent,
  items,
}: {
  title: string;
  subtitle?: string;
  total: number;
  accent: string;
  items: BreakdownItem[];
}) {
  const shown = items.slice(0, TOOLTIP_LIMIT);
  const hidden = items.length - shown.length;

  return (
    <div className="max-w-[16rem] rounded-md border border-line-strong bg-card p-3 shadow-[3px_3px_0_hsl(var(--ink)/0.12)]">
      <p className="font-display text-sm font-semibold text-foreground">{title}</p>
      {subtitle && <p className="text-[0.65rem] uppercase tracking-wider text-muted-foreground">{subtitle}</p>}
      <p className={cn("mt-1 font-mono text-base font-medium tabular-nums", accent)}>{formatBRL(total)}</p>

      {shown.length > 0 && (
        <ul className="mt-2 space-y-1 border-t border-line pt-2">
          {shown.map((item, i) => (
            <li key={`${item.label}-${i}`} className="flex items-baseline justify-between gap-3 text-xs">
              <span className="truncate text-muted-foreground">
                {item.label}
                {item.date && <span className="ml-1 text-ink-faint">{formatDate(item.date, "dd/MM")}</span>}
              </span>
              <span className="shrink-0 font-mono tabular-nums text-foreground">{formatBRL(item.amount)}</span>
            </li>
          ))}
        </ul>
      )}

      {hidden > 0 && (
        <p className="mt-1.5 text-[0.65rem] text-ink-faint">+ {hidden} — clique na barra para ver tudo</p>
      )}
    </div>
  );
}

function MiniStat({
  label,
  value,
  delta,
  positive,
}: {
  label: string;
  value: number;
  delta?: number;
  positive?: boolean;
}) {
  const isUp = (delta ?? 0) >= 0;
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 font-mono text-xl font-medium tabular-nums text-foreground">{formatBRL(value)}</p>
      {delta !== undefined && (
        <p className={cn("mt-0.5 flex items-center gap-0.5 text-xs", isUp === positive ? "text-income" : "text-expense")}>
          {isUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
          {formatBRL(Math.abs(delta))} vs. mês anterior
        </p>
      )}
    </div>
  );
}
