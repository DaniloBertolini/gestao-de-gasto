import { clsx, type ClassValue } from "clsx";
import { format, type FormatOptions } from "date-fns";
import { ptBR } from "date-fns/locale";
import { twMerge } from "tailwind-merge";
import type { Transaction } from "@/types/domain";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Datas da API são datas puras (sem hora), serializadas como UTC. Fazer
 * `new Date(str)` e formatar direto no fuso do navegador pode voltar um dia
 * (ex: "2026-08-01" vira "31 de julho" em fusos negativos como o do Brasil).
 * Constrói a data a partir dos componentes Y/M/D, ignorando fuso.
 */
export function formatDate(dateStr: string, pattern: string, options?: FormatOptions) {
  const [year, month, day] = dateStr.slice(0, 10).split("-").map(Number);
  return format(new Date(year, month - 1, day), pattern, { locale: ptBR, ...options });
}

/** Descrição pode ser omitida; nesse caso usa a categoria como rótulo principal. */
export function transactionLabel(tx: Pick<Transaction, "description" | "category" | "installmentNo" | "installmentTotal">) {
  const base = tx.description || tx.category?.name || "Sem descrição";
  if (tx.installmentNo && tx.installmentTotal && tx.installmentTotal > 1) {
    return `${base} (${tx.installmentNo}/${tx.installmentTotal})`;
  }
  return base;
}
