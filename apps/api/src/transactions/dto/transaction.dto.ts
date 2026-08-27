import { createZodDto } from "nestjs-zod";
import { createTransactionSchema, listTransactionsQuerySchema, updateTransactionSchema } from "@gestao/shared";

export class CreateTransactionDto extends createZodDto(createTransactionSchema) {}
export class UpdateTransactionDto extends createZodDto(updateTransactionSchema) {}
export class ListTransactionsQueryDto extends createZodDto(listTransactionsQuerySchema) {}
