import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { ArrowRightLeft, Pencil, Plus, Trash2 } from "lucide-react";
import { createTransferSchema, formatBRL, type CreateTransferInput } from "@gestao/shared";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/confirm-provider";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { MoneyInput } from "@/components/money-input";
import { useAccounts } from "@/features/accounts/use-accounts";
import { cn, formatDate, transactionLabel } from "@/lib/utils";
import type { Transaction } from "@/types/domain";
import { TransactionForm } from "./transaction-form";
import { useCreateTransfer, useDeleteTransaction, useTransactions } from "./use-transactions";

export function TransactionsPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useTransactions({ page, perPage: 20, sort: "-date" });
  const deleteTransaction = useDeleteTransaction();
  const confirm = useConfirm();

  async function handleDelete(tx: Transaction) {
    const ok = await confirm({
      title: "Excluir transação?",
      description: `"${transactionLabel(tx)}" será removida. Essa ação não pode ser desfeita.`,
    });
    if (ok) deleteTransaction.mutate(tx.id);
  }

  const [formOpen, setFormOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [transferOpen, setTransferOpen] = useState(false);

  function openCreate() {
    setEditingTx(null);
    setFormOpen(true);
  }

  function openEdit(tx: Transaction) {
    setEditingTx(tx);
    setFormOpen(true);
  }

  const grouped = groupByDate(data?.data ?? []);

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-10">
      <div className="flex items-center justify-between animate-reveal">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Registro</p>
          <h1 className="font-display text-3xl font-semibold text-foreground">Transações</h1>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setTransferOpen(true)}>
            <ArrowRightLeft className="h-4 w-4" /> Transferência
          </Button>
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4" /> Nova
          </Button>
        </div>
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent title={editingTx ? "Editar transação" : "Nova transação"}>
          <TransactionForm transaction={editingTx ?? undefined} onDone={() => setFormOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
        <DialogContent title="Transferência entre contas">
          <TransferForm onDone={() => setTransferOpen(false)} />
        </DialogContent>
      </Dialog>

      {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}

      {!isLoading && !data?.data.length && (
        <p className="rounded-lg border border-dashed border-line-strong py-12 text-center font-display text-base italic text-muted-foreground">
          Nenhuma transação encontrada. Registre sua primeira receita ou despesa.
        </p>
      )}

      <div className="space-y-7">
        {Object.entries(grouped).map(([date, txs], i) => (
          <div key={date} className="animate-reveal" style={{ animationDelay: `${Math.min(i, 6) * 40}ms` }}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {formatDate(date, "dd 'de' MMMM")}
            </p>
            <div className="divide-y divide-line rounded-lg border border-line-strong bg-card shadow-[3px_3px_0_hsl(var(--ink)/0.06)]">
              {txs.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between px-4 py-3.5">
                  <div>
                    <p className="text-sm font-medium text-foreground">{transactionLabel(tx)}</p>
                    <p className="text-xs text-muted-foreground">
                      {tx.category?.name ?? "Sem categoria"} · {tx.account?.name ?? "Sem conta"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <span
                      className={cn(
                        "font-mono text-sm font-medium tabular-nums",
                        tx.type === "INCOME" ? "text-income" : "text-expense",
                      )}
                    >
                      {tx.type === "INCOME" ? "+" : "−"}
                      {formatBRL(tx.amount)}
                    </span>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(tx)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(tx)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {data && data.meta.total > data.meta.perPage && (
        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
            Anterior
          </Button>
          <span className="font-mono text-xs text-muted-foreground">Página {page}</span>
          <Button variant="outline" size="sm" disabled={!data.meta.hasMore} onClick={() => setPage((p) => p + 1)}>
            Próxima
          </Button>
        </div>
      )}
    </div>
  );
}

function TransferForm({ onDone }: { onDone: () => void }) {
  const { data: accounts } = useAccounts();
  const createTransfer = useCreateTransfer();
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateTransferInput>({
    resolver: zodResolver(createTransferSchema),
    defaultValues: { date: format(new Date(), "yyyy-MM-dd"), amount: 0 },
  });

  async function onSubmit(data: CreateTransferInput) {
    try {
      await createTransfer.mutateAsync(data);
      onDone();
    } catch {
      // toast de erro já é exibido globalmente (ver mutationCache em main.tsx)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label>Valor</Label>
        <Controller
          control={control}
          name="amount"
          render={({ field }) => <MoneyInput value={field.value} onChange={field.onChange} autoFocus />}
        />
        {errors.amount && <span className="text-xs text-expense">Informe um valor válido</span>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="fromAccountId">De</Label>
          <Select id="fromAccountId" {...register("fromAccountId")}>
            <option value="">Selecione...</option>
            {accounts?.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </Select>
          {errors.fromAccountId && <span className="text-xs text-expense">Selecione a conta de origem</span>}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="toAccountId">Para</Label>
          <Select id="toAccountId" {...register("toAccountId")}>
            <option value="">Selecione...</option>
            {accounts?.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </Select>
          {errors.toAccountId && <span className="text-xs text-expense">Selecione a conta de destino</span>}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="date">Data</Label>
        <Input id="date" type="date" {...register("date")} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description">Descrição (opcional)</Label>
        <Input id="description" placeholder="Ex: Guardando na caixinha" {...register("description")} />
      </div>

      <Button type="submit" disabled={isSubmitting}>
        Transferir
      </Button>
    </form>
  );
}

function groupByDate<T extends { date: string }>(items: T[]): Record<string, T[]> {
  return items.reduce<Record<string, T[]>>((acc, item) => {
    const key = item.date.slice(0, 10);
    acc[key] ??= [];
    acc[key].push(item);
    return acc;
  }, {});
}
