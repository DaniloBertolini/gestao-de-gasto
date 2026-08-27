import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant = "default" | "outline" | "ghost" | "destructive";
type Size = "default" | "sm" | "icon";

const variantClasses: Record<Variant, string> = {
  default:
    "bg-primary text-primary-foreground shadow-[2px_2px_0_hsl(var(--ink)/0.18)] hover:shadow-[3px_3px_0_hsl(var(--ink)/0.22)] hover:-translate-y-px active:translate-y-0 active:shadow-[1px_1px_0_hsl(var(--ink)/0.18)]",
  outline:
    "border border-line-strong bg-transparent text-foreground hover:bg-paper-alt",
  ghost: "bg-transparent text-muted-foreground hover:bg-paper-alt hover:text-foreground",
  destructive:
    "bg-expense text-primary-foreground shadow-[2px_2px_0_hsl(var(--ink)/0.18)] hover:shadow-[3px_3px_0_hsl(var(--ink)/0.22)] hover:-translate-y-px active:translate-y-0",
};

const sizeClasses: Record<Size, string> = {
  default: "h-10 px-4 py-2 text-sm",
  sm: "h-8 px-3 text-xs",
  icon: "h-9 w-9",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md font-medium uppercase tracking-wide transition-all duration-150 disabled:pointer-events-none disabled:opacity-40",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = "Button";
