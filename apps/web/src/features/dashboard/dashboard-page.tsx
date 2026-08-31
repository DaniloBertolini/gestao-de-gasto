import { endOfMonth, format, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatBRL } from "@gestao/shared";
import { Card, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/features/auth/auth-context";
import { useAccounts } from "@/features/accounts/use-accounts";
import { useTransactions } from "@/features/transactions/use-transactions";
import { useCountUp } from "@/hooks/use-count-up";
import { cn, formatDate, transactionLabel } from "@/lib/utils";
import { useMonthlySeries, useReportByCategory, useReportSummary } from "./use-reports";

const today = new Date();
const from = format(startOfMonth(today), "yyyy-MM-dd");
const to = format(endOfMonth(today), "yyyy-MM-dd");

const axisTick = { fill: "hsl(var(--ink-faint))", fontSize: 11, fontFamily: "var(--font-mono)" };
const tooltipStyle = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--line-strong))",
  borderRadius: 6,
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  boxShadow: "3px 3px 0 hsl(var(--ink) / 0.12)",
};

export function DashboardPage() {
  const { user } = useAuth();
  const { data: accounts } = useAccounts();
  const { data: summary } = useReportSummary(from, to);
  const { data: series } = useMonthlySeries(6);
  const { data: byCategory } = useReportByCategory(from, to, "EXPENSE");
  const { data: recent } = useTransactions({ page: 1, perPage: 8, sort: "-date" });

  const totalBalance = accounts?.reduce((sum, a) => sum + a.currentBalance, 0) ?? 0;
  const animatedBalance = useCountUp(totalBalance);
  const firstName = user?.name?.split(" ")[0];

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-4 md:p-10">
      <header className="mb-2 animate-reveal">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
          {format(today, "EEEE, d 'de' MMMM", { locale: ptBR })}
        </p>
        <h1 className="mt-1 font-display text-3xl font-semibold text-foreground md:text-4xl">
          Olá{firstName ? `, ${firstName}` : ""}.
        </h1>
      </header>

      <Card className="animate-reveal [animation-delay:60ms]">
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

      <Card className="animate-reveal [animation-delay:120ms]">
        <CardTitle>Receita × despesa — últimos 6 meses</CardTitle>
        <div className="mt-5 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={series ?? []} barGap={4}>
              <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--line))" vertical={false} />
              <XAxis dataKey="month" tickLine={false} axisLine={false} tick={axisTick} />
              <YAxis tickLine={false} axisLine={false} tick={axisTick} tickFormatter={(v) => formatBRL(v)} width={92} />
              <Tooltip formatter={(v: number) => formatBRL(v)} contentStyle={tooltipStyle} cursor={{ fill: "hsl(var(--paper-alt))" }} />
              <Bar dataKey="income" name="Receita" fill="hsl(var(--income))" radius={[3, 3, 0, 0]} maxBarSize={28} />
              <Bar dataKey="expense" name="Despesa" fill="hsl(var(--expense))" radius={[3, 3, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="animate-reveal [animation-delay:180ms]">
        <CardTitle>Despesas por categoria — este mês</CardTitle>
        <div className="mt-5 h-64">
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
              <Tooltip formatter={(v: number) => formatBRL(v)} contentStyle={tooltipStyle} cursor={{ fill: "hsl(var(--paper-alt))" }} />
              <Bar dataKey="total" radius={[0, 3, 3, 0]} maxBarSize={20}>
                {(byCategory ?? []).slice(0, 6).map((entry) => (
                  <Cell key={entry.categoryId ?? "none"} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="animate-reveal [animation-delay:240ms] pb-2">
        <CardTitle>Últimos lançamentos</CardTitle>
        <div className="mt-3 divide-y divide-line">
          {recent?.data.length ? (
            recent.data.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{transactionLabel(tx)}</p>
                  <p className="text-xs text-muted-foreground">
                    {tx.category?.name ?? "Sem categoria"} · {formatDate(tx.date, "dd/MM")}
                  </p>
                </div>
                <span
                  className={cn(
                    "font-mono text-sm font-medium tabular-nums",
                    tx.type === "INCOME" ? "text-income" : "text-expense",
                  )}
                >
                  {tx.type === "INCOME" ? "+" : "−"}
                  {formatBRL(tx.amount)}
                </span>
              </div>
            ))
          ) : (
            <p className="py-8 text-center font-display text-base italic text-muted-foreground">
              Nenhum lançamento ainda. Registre sua primeira receita ou despesa.
            </p>
          )}
        </div>
      </Card>
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
