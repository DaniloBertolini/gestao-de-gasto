import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { createTransactionSchema, type CreateTransactionInput, type TxType } from "@gestao/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { MoneyInput } from "@/components/money-input";
import { cn } from "@/lib/utils";
import { useAccounts } from "@/features/accounts/use-accounts";
import { useCategories } from "@/features/categories/use-categories";
import type { Transaction } from "@/types/domain";
import { useCreateTransaction, useUpdateTransaction } from "./use-transactions";

export function TransactionForm({ transaction, onDone }: { transaction?: Transaction; onDone: () => void }) {
  const [type, setType] = useState<TxType>(transaction?.type ?? "EXPENSE");
  const { data: accounts } = useAccounts();
  const { data: categories } = useCategories(type);
  const createTransaction = useCreateTransaction();
  const updateTransaction = useUpdateTransaction();

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateTransactionInput>({
    resolver: zodResolver(createTransactionSchema),
    defaultValues: transaction
      ? {
          type: transaction.type,
          amount: transaction.amount,
          date: transaction.date.slice(0, 10),
          description: transaction.description ?? "",
          accountId: transaction.accountId ?? "",
          categoryId: transaction.categoryId ?? "",
          paid: transaction.paid,
        }
      : {
          type,
          amount: 0,
          date: format(new Date(), "yyyy-MM-dd"),
          paid: true,
          accountId: "",
          categoryId: "",
        },
  });

  const selectedAccount = accounts?.find((a) => a.id === watch("accountId"));
  const isCreditCard = selectedAccount?.type === "CREDIT_CARD";

  function handleAccountChange(accountId: string) {
    setValue("accountId", accountId);
    if (!transaction) {
      const account = accounts?.find((a) => a.id === accountId);
      setValue("paid", account?.type !== "CREDIT_CARD");
    }
  }

  async function onSubmit(data: CreateTransactionInput) {
    const payload = {
      ...data,
      type,
      accountId: data.accountId || undefined,
      categoryId: data.categoryId || undefined,
      description: data.description || undefined,
    };

    try {
      if (transaction) {
        await updateTransaction.mutateAsync({ id: transaction.id, input: payload });
      } else {
        await createTransaction.mutateAsync(payload);
      }
      onDone();
    } catch {
      // toast de erro já é exibido globalmente (ver mutationCache em main.tsx)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="flex gap-2">
        <TypeTab active={type === "EXPENSE"} onClick={() => setType("EXPENSE")} label="Despesa" />
        <TypeTab active={type === "INCOME"} onClick={() => setType("INCOME")} label="Receita" />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Valor</Label>
        <Controller
          control={control}
          name="amount"
          render={({ field }) => <MoneyInput value={field.value} onChange={field.onChange} autoFocus />}
        />
        {errors.amount && <span className="text-xs text-expense">Informe um valor válido</span>}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description">Descrição (opcional)</Label>
        <Input id="description" placeholder="Ex: Almoço" {...register("description")} />
        {errors.description && <span className="text-xs text-expense">{errors.description.message}</span>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="date">Data</Label>
          <Input id="date" type="date" {...register("date")} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="accountId">Conta (opcional)</Label>
          <Select id="accountId" value={watch("accountId") ?? ""} onChange={(e) => handleAccountChange(e.target.value)}>
            <option value="">Sem conta</option>
            {accounts?.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </Select>
          {errors.accountId && <span className="text-xs text-expense">{errors.accountId.message}</span>}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="categoryId">Categoria</Label>
        <Select id="categoryId" {...register("categoryId")}>
          <option value="">Sem categoria</option>
          {categories?.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </Select>
        {errors.categoryId && <span className="text-xs text-expense">{errors.categoryId.message}</span>}
      </div>

      {type === "EXPENSE" && (
        <label className="flex cursor-pointer items-start gap-2.5 rounded-md border border-line-strong p-3 text-sm">
          <input type="checkbox" className="mt-0.5 h-4 w-4" {...register("paid")} />
          <span>
            <span className="block font-medium text-foreground">Já saiu do saldo</span>
            <span className="block text-xs text-muted-foreground">
              {isCreditCard
                ? "Desmarcado: a compra entra nos relatórios por categoria, mas só vai afetar seu saldo quando você lançar o pagamento da fatura."
                : "Desmarque para compras no cartão de crédito — elas contam na categoria certa, mas só saem do seu saldo quando a fatura for paga."}
            </span>
          </span>
        </label>
      )}

      {type === "EXPENSE" && isCreditCard && !transaction && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="installments">Parcelar em quantas vezes?</Label>
          <Input
            id="installments"
            type="number"
            min={1}
            max={48}
            placeholder="1"
            {...register("installments", { valueAsNumber: true })}
          />
          <span className="text-xs text-muted-foreground">
            Deixe em 1 (ou vazio) para compra à vista. Cada parcela cai numa fatura futura.
          </span>
          {errors.installments && <span className="text-xs text-expense">{errors.installments.message}</span>}
        </div>
      )}

      <Button type="submit" disabled={isSubmitting}>
        Salvar
      </Button>
    </form>
  );
}

function TypeTab({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex-1 rounded-md border py-2 text-xs font-semibold uppercase tracking-wider transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-line-strong bg-transparent text-muted-foreground hover:bg-paper-alt",
      )}
    >
      {label}
    </button>
  );
}
