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

  async function onSubmit(data: CreateTransactionInput) {
    const payload = {
      ...data,
      type,
      accountId: data.accountId || undefined,
      categoryId: data.categoryId || undefined,
      description: data.description || undefined,
    };

    if (transaction) {
      await updateTransaction.mutateAsync({ id: transaction.id, input: payload });
    } else {
      await createTransaction.mutateAsync(payload);
    }
    onDone();
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
          <Select id="accountId" {...register("accountId")}>
            <option value="">Sem conta</option>
            {accounts?.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </Select>
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
      </div>

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
