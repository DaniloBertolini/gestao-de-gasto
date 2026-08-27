import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { createAccountSchema, formatBRL, type CreateAccountInput } from "@gestao/shared";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/confirm-provider";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { Account } from "@/types/domain";
import { useAccounts, useCreateAccount, useDeleteAccount, useUpdateAccount } from "./use-accounts";

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  CHECKING: "Conta corrente",
  SAVINGS: "Poupança",
  CASH: "Dinheiro",
  CREDIT_CARD: "Cartão de crédito",
  INVESTMENT: "Investimento",
};

export function AccountsPage() {
  const { data: accounts } = useAccounts();

  const [formOpen, setFormOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

  function openCreate() {
    setEditingAccount(null);
    setFormOpen(true);
  }

  function openEdit(account: Account) {
    setEditingAccount(account);
    setFormOpen(true);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-10">
      <div className="flex items-center justify-between animate-reveal">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Carteiras</p>
          <h1 className="font-display text-3xl font-semibold text-foreground">Contas</h1>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4" /> Nova conta
        </Button>
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent title={editingAccount ? "Editar conta" : "Nova conta"}>
          <AccountForm account={editingAccount ?? undefined} onDone={() => setFormOpen(false)} />
        </DialogContent>
      </Dialog>

      {accounts?.length === 0 && (
        <p className="rounded-lg border border-dashed border-line-strong py-12 text-center font-display text-base italic text-muted-foreground">
          Nenhuma conta cadastrada ainda.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {accounts?.map((account, i) => (
          <div key={account.id} className="animate-reveal" style={{ animationDelay: `${Math.min(i, 6) * 50}ms` }}>
            <AccountCard account={account} onEdit={() => openEdit(account)} />
          </div>
        ))}
      </div>
    </div>
  );
}

function AccountCard({ account, onEdit }: { account: Account; onEdit: () => void }) {
  const deleteAccount = useDeleteAccount();
  const confirm = useConfirm();

  async function handleDelete() {
    const ok = await confirm({
      title: "Excluir conta?",
      description: `"${account.name}" será removida. Se houver transações vinculadas, a exclusão será bloqueada.`,
    });
    if (ok) deleteAccount.mutate(account.id);
  }

  const negative = account.currentBalance < 0;

  return (
    <Card className="flex items-center justify-between">
      <div>
        <p className="font-medium text-foreground">{account.name}</p>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">{ACCOUNT_TYPE_LABELS[account.type]}</p>
        <p className={cn("mt-2 font-mono text-xl font-medium tabular-nums", negative ? "text-expense" : "text-foreground")}>
          {formatBRL(account.currentBalance)}
        </p>
      </div>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" onClick={onEdit}>
          <Pencil className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={handleDelete}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}

function AccountForm({ account, onDone }: { account?: Account; onDone: () => void }) {
  const createAccount = useCreateAccount();
  const updateAccount = useUpdateAccount();
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<CreateAccountInput>({
    resolver: zodResolver(createAccountSchema),
    defaultValues: account
      ? { name: account.name, type: account.type, initialBalance: account.initialBalance }
      : { type: "CHECKING", initialBalance: 0 },
  });

  async function onSubmit(data: CreateAccountInput) {
    if (account) {
      await updateAccount.mutateAsync({ id: account.id, input: data });
    } else {
      await createAccount.mutateAsync(data);
    }
    onDone();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Nome</Label>
        <Input id="name" placeholder="Ex: Nubank" {...register("name")} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="type">Tipo</Label>
        <Select id="type" {...register("type")}>
          {Object.entries(ACCOUNT_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </div>
      <Button type="submit" disabled={isSubmitting}>
        {account ? "Salvar alterações" : "Criar conta"}
      </Button>
    </form>
  );
}
