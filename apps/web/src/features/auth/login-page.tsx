import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router-dom";
import { loginSchema, type LoginInput } from "@gestao/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api";
import { useAuth } from "./auth-context";
import { AuthShell } from "./auth-shell";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(data: LoginInput) {
    setFormError(null);
    try {
      await login(data);
      navigate("/");
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Erro ao entrar");
    }
  }

  return (
    <AuthShell eyebrow="Bem-vindo de volta" title="Entrar" subtitle="Acesse seu livro-caixa pessoal.">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" type="email" autoComplete="email" {...register("email")} />
          {errors.email && <span className="text-xs text-expense">{errors.email.message}</span>}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Senha</Label>
          <Input id="password" type="password" autoComplete="current-password" {...register("password")} />
          {errors.password && <span className="text-xs text-expense">{errors.password.message}</span>}
        </div>
        {formError && <p className="text-sm text-expense">{formError}</p>}
        <Button type="submit" disabled={isSubmitting} className="mt-2">
          Entrar
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Não tem conta?{" "}
        <Link to="/register" className="font-medium text-primary underline decoration-accent decoration-2 underline-offset-4">
          Cadastre-se
        </Link>
      </p>
    </AuthShell>
  );
}
