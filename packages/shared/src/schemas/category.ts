import { z } from "zod";
import { CATEGORY_KINDS } from "../enums";

export const createCategorySchema = z.object({
  name: z.string().min(1).max(60),
  kind: z.enum(CATEGORY_KINDS),
  icon: z.string().max(40).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  parentId: z.string().cuid().optional(),
});
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

export const updateCategorySchema = createCategorySchema.partial();
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
