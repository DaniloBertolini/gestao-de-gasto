import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import type { CreateAccountInput, UpdateAccountInput } from "@gestao/shared";
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

    return accounts.map((account) => {
      const income = balances.find((b) => b.accountId === account.id && b.type === "INCOME")?._sum.amount ?? 0;
      const expense = balances.find((b) => b.accountId === account.id && b.type === "EXPENSE")?._sum.amount ?? 0;
      return { ...account, currentBalance: account.initialBalance + income - expense };
    });
  }

  async create(userId: string, input: CreateAccountInput) {
    return this.prisma.account.create({ data: { ...input, userId } });
  }

  async update(userId: string, id: string, input: UpdateAccountInput) {
    await this.findOwnedOrThrow(userId, id);
    return this.prisma.account.update({ where: { id }, data: input });
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
}
