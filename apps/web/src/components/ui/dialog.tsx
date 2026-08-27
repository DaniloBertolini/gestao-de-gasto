import * as RadixDialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Dialog = RadixDialog.Root;
export const DialogTrigger = RadixDialog.Trigger;

export function DialogContent({
  className,
  children,
  title,
}: {
  className?: string;
  children: React.ReactNode;
  title: string;
}) {
  return (
    <RadixDialog.Portal>
      <RadixDialog.Overlay className="fixed inset-0 z-50 bg-[hsl(var(--ink)/0.5)] backdrop-blur-[2px] data-[state=open]:animate-reveal" />
      <RadixDialog.Content
        className={cn(
          "fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-line-strong bg-card p-6 shadow-[5px_5px_0_hsl(var(--ink)/0.18)] data-[state=open]:animate-reveal",
          className,
        )}
      >
        <div className="mb-5 flex items-center justify-between border-b border-line pb-3">
          <RadixDialog.Title className="font-display text-lg font-semibold text-foreground">
            {title}
          </RadixDialog.Title>
          <RadixDialog.Close className="rounded-md p-1 text-muted-foreground hover:bg-paper-alt hover:text-foreground">
            <X className="h-4 w-4" />
          </RadixDialog.Close>
        </div>
        {children}
      </RadixDialog.Content>
    </RadixDialog.Portal>
  );
}
