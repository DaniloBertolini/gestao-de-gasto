import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type { CategoryKind, CreateCategoryInput, UpdateCategoryInput } from "@gestao/shared";
import { PrismaService } from "../common/prisma/prisma.service";

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string, kind?: CategoryKind) {
    return this.prisma.category.findMany({
      where: { userId, deletedAt: null, parentId: null, ...(kind ? { kind } : {}) },
      include: { children: { where: { deletedAt: null } } },
      orderBy: { name: "asc" },
    });
  }

  async create(userId: string, input: CreateCategoryInput) {
    if (input.parentId) await this.assertOwnedParent(userId, input.parentId, input.kind);
    return this.prisma.category.create({ data: { ...input, userId } });
  }

  async update(userId: string, id: string, input: UpdateCategoryInput) {
    const category = await this.findOwnedOrThrow(userId, id);
    if (input.parentId) await this.assertOwnedParent(userId, input.parentId, input.kind ?? category.kind);
    return this.prisma.category.update({ where: { id }, data: input });
  }

  async remove(userId: string, id: string) {
    await this.findOwnedOrThrow(userId, id);
    await this.prisma.$transaction([
      this.prisma.transaction.updateMany({ where: { categoryId: id, userId }, data: { categoryId: null } }),
      this.prisma.category.update({ where: { id }, data: { deletedAt: new Date() } }),
    ]);
  }

  private async findOwnedOrThrow(userId: string, id: string) {
    const category = await this.prisma.category.findFirst({ where: { id, userId, deletedAt: null } });
    if (!category) throw new NotFoundException("Categoria não encontrada");
    return category;
  }

  private async assertOwnedParent(userId: string, parentId: string, kind: CategoryKind) {
    const parent = await this.prisma.category.findFirst({ where: { id: parentId, userId, deletedAt: null } });
    if (!parent) throw new NotFoundException("Categoria pai não encontrada");
    if (parent.parentId) throw new BadRequestException("Só é permitido um nível de subcategoria");
    if (parent.kind !== kind) throw new BadRequestException("Subcategoria deve ter o mesmo tipo da categoria pai");
  }
}
