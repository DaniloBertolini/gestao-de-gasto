import { z } from "zod";

// Login é um identificador livre escolhido pela pessoa (não precisa ser e-mail).
const loginField = z.string().trim().min(3).max(40);
// Senha sem regras de complexidade: a pessoa escolhe o que quiser.
const passwordField = z.string().min(1).max(72);

export const registerSchema = z.object({
  name: z.string().min(2).max(80),
  login: loginField,
  password: passwordField,
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  login: loginField,
  password: passwordField,
});
export type LoginInput = z.infer<typeof loginSchema>;

export const changePasswordSchema = z.object({
  currentPassword: passwordField,
  newPassword: passwordField,
});
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
