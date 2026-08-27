import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { createCategorySchema, type CategoryKind, type CreateCategoryInput } from "@gestao/shared";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/confirm-provider";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { Category } from "@/types/domain";
import { useCategories, useCreateCategory, useDeleteCategory, useUpdateCategory } from "./use-categories";

export function CategoriesPage() {
  const [kind, setKind] = useState<CategoryKind>("EXPENSE");
  const { data: categories } = useCategories(kind);
  const deleteCategory = useDeleteCategory();
  const confirm = useConfirm();

  const [formOpen, setFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  function openCreate() {
    setEditingCategory(null);
    setFormOpen(true);
  }

  function openEdit(category: Category) {
    setEditingCategory(category);
    setFormOpen(true);
  }

  async function handleDelete(category: Category) {
    const ok = await confirm({
      title: "Excluir categoria?",
      description: `"${category.name}" será removida. Transações que usam essa categoria ficarão sem categoria.`,
    });
    if (ok) deleteCategory.mutate(category.id);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 md:p-10">
      <div className="flex items-center justify-between animate-reveal">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Classificação</p>
          <h1 className="font-display text-3xl font-semibold text-foreground">Categorias</h1>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4" /> Nova
        </Button>
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent title={editingCategory ? "Editar categoria" : "Nova categoria"}>
          <CategoryForm kind={kind} category={editingCategory ?? undefined} onDone={() => setFormOpen(false)} />
        </DialogContent>
      </Dialog>

      <div className="flex gap-2 animate-reveal [animation-delay:60ms]">
        <TabButton active={kind === "EXPENSE"} onClick={() => setKind("EXPENSE")}>
          Despesas
        </TabButton>
        <TabButton active={kind === "INCOME"} onClick={() => setKind("INCOME")}>
          Receitas
        </TabButton>
      </div>

      <ul className="divide-y divide-line rounded-lg border border-line-strong bg-card shadow-[3px_3px_0_hsl(var(--ink)/0.06)] animate-reveal [animation-delay:120ms]">
        {categories?.map((category) => (
          <li key={category.id} className="flex items-center justify-between px-4 py-3.5">
            <div className="flex items-center gap-3 text-sm text-foreground">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: category.color ?? "#94a3b8", boxShadow: `0 0 0 3px ${category.color ?? "#94a3b8"}22` }}
              />
              {category.name}
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={() => openEdit(category)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => handleDelete(category)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </li>
        ))}
        {!categories?.length && (
          <li className="px-4 py-10 text-center font-display text-base italic text-muted-foreground">
            Nenhuma categoria ainda.
          </li>
        )}
      </ul>
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-md border px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-line-strong bg-transparent text-muted-foreground hover:bg-paper-alt",
      )}
    >
      {children}
    </button>
  );
}

function CategoryForm({
  kind,
  category,
  onDone,
}: {
  kind: CategoryKind;
  category?: Category;
  onDone: () => void;
}) {
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<CreateCategoryInput>({
    resolver: zodResolver(createCategorySchema),
    defaultValues: category
      ? { name: category.name, kind: category.kind, color: category.color ?? "#1b4d3a" }
      : { kind, color: "#1b4d3a" },
  });

  async function onSubmit(data: CreateCategoryInput) {
    if (category) {
      await updateCategory.mutateAsync({ id: category.id, input: data });
    } else {
      await createCategory.mutateAsync({ ...data, kind });
    }
    onDone();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Nome</Label>
        <Input id="name" placeholder="Ex: Mercado" {...register("name")} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="color">Cor</Label>
        <Input id="color" type="color" className="h-10 w-full cursor-pointer p-1" {...register("color")} />
      </div>
      <Button type="submit" disabled={isSubmitting}>
        {category ? "Salvar alterações" : "Criar categoria"}
      </Button>
    </form>
  );
}
