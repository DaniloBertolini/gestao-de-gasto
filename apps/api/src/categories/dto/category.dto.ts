import { createZodDto } from "nestjs-zod";
import { createCategorySchema, updateCategorySchema } from "@gestao/shared";

export class CreateCategoryDto extends createZodDto(createCategorySchema) {}
export class UpdateCategoryDto extends createZodDto(updateCategorySchema) {}
