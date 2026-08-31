import { z } from "zod";
import { ACCOUNT_TYPES } from "../enums";

// "" vindo de campos numéricos opcionais deixados em branco no formulário vira "sem valor".
const optionalDay = z.preprocess(
  (v) => (v === "" || v === null ? undefined : v),
  z.coerce.number().int().min(1).max(31).optional(),
);

export const createAccountSchema = z.object({
  name: z.string().min(1).max(60),
  type: z.enum(ACCOUNT_TYPES),
  initialBalance: z.number().int().default(0),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  // Só fazem sentido para type = CREDIT_CARD; usados para calcular o período da fatura.
  closingDay: optionalDay,
  dueDay: optionalDay,
});
export type CreateAccountInput = z.infer<typeof createAccountSchema>;

export const updateAccountSchema = createAccountSchema.partial();
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;

export const payInvoiceSchema = z.object({
  payFromAccountId: z.string().cuid(),
  date: z.string().date().optional(),
});
export type PayInvoiceInput = z.infer<typeof payInvoiceSchema>;
