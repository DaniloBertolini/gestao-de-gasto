import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import type { CreateTransactionInput, ListTransactionsQuery, UpdateTransactionInput } from "@gestao/shared";
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

    return this.prisma.transaction.create({ data: { ...input, date: new Date(input.date), userId } });
  }

  async update(userId: string, id: string, input: UpdateTransactionInput) {
    const current = await this.findOwnedOrThrow(userId, id);

    if (input.accountId) await this.assertOwnedAccount(userId, input.accountId);
    if (input.categoryId) await this.assertOwnedCategory(userId, input.categoryId, input.type ?? current.type);

    return this.prisma.transaction.update({
      where: { id },
      data: { ...input, ...(input.date ? { date: new Date(input.date) } : {}) },
    });
  }

  async remove(userId: string, id: string) {
    await this.findOwnedOrThrow(userId, id);
    await this.prisma.transaction.update({ where: { id }, data: { deletedAt: new Date() } });
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
