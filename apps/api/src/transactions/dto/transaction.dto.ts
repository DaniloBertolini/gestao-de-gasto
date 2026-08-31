import { createZodDto } from "nestjs-zod";
import {
  createTransactionSchema,
  createTransferSchema,
  listTransactionsQuerySchema,
  updateTransactionSchema,
} from "@gestao/shared";

export class CreateTransactionDto extends createZodDto(createTransactionSchema) {}
export class UpdateTransactionDto extends createZodDto(updateTransactionSchema) {}
export class ListTransactionsQueryDto extends createZodDto(listTransactionsQuerySchema) {}
export class CreateTransferDto extends createZodDto(createTransferSchema) {}
