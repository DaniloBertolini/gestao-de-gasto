import { Injectable } from "@nestjs/common";
import type { CategoryReportQuery, FlowSeriesQuery, MonthlySeriesQuery, ReportRangeQuery } from "@gestao/shared";
import { PrismaService } from "../common/prisma/prisma.service";

/** Quantos itens detalhados cada tooltip mostra antes de agrupar o resto. */
const BREAKDOWN_LIMIT = 6;

/** Recorte opcional por conta, usado só nos relatórios de fluxo. */
function accountFilter(accountId?: string[]) {
  return accountId?.length ? { accountId: { in: accountId } } : {};
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(userId: string, { from, to }: ReportRangeQuery) {
    const start = new Date(from);
    const end = addDays(new Date(to), 1);
    const periodMs = end.getTime() - start.getTime();
    const prevStart = new Date(start.getTime() - periodMs);
    const prevEnd = start;

    const [current, previous] = await Promise.all([
      this.totalsFor(userId, start, end),
      this.totalsFor(userId, prevStart, prevEnd),
    ]);

    const net = current.income - current.expense;
    const prevNet = previous.income - previous.expense;
    const savingsRate = current.income > 0 ? net / current.income : 0;

    return {
      income: current.income,
      expense: current.expense,
      net,
      savingsRate,
      prevPeriodDelta: { income: current.income - previous.income, expense: current.expense - previous.expense, net: net - prevNet },
    };
  }

  async byCategory(userId: string, { from, to, accountId }: CategoryReportQuery, type: "INCOME" | "EXPENSE") {
    const start = new Date(from);
    const end = addDays(new Date(to), 1);

    // Sem filtro de "paid": uma compra no cartão deve aparecer aqui na data da
    // compra (visão por competência), mesmo antes da fatura ser paga. O saldo
    // real (summary/monthlySeries/saldo de conta) continua olhando só paid=true.
    // isCardPayment=false exclui o lançamento único gerado ao pagar a fatura,
    // já que as compras que o compõem já entraram aqui individualmente.
    // transferGroupId=null exclui transferências entre contas — não são
    // receita/despesa de verdade, só dinheiro mudando de lugar.
    const transactions = await this.prisma.transaction.findMany({
      where: {
        userId,
        type,
        deletedAt: null,
        isCardPayment: false,
        transferGroupId: null,
        date: { gte: start, lt: end },
        ...accountFilter(accountId),
      },
      select: {
        id: true,
        amount: true,
        date: true,
        description: true,
        categoryId: true,
        category: { select: { name: true, color: true } },
      },
      orderBy: { amount: "desc" },
    });

    // Agrupa por categoria em memória (em vez de groupBy) para conseguir, de
    // uma só consulta, o total e os lançamentos que compõem cada barra.
    const buckets = new Map<
      string,
      { categoryId: string | null; name: string; color: string; total: number; items: BreakdownItem[]; itemCount: number }
    >();

    for (const tx of transactions) {
      const key = tx.categoryId ?? "__none__";
      const bucket = buckets.get(key) ?? {
        categoryId: tx.categoryId,
        name: tx.category?.name ?? "Sem categoria",
        color: tx.category?.color ?? "#94a3b8",
        total: 0,
        items: [],
        itemCount: 0,
      };

      bucket.total += tx.amount;
      bucket.itemCount += 1;
      if (bucket.items.length < BREAKDOWN_LIMIT) {
        bucket.items.push({
          label: tx.description || bucket.name,
          amount: tx.amount,
          date: toDateOnly(tx.date),
        });
      }
      buckets.set(key, bucket);
    }

    const total = [...buckets.values()].reduce((sum, b) => sum + b.total, 0);

    return [...buckets.values()]
      .map((b) => ({ ...b, pct: total > 0 ? b.total / total : 0 }))
      .sort((a, b) => b.total - a.total);
  }

  async monthlySeries(userId: string, { months, accountId }: FlowSeriesQuery) {
    const now = new Date();
    // Limites em UTC: as datas são armazenadas como data pura (meia-noite UTC),
    // então usar o fuso local do servidor jogaria lançamentos no mês errado.
    const firstMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1), 1));
    const afterLastMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

    const transactions = await this.prisma.transaction.findMany({
      where: {
        userId,
        paid: true,
        deletedAt: null,
        transferGroupId: null,
        date: { gte: firstMonth, lt: afterLastMonth },
        ...accountFilter(accountId),
      },
      select: { type: true, amount: true, category: { select: { name: true } }, date: true },
    });

    const series = Array.from({ length: months }, (_, i) => {
      const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1 - i), 1));
      return {
        month: `${monthStart.getUTCFullYear()}-${String(monthStart.getUTCMonth() + 1).padStart(2, "0")}`,
        income: 0,
        expense: 0,
        net: 0,
        incomeBreakdown: [] as BreakdownItem[],
        expenseBreakdown: [] as BreakdownItem[],
      };
    });

    const byMonth = new Map(series.map((point) => [point.month, point]));
    // Acumula por (mês, tipo, categoria) para montar a composição de cada barra.
    const categoryTotals = new Map<string, number>();

    for (const tx of transactions) {
      const monthKey = `${tx.date.getUTCFullYear()}-${String(tx.date.getUTCMonth() + 1).padStart(2, "0")}`;
      const point = byMonth.get(monthKey);
      if (!point) continue;

      if (tx.type === "INCOME") point.income += tx.amount;
      else point.expense += tx.amount;

      const categoryKey = `${monthKey}|${tx.type}|${tx.category?.name ?? "Sem categoria"}`;
      categoryTotals.set(categoryKey, (categoryTotals.get(categoryKey) ?? 0) + tx.amount);
    }

    for (const [key, amount] of categoryTotals) {
      const [monthKey, type, name] = key.split("|");
      const point = byMonth.get(monthKey);
      if (!point) continue;
      const target = type === "INCOME" ? point.incomeBreakdown : point.expenseBreakdown;
      target.push({ label: name, amount });
    }

    for (const point of series) {
      point.net = point.income - point.expense;
      point.incomeBreakdown = topItems(point.incomeBreakdown);
      point.expenseBreakdown = topItems(point.expenseBreakdown);
    }

    return series;
  }

  /**
   * Saldo total acumulado ao fim de cada mês. Usa a mesma regra do card
   * "Saldo total" (contas não arquivadas/excluídas + lançamentos pagos), então
   * o último ponto da série bate exatamente com o saldo exibido hoje.
   */
  async balanceHistory(userId: string, { months }: MonthlySeriesQuery) {
    const now = new Date();
    const firstMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1), 1));
    const afterLastMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

    const accountScope = { account: { deletedAt: null, archivedAt: null } };

    const [accounts, beforeRange, inRange] = await Promise.all([
      this.prisma.account.findMany({
        where: { userId, deletedAt: null, archivedAt: null },
        select: { initialBalance: true },
      }),
      // Tudo que já aconteceu antes da janela vira o saldo de partida.
      this.prisma.transaction.groupBy({
        by: ["type"],
        where: { userId, paid: true, deletedAt: null, date: { lt: firstMonth }, ...accountScope },
        _sum: { amount: true },
      }),
      this.prisma.transaction.findMany({
        where: { userId, paid: true, deletedAt: null, date: { gte: firstMonth, lt: afterLastMonth }, ...accountScope },
        select: { type: true, amount: true, date: true },
      }),
    ]);

    let running = accounts.reduce((sum, a) => sum + a.initialBalance, 0);
    running += beforeRange.find((g) => g.type === "INCOME")?._sum.amount ?? 0;
    running -= beforeRange.find((g) => g.type === "EXPENSE")?._sum.amount ?? 0;

    // Variação líquida de cada mês da janela, para ir somando ao saldo inicial.
    const deltaByMonth = new Map<string, number>();
    for (const tx of inRange) {
      const key = monthKey(tx.date);
      const signed = tx.type === "INCOME" ? tx.amount : -tx.amount;
      deltaByMonth.set(key, (deltaByMonth.get(key) ?? 0) + signed);
    }

    return Array.from({ length: months }, (_, i) => {
      const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1 - i), 1));
      const key = monthKey(monthStart);
      const delta = deltaByMonth.get(key) ?? 0;
      running += delta;
      return { month: key, balance: running, delta };
    });
  }

  /**
   * Compara o gasto de cada categoria no mês atual com a média dos meses
   * anteriores, destacando o que fugiu do padrão.
   */
  async categoryAnomalies(userId: string, { months, accountId }: FlowSeriesQuery) {
    const now = new Date();
    const currentMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const historyStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - months, 1));
    const nextMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

    const transactions = await this.prisma.transaction.findMany({
      where: {
        userId,
        type: "EXPENSE",
        deletedAt: null,
        isCardPayment: false,
        transferGroupId: null,
        date: { gte: historyStart, lt: nextMonthStart },
        ...accountFilter(accountId),
      },
      select: { amount: true, date: true, categoryId: true, category: { select: { name: true, color: true } } },
    });

    const stats = new Map<
      string,
      { categoryId: string | null; name: string; color: string; current: number; past: number }
    >();

    for (const tx of transactions) {
      const key = tx.categoryId ?? "__none__";
      const entry = stats.get(key) ?? {
        categoryId: tx.categoryId,
        name: tx.category?.name ?? "Sem categoria",
        color: tx.category?.color ?? "#94a3b8",
        current: 0,
        past: 0,
      };

      if (tx.date >= currentMonthStart) entry.current += tx.amount;
      else entry.past += tx.amount;

      stats.set(key, entry);
    }

    return [...stats.values()]
      .map((entry) => {
        // Divide pela janela inteira: mês sem gasto na categoria conta como zero.
        const average = Math.round(entry.past / months);
        return {
          categoryId: entry.categoryId,
          name: entry.name,
          color: entry.color,
          current: entry.current,
          average,
          diff: entry.current - average,
          deltaPct: average > 0 ? (entry.current - average) / average : null,
        };
      })
      // Sem histórico não há "normal" para comparar; ignora variação irrelevante.
      .filter((entry) => entry.average > 0 && Math.abs(entry.deltaPct ?? 0) >= 0.15)
      .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))
      .slice(0, 5);
  }

  private async totalsFor(userId: string, start: Date, end: Date) {
    const grouped = await this.prisma.transaction.groupBy({
      by: ["type"],
      where: { userId, paid: true, deletedAt: null, transferGroupId: null, date: { gte: start, lt: end } },
      _sum: { amount: true },
    });

    return {
      income: grouped.find((g) => g.type === "INCOME")?._sum.amount ?? 0,
      expense: grouped.find((g) => g.type === "EXPENSE")?._sum.amount ?? 0,
    };
  }
}

export interface BreakdownItem {
  label: string;
  amount: number;
  date?: string;
}

/** Maiores itens primeiro; o excedente vira uma linha "Outros". */
function topItems(items: BreakdownItem[]): BreakdownItem[] {
  const sorted = [...items].sort((a, b) => b.amount - a.amount);
  if (sorted.length <= BREAKDOWN_LIMIT) return sorted;

  const top = sorted.slice(0, BREAKDOWN_LIMIT);
  const rest = sorted.slice(BREAKDOWN_LIMIT).reduce((sum, item) => sum + item.amount, 0);
  return [...top, { label: `Outros (${sorted.length - BREAKDOWN_LIMIT})`, amount: rest }];
}

function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}
