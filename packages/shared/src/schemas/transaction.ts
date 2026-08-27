import { z } from "zod";
import { TX_TYPES } from "../enums";

export const createTransactionSchema = z.object({
  accountId: z.string().cuid().optional(),
  categoryId: z.string().cuid().optional(),
  type: z.enum(TX_TYPES),
  amount: z.number().int().positive(),
  date: z.string().date(), // YYYY-MM-DD
  description: z.string().max(140).optional(),
  notes: z.string().max(500).optional(),
  paid: z.boolean().default(true),
});
export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;

export const updateTransactionSchema = createTransactionSchema.partial();
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;

export const listTransactionsQuerySchema = z.object({
  from: z.string().date().optional(),
  to: z.string().date().optional(),
  accountId: z.string().cuid().optional(),
  categoryId: z.array(z.string().cuid()).optional(),
  type: z.enum(TX_TYPES).optional(),
  search: z.string().min(2).max(80).optional(),
  paid: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(50),
  sort: z.enum(["date", "-date", "amount", "-amount"]).default("-date"),
});
export type ListTransactionsQuery = z.infer<typeof listTransactionsQuerySchema>;
