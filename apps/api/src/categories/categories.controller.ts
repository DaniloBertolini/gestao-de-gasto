import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import type { CategoryKind } from "@gestao/shared";
import { CurrentUser, type AuthenticatedUser } from "../common/decorators/current-user.decorator";
import { CategoriesService } from "./categories.service";
import { CreateCategoryDto, UpdateCategoryDto } from "./dto/category.dto";

@Controller("categories")
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser, @Query("kind") kind?: CategoryKind) {
    return this.categoriesService.findAll(user.id, kind);
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(user.id, dto);
  }

  @Patch(":id")
  update(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: UpdateCategoryDto) {
    return this.categoriesService.update(user.id, id, dto);
  }

  @Delete(":id")
  remove(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.categoriesService.remove(user.id, id);
  }
}
