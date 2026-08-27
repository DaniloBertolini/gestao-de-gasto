import type { ReactNode } from "react";

export function AuthShell({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <aside className="relative hidden w-[42%] flex-col justify-between overflow-hidden bg-primary p-10 text-primary-foreground md:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: "repeating-linear-gradient(180deg, currentColor 0px, transparent 1px, transparent 34px)",
          }}
        />
        <p className="relative font-display text-2xl font-semibold">Patrimônio</p>
        <blockquote className="relative">
          <p className="font-display text-4xl font-light italic leading-[1.15]">
            “Quem controla os centavos, controla os milhares.”
          </p>
          <p className="mt-4 text-xs uppercase tracking-[0.2em] text-primary-foreground/60">
            ditado popular, adaptado
          </p>
        </blockquote>
        <p className="relative text-xs uppercase tracking-[0.2em] text-primary-foreground/50">
          gestão de ganhos &amp; gastos
        </p>
      </aside>

      <main className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-sm animate-reveal">
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-accent">{eyebrow}</p>
          <h1 className="font-display text-3xl font-semibold text-foreground">{title}</h1>
          <p className="mt-1.5 mb-8 text-sm text-muted-foreground">{subtitle}</p>
          {children}
        </div>
      </main>
    </div>
  );
}
