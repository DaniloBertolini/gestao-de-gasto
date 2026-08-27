import { useState, type ChangeEvent } from "react";
import { formatBRL, toCents } from "@gestao/shared";
import { Input } from "@/components/ui/input";

interface MoneyInputProps {
  value: number; // centavos
  onChange: (cents: number) => void;
  autoFocus?: boolean;
}

export function MoneyInput({ value, onChange, autoFocus }: MoneyInputProps) {
  const [text, setText] = useState(value ? formatBRL(value) : "");

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    setText(e.target.value);
    onChange(toCents(e.target.value));
  }

  function handleBlur() {
    setText(value ? formatBRL(value) : "");
  }

  return (
    <Input
      inputMode="decimal"
      placeholder="R$ 0,00"
      value={text}
      onChange={handleChange}
      onBlur={handleBlur}
      autoFocus={autoFocus}
      className="h-14 font-mono text-2xl font-medium tabular-nums"
    />
  );
}
