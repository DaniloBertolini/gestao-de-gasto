import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { CreditCard, Pencil, Plus, Trash2 } from "lucide-react";
import { createAccountSchema, formatBRL, type CreateAccountInput } from "@gestao/shared";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/confirm-provider";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { cn, transactionLabel } from "@/lib/utils";
import type { Account } from "@/types/domain";
import {
  useAccountInvoice,
  useAccounts,
  useCreateAccount,
  useDeleteAccount,
  usePayInvoice,
  useUpdateAccount,
} from "./use-accounts";

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
  const [invoiceAccount, setInvoiceAccount] = useState<Account | null>(null);

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

      <Dialog open={!!invoiceAccount} onOpenChange={(open) => !open && setInvoiceAccount(null)}>
        {invoiceAccount && (
          <DialogContent title={`Fatura — ${invoiceAccount.name}`} className="max-w-lg">
            <InvoiceView account={invoiceAccount} onPaid={() => setInvoiceAccount(null)} />
          </DialogContent>
        )}
      </Dialog>

      {accounts?.length === 0 && (
        <p className="rounded-lg border border-dashed border-line-strong py-12 text-center font-display text-base italic text-muted-foreground">
          Nenhuma conta cadastrada ainda.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {accounts?.map((account, i) => (
          <div key={account.id} className="animate-reveal" style={{ animationDelay: `${Math.min(i, 6) * 50}ms` }}>
            <AccountCard account={account} onEdit={() => openEdit(account)} onViewInvoice={() => setInvoiceAccount(account)} />
          </div>
        ))}
      </div>
    </div>
  );
}

function AccountCard({
  account,
  onEdit,
  onViewInvoice,
}: {
  account: Account;
  onEdit: () => void;
  onViewInvoice: () => void;
}) {
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
  const isCreditCard = account.type === "CREDIT_CARD";

  return (
    <Card className="flex items-center justify-between">
      <div>
        <p className="font-medium text-foreground">{account.name}</p>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">{ACCOUNT_TYPE_LABELS[account.type]}</p>
        <p className={cn("mt-2 font-mono text-xl font-medium tabular-nums", negative ? "text-expense" : "text-foreground")}>
          {formatBRL(account.currentBalance)}
        </p>
        {isCreditCard && (
          <button
            onClick={onViewInvoice}
            className="mt-2 flex items-center gap-1 text-xs font-medium text-primary underline decoration-accent decoration-2 underline-offset-2"
          >
            <CreditCard className="h-3 w-3" /> Ver fatura
          </button>
        )}
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

function InvoiceView({ account, onPaid }: { account: Account; onPaid: () => void }) {
  const { data: invoice, isLoading } = useAccountInvoice(account.id);
  const { data: accounts } = useAccounts();
  const payInvoice = usePayInvoice(account.id);
  const confirm = useConfirm();
  const [payFromAccountId, setPayFromAccountId] = useState("");

  const payableAccounts = accounts?.filter((a) => a.id !== account.id && a.type !== "CREDIT_CARD") ?? [];

  if (!account.closingDay) {
    return (
      <p className="text-sm text-muted-foreground">
        Defina o dia de fechamento dessa conta (editando-a) para acompanhar a fatura.
      </p>
    );
  }

  if (isLoading || !invoice) {
    return <p className="text-sm text-muted-foreground">Carregando...</p>;
  }

  async function handlePay() {
    if (!payFromAccountId) return;
    const ok = await confirm({
      title: "Pagar fatura?",
      description: `Será criado um lançamento de ${formatBRL(invoice!.total)} na conta escolhida, e as compras dessa fatura serão marcadas como quitadas.`,
      confirmLabel: "Pagar",
    });
    if (ok) {
      await payInvoice.mutateAsync({ payFromAccountId });
      onPaid();
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between rounded-md border border-line-strong bg-paper-alt/60 p-3 text-sm">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Período</p>
          <p className="font-medium text-foreground">
            {format(new Date(invoice.periodStart), "dd/MM")} – {format(new Date(invoice.periodEnd), "dd/MM")}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Vencimento</p>
          <p className="font-medium text-foreground">{format(new Date(invoice.dueDate), "dd/MM")}</p>
        </div>
      </div>

      <div>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Total da fatura</p>
        <p className="font-display text-3xl font-medium tabular-nums text-foreground">{formatBRL(invoice.total)}</p>
      </div>

      <div className="max-h-56 divide-y divide-line overflow-y-auto rounded-md border border-line">
        {invoice.transactions.length ? (
          invoice.transactions.map((tx) => (
            <div key={tx.id} className="flex items-center justify-between px-3 py-2 text-sm">
              <div>
                <p className="text-foreground">{transactionLabel(tx)}</p>
                <p className="text-xs text-muted-foreground">
                  {tx.category?.name ?? "Sem categoria"} · {format(new Date(tx.date), "dd/MM")}
                </p>
              </div>
              <span className="font-mono text-sm tabular-nums text-expense">{formatBRL(tx.amount)}</span>
            </div>
          ))
        ) : (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">Nenhum gasto nessa fatura ainda.</p>
        )}
      </div>

      {invoice.transactions.length > 0 && (
        <div className="flex flex-col gap-2 border-t border-line pt-4">
          <Label htmlFor="payFrom">Pagar com qual conta?</Label>
          <Select id="payFrom" value={payFromAccountId} onChange={(e) => setPayFromAccountId(e.target.value)}>
            <option value="">Selecione...</option>
            {payableAccounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
          <Button onClick={handlePay} disabled={!payFromAccountId || payInvoice.isPending}>
            Pagar fatura
          </Button>
        </div>
      )}
    </div>
  );
}

function AccountForm({ account, onDone }: { account?: Account; onDone: () => void }) {
  const createAccount = useCreateAccount();
  const updateAccount = useUpdateAccount();
  const {
    register,
    handleSubmit,
    watch,
    formState: { isSubmitting },
  } = useForm<CreateAccountInput>({
    resolver: zodResolver(createAccountSchema),
    defaultValues: account
      ? {
          name: account.name,
          type: account.type,
          initialBalance: account.initialBalance,
          closingDay: account.closingDay ?? undefined,
          dueDay: account.dueDay ?? undefined,
        }
      : { type: "CHECKING", initialBalance: 0 },
  });

  const isCreditCard = watch("type") === "CREDIT_CARD";

  async function onSubmit(data: CreateAccountInput) {
    try {
      if (account) {
        await updateAccount.mutateAsync({ id: account.id, input: data });
      } else {
        await createAccount.mutateAsync(data);
      }
      onDone();
    } catch {
      // toast de erro já é exibido globalmente (ver mutationCache em main.tsx)
    }
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
      {isCreditCard && (
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="closingDay">Dia de fechamento</Label>
            <Input id="closingDay" type="number" min={1} max={31} placeholder="Ex: 25" {...register("closingDay")} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="dueDay">Dia de vencimento</Label>
            <Input id="dueDay" type="number" min={1} max={31} placeholder="Ex: 5" {...register("dueDay")} />
          </div>
        </div>
      )}
      <Button type="submit" disabled={isSubmitting}>
        {account ? "Salvar alterações" : "Criar conta"}
      </Button>
    </form>
  );
}
