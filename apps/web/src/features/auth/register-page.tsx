import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router-dom";
import { registerSchema, type RegisterInput } from "@gestao/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api";
import { useAuth } from "./auth-context";
import { AuthShell } from "./auth-shell";

export function RegisterPage() {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });

  async function onSubmit(data: RegisterInput) {
    setFormError(null);
    try {
      await registerUser(data);
      navigate("/");
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Erro ao cadastrar");
    }
  }

  return (
    <AuthShell eyebrow="Comece agora" title="Criar conta" subtitle="Abra seu livro-caixa em menos de um minuto.">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name">Nome</Label>
          <Input id="name" autoComplete="name" {...register("name")} />
          {errors.name && <span className="text-xs text-expense">{errors.name.message}</span>}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" type="email" autoComplete="email" {...register("email")} />
          {errors.email && <span className="text-xs text-expense">{errors.email.message}</span>}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Senha</Label>
          <Input id="password" type="password" autoComplete="new-password" {...register("password")} />
          {errors.password && <span className="text-xs text-expense">{errors.password.message}</span>}
        </div>
        {formError && <p className="text-sm text-expense">{formError}</p>}
        <Button type="submit" disabled={isSubmitting} className="mt-2">
          Criar conta
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Já tem conta?{" "}
        <Link to="/login" className="font-medium text-primary underline decoration-accent decoration-2 underline-offset-4">
          Entrar
        </Link>
      </p>
    </AuthShell>
  );
}
