import { z } from "zod";
import { ACCOUNT_TYPES } from "../enums";

export const createAccountSchema = z.object({
  name: z.string().min(1).max(60),
  type: z.enum(ACCOUNT_TYPES),
  initialBalance: z.number().int().default(0),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});
export type CreateAccountInput = z.infer<typeof createAccountSchema>;

export const updateAccountSchema = createAccountSchema.partial();
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;
