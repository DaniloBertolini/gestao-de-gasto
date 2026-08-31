import { randomUUID } from "node:crypto";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import type { CreateTransactionInput, CreateTransferInput, ListTransactionsQuery, UpdateTransactionInput } from "@gestao/shared";
import { PrismaService } from "../common/prisma/prisma.service";

@Injectable()
export class TransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string, query: ListTransactionsQuery) {
    const where: Prisma.TransactionWhereInput = {
      userId,
      deletedAt: null,
      ...(query.accountId ? { accountId: query.accountId } : {}),
      ...(query.categoryId?.length ? { categoryId: { in: query.categoryId } } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.paid !== undefined ? { paid: query.paid } : {}),
      ...(query.search ? { description: { contains: query.search, mode: "insensitive" } } : {}),
      ...(query.from || query.to
        ? {
            date: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lt: addDays(new Date(query.to), 1) } : {}),
            },
          }
        : {}),
    };

    const [sortField, sortDir] = query.sort.startsWith("-")
      ? [query.sort.slice(1), "desc" as const]
      : [query.sort, "asc" as const];

    const [data, total] = await this.prisma.$transaction([
      this.prisma.transaction.findMany({
        where,
        orderBy: { [sortField]: sortDir },
        skip: (query.page - 1) * query.perPage,
        take: query.perPage,
        include: { category: true, account: true },
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page: query.page,
        perPage: query.perPage,
        hasMore: query.page * query.perPage < total,
      },
    };
  }

  async findOne(userId: string, id: string) {
    return this.findOwnedOrThrow(userId, id);
  }

  async create(userId: string, input: CreateTransactionInput) {
    if (input.accountId) await this.assertOwnedAccount(userId, input.accountId);
    if (input.categoryId) await this.assertOwnedCategory(userId, input.categoryId, input.type);

    const { installments, ...rest } = input;
    if (!installments || installments <= 1) {
      return this.prisma.transaction.create({ data: { ...rest, date: new Date(input.date), userId } });
    }

    // Parcelamento: divide o valor em N lançamentos, um por fatura futura (mês a mês).
    const installmentGroupId = randomUUID();
    const base = Math.floor(rest.amount / installments);
    const remainder = rest.amount - base * installments;
    const baseDate = new Date(input.date);

    await this.prisma.transaction.createMany({
      data: Array.from({ length: installments }, (_, i) => ({
        ...rest,
        amount: base + (i === installments - 1 ? remainder : 0),
        date: addMonths(baseDate, i),
        userId,
        installmentGroupId,
        installmentNo: i + 1,
        installmentTotal: installments,
      })),
    });

    return this.prisma.transaction.findMany({
      where: { userId, installmentGroupId },
      orderBy: { installmentNo: "asc" },
      include: { category: true, account: true },
    });
  }

  async update(userId: string, id: string, input: UpdateTransactionInput) {
    const current = await this.findOwnedOrThrow(userId, id);

    if (input.accountId) await this.assertOwnedAccount(userId, input.accountId);
    if (input.categoryId) await this.assertOwnedCategory(userId, input.categoryId, input.type ?? current.type);

    const { installments: _installments, ...rest } = input;

    return this.prisma.transaction.update({
      where: { id },
      data: { ...rest, ...(input.date ? { date: new Date(input.date) } : {}) },
    });
  }

  async remove(userId: string, id: string) {
    const current = await this.findOwnedOrThrow(userId, id);

    // Remove as duas pernas juntas — não faz sentido apagar só metade de uma transferência.
    if (current.transferGroupId) {
      await this.prisma.transaction.updateMany({
        where: { userId, transferGroupId: current.transferGroupId, deletedAt: null },
        data: { deletedAt: new Date() },
      });
      return;
    }

    await this.prisma.transaction.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async createTransfer(userId: string, input: CreateTransferInput) {
    if (input.fromAccountId === input.toAccountId) {
      throw new BadRequestException("Conta de origem e destino devem ser diferentes");
    }
    await this.assertOwnedAccount(userId, input.fromAccountId);
    await this.assertOwnedAccount(userId, input.toAccountId);

    const transferGroupId = randomUUID();
    const date = new Date(input.date);
    const description = input.description || "Transferência";

    await this.prisma.$transaction([
      this.prisma.transaction.create({
        data: { userId, accountId: input.fromAccountId, type: "EXPENSE", amount: input.amount, date, description, paid: true, transferGroupId },
      }),
      this.prisma.transaction.create({
        data: { userId, accountId: input.toAccountId, type: "INCOME", amount: input.amount, date, description, paid: true, transferGroupId },
      }),
    ]);

    return this.prisma.transaction.findMany({
      where: { userId, transferGroupId },
      include: { category: true, account: true },
    });
  }

  private async findOwnedOrThrow(userId: string, id: string) {
    const transaction = await this.prisma.transaction.findFirst({
      where: { id, userId, deletedAt: null },
      include: { category: true, account: true },
    });
    if (!transaction) throw new NotFoundException("Transação não encontrada");
    return transaction;
  }

  private async assertOwnedAccount(userId: string, accountId: string) {
    const account = await this.prisma.account.findFirst({ where: { id: accountId, userId, deletedAt: null } });
    if (!account) throw new NotFoundException("Conta não encontrada");
  }

  private async assertOwnedCategory(userId: string, categoryId: string, type: "INCOME" | "EXPENSE") {
    const category = await this.prisma.category.findFirst({ where: { id: categoryId, userId, deletedAt: null } });
    if (!category) throw new NotFoundException("Categoria não encontrada");
    if (category.kind !== type) throw new BadRequestException("Categoria não corresponde ao tipo da transação");
  }
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}
