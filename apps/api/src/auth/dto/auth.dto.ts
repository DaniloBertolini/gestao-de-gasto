import { createZodDto } from "nestjs-zod";
import { changePasswordSchema, loginSchema, registerSchema } from "@gestao/shared";

export class RegisterDto extends createZodDto(registerSchema) {}
export class LoginDto extends createZodDto(loginSchema) {}
export class ChangePasswordDto extends createZodDto(changePasswordSchema) {}
