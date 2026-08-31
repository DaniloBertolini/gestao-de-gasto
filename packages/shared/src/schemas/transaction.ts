import { z } from "zod";
import { TX_TYPES } from "../enums";

// Selects de "sem conta"/"sem categoria" no front mandam "" em vez de omitir o
// campo — trata como ausente antes de validar o formato de cuid.
const optionalCuid = z.preprocess((v) => (v === "" ? undefined : v), z.string().cuid().optional());

export const createTransactionSchema = z.object({
  accountId: optionalCuid,
  categoryId: optionalCuid,
  type: z.enum(TX_TYPES),
  amount: z.number().int().positive(),
  date: z.string().date(), // YYYY-MM-DD
  description: z.string().max(140).optional(),
  notes: z.string().max(500).optional(),
  paid: z.boolean().default(true),
  // Se >1, a compra é dividida em N lançamentos (um por fatura futura). Campo
  // numérico vazio no formulário vira NaN via valueAsNumber — trata como ausente.
  installments: z.preprocess(
    (v) => (v === "" || (typeof v === "number" && Number.isNaN(v)) ? undefined : v),
    z.number().int().min(1).max(48).optional(),
  ),
});
export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;

export const updateTransactionSchema = createTransactionSchema.partial();
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;

export const createTransferSchema = z.object({
  fromAccountId: z.string().cuid(),
  toAccountId: z.string().cuid(),
  amount: z.number().int().positive(),
  date: z.string().date(),
  description: z.string().max(140).optional(),
});
export type CreateTransferInput = z.infer<typeof createTransferSchema>;

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
