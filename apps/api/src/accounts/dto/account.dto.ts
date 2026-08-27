import { createZodDto } from "nestjs-zod";
import { createAccountSchema, updateAccountSchema } from "@gestao/shared";

export class CreateAccountDto extends createZodDto(createAccountSchema) {}
export class UpdateAccountDto extends createZodDto(updateAccountSchema) {}
