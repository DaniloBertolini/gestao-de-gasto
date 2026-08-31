import { createZodDto } from "nestjs-zod";
import { createAccountSchema, updateAccountSchema, payInvoiceSchema } from "@gestao/shared";

export class CreateAccountDto extends createZodDto(createAccountSchema) {}
export class UpdateAccountDto extends createZodDto(updateAccountSchema) {}
export class PayInvoiceDto extends createZodDto(payInvoiceSchema) {}
