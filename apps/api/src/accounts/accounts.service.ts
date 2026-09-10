import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { CreateAccountInput, PayInvoiceInput, UpdateAccountInput } from "@gestao/shared";
import { PrismaService } from "../common/prisma/prisma.service";

@Injectable()
export class AccountsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string, includeArchived: boolean) {
    const accounts = await this.prisma.account.findMany({
      where: {
        userId,
        deletedAt: null,
        ...(includeArchived ? {} : { archivedAt: null }),
      },
      orderBy: { createdAt: "asc" },
    });

    const balances = await this.prisma.transaction.groupBy({
      by: ["accountId", "type"],
      where: { userId, paid: true, deletedAt: null },
      _sum: { amount: true },
    });

    // Cartões: o saldo é sempre zero por construção (compras ficam "não pagas"
    // e quem debita é o pagamento da fatura na conta corrente). O número útil
    // ali é o total da fatura em aberto, calculado abaixo.
    const now = new Date();
    const cards = accounts
      .filter((account) => account.type === "CREDIT_CARD" && account.closingDay)
      .map((account) => ({ account, period: invoicePeriod(account.closingDay!, now) }));

    // Uma única consulta cobrindo a janela de todos os cartões de uma vez.
    const openCardTransactions = cards.length
      ? await this.prisma.transaction.findMany({
          where: {
            userId,
            accountId: { in: cards.map((c) => c.account.id) },
            paid: false,
            settledInPaymentId: null,
            deletedAt: null,
            date: {
              gte: new Date(Math.min(...cards.map((c) => c.period.start.getTime()))),
              lte: new Date(Math.max(...cards.map((c) => c.period.end.getTime()))),
            },
          },
          select: { accountId: true, amount: true, type: true, date: true },
        })
      : [];

