import { Injectable } from "@nestjs/common";
import type { MonthlySeriesQuery, ReportRangeQuery } from "@gestao/shared";
import { PrismaService } from "../common/prisma/prisma.service";

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

  async byCategory(userId: string, { from, to }: ReportRangeQuery, type: "INCOME" | "EXPENSE") {
    const start = new Date(from);
    const end = addDays(new Date(to), 1);

    const grouped = await this.prisma.transaction.groupBy({
      by: ["categoryId"],
      where: { userId, type, paid: true, deletedAt: null, date: { gte: start, lt: end } },
      _sum: { amount: true },
    });

    const categoryIds = grouped.map((g) => g.categoryId).filter((id): id is string => id !== null);
    const categories = await this.prisma.category.findMany({ where: { id: { in: categoryIds } } });
    const total = grouped.reduce((sum, g) => sum + (g._sum.amount ?? 0), 0);

    return grouped
      .map((g) => {
        const category = categories.find((c) => c.id === g.categoryId);
        const amount = g._sum.amount ?? 0;
        return {
          categoryId: g.categoryId,
          name: category?.name ?? "Sem categoria",
          color: category?.color ?? "#94a3b8",
          total: amount,
          pct: total > 0 ? amount / total : 0,
        };
      })
      .sort((a, b) => b.total - a.total);
  }

  async monthlySeries(userId: string, { months }: MonthlySeriesQuery) {
    const now = new Date();
    const series: { month: string; income: number; expense: number; net: number }[] = [];

    for (let i = months - 1; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const { income, expense } = await this.totalsFor(userId, start, end);
      series.push({
        month: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`,
        income,
        expense,
        net: income - expense,
      });
    }

    return series;
  }

  private async totalsFor(userId: string, start: Date, end: Date) {
    const grouped = await this.prisma.transaction.groupBy({
      by: ["type"],
      where: { userId, paid: true, deletedAt: null, date: { gte: start, lt: end } },
      _sum: { amount: true },
    });

    return {
      income: grouped.find((g) => g.type === "INCOME")?._sum.amount ?? 0,
      expense: grouped.find((g) => g.type === "EXPENSE")?._sum.amount ?? 0,
    };
  }
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}
