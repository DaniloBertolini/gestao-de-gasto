import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Transaction } from "@/types/domain";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Descrição pode ser omitida; nesse caso usa a categoria como rótulo principal. */
export function transactionLabel(tx: Pick<Transaction, "description" | "category">) {
  return tx.description || tx.category?.name || "Sem descrição";
}