    return accounts.map((account) => {
      const income = balances.find((b) => b.accountId === account.id && b.type === "INCOME")?._sum.amount ?? 0;
      const expense = balances.find((b) => b.accountId === account.id && b.type === "EXPENSE")?._sum.amount ?? 0;
      const card = cards.find((c) => c.account.id === account.id);

      return {
        ...account,
        currentBalance: account.initialBalance + income - expense,
        openInvoiceTotal: card
          ? openCardTransactions
              .filter((tx) => tx.accountId === account.id && tx.date >= card.period.start && tx.date <= card.period.end)
              .reduce((sum, tx) => sum + (tx.type === "EXPENSE" ? tx.amount : -tx.amount), 0)
          : null,
        openInvoiceDueDate: card ? invoiceDueDate(account.closingDay!, account.dueDay, card.period.end) : null,
      };
    });
  }

  async create(userId: string, input: CreateAccountInput) {
    try {
      return await this.prisma.account.create({ data: { ...input, userId } });
    } catch (error) {
      throw this.toFriendlyError(error);
    }
  }

  async update(userId: string, id: string, input: UpdateAccountInput) {
    await this.findOwnedOrThrow(userId, id);
    try {
      return await this.prisma.account.update({ where: { id }, data: input });
    } catch (error) {
      throw this.toFriendlyError(error);
    }
  }

  private toFriendlyError(error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return new ConflictException("Já existe uma conta com esse nome");
    }
    return error;
  }

  async remove(userId: string, id: string, force: boolean) {
    await this.findOwnedOrThrow(userId, id);

    if (!force) {
      const txCount = await this.prisma.transaction.count({ where: { accountId: id, deletedAt: null } });
      if (txCount > 0) {
        throw new ConflictException("Conta possui transações. Use force=true para excluir mesmo assim.");
      }
    }

    await this.prisma.account.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  private async findOwnedOrThrow(userId: string, id: string) {
    const account = await this.prisma.account.findFirst({ where: { id, userId, deletedAt: null } });
    if (!account) throw new NotFoundException("Conta não encontrada");
    return account;
  }

  async getInvoice(userId: string, accountId: string) {
    const account = await this.findOwnedOrThrow(userId, accountId);
    if (account.type !== "CREDIT_CARD") throw new BadRequestException("Conta não é um cartão de crédito");
    if (!account.closingDay) throw new BadRequestException("Defina o dia de fechamento do cartão primeiro");

    const { start, end } = invoicePeriod(account.closingDay, new Date());
    const dueDate = invoiceDueDate(account.closingDay, account.dueDay, end);

    const transactions = await this.prisma.transaction.findMany({
      where: {
        userId,
        accountId,
        paid: false,
        settledInPaymentId: null,
        deletedAt: null,
        date: { gte: start, lte: end },
      },
      orderBy: { date: "asc" },
      include: { category: true },
    });

    const total = transactions.reduce((sum, t) => sum + (t.type === "EXPENSE" ? t.amount : -t.amount), 0);

    return { periodStart: start, periodEnd: end, dueDate, total, transactions };
  }

  async payInvoice(userId: string, accountId: string, input: PayInvoiceInput) {
    const account = await this.findOwnedOrThrow(userId, accountId);
    if (account.type !== "CREDIT_CARD") throw new BadRequestException("Conta não é um cartão de crédito");
    if (!account.closingDay) throw new BadRequestException("Defina o dia de fechamento do cartão primeiro");
    await this.findOwnedOrThrow(userId, input.payFromAccountId);

    const { start, end } = invoicePeriod(account.closingDay, new Date());

    const pending = await this.prisma.transaction.findMany({
      where: { userId, accountId, paid: false, settledInPaymentId: null, deletedAt: null, date: { gte: start, lte: end } },
    });

    const total = pending.reduce((sum, t) => sum + (t.type === "EXPENSE" ? t.amount : -t.amount), 0);
    if (pending.length === 0 || total <= 0) {
      throw new ConflictException("Não há gastos pendentes nessa fatura");
    }

    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.transaction.create({
        data: {
          userId,
          accountId: input.payFromAccountId,
          type: "EXPENSE",
          amount: total,
          date: input.date ? new Date(input.date) : new Date(),
          description: `Fatura ${account.name}`,
          paid: true,
          isCardPayment: true,
        },
      });

      await tx.transaction.updateMany({
        where: { id: { in: pending.map((p) => p.id) } },
        data: { settledInPaymentId: payment.id },
      });

      return payment;
    });
  }
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Data em UTC limitada ao último dia do mês, para que "dia 31" em um mês de 30
 * dias signifique o fim do mês — e não transborde para o mês seguinte.
 * As datas são puras (sem hora) em UTC, igual ao que o banco armazena.
 */
function clampedDay(year: number, month: number, day: number): Date {
  const lastDayOfMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, Math.min(day, lastDayOfMonth)));
}

/** Período da fatura em aberto na data de referência, dado o dia de fechamento do cartão. */
function invoicePeriod(closingDay: number, reference: Date): { start: Date; end: Date } {
  const today = new Date(
    Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth(), reference.getUTCDate()),
  );
  const closingThisMonth = clampedDay(today.getUTCFullYear(), today.getUTCMonth(), closingDay);

  // Compras feitas no próprio dia do fechamento entram nessa fatura; a partir
  // do dia seguinte, a fatura em aberto passa a ser a que fecha no mês que vem.
  const end =
    today > closingThisMonth
      ? clampedDay(today.getUTCFullYear(), today.getUTCMonth() + 1, closingDay)
      : closingThisMonth;

  // O período começa no dia seguinte ao fechamento anterior (em vez de
  // "closingDay + 1", que estoura em meses curtos).
  const previousClosing = clampedDay(end.getUTCFullYear(), end.getUTCMonth() - 1, closingDay);
  return { start: new Date(previousClosing.getTime() + DAY_MS), end };
}

/** Vencimento da fatura: mês seguinte ao fechamento quando o dia de vencimento é <= dia de fechamento. */
function invoiceDueDate(closingDay: number, dueDay: number | null, periodEnd: Date): Date {
  if (!dueDay) return periodEnd;
  const monthOffset = dueDay <= closingDay ? 1 : 0;
  return clampedDay(periodEnd.getUTCFullYear(), periodEnd.getUTCMonth() + monthOffset, dueDay);
}
