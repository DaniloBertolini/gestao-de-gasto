import { NavLink, Outlet } from "react-router-dom";
import { LayoutDashboard, List, Wallet, Tags, LogOut } from "lucide-react";
import { useAuth } from "@/features/auth/auth-context";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { to: "/", label: "Início", num: "01", icon: LayoutDashboard },
  { to: "/transactions", label: "Transações", num: "02", icon: List },
  { to: "/accounts", label: "Contas", num: "03", icon: Wallet },
  { to: "/categories", label: "Categorias", num: "04", icon: Tags },
];

export function AppLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="hidden w-64 flex-col border-r border-line bg-paper-alt/60 p-6 md:flex">
        <div className="mb-10">
          <p className="font-display text-2xl font-semibold leading-none text-foreground">Patrimônio</p>
          <p className="mt-1.5 text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">
            livro-caixa pessoal
          </p>
        </div>

        <nav className="flex flex-1 flex-col">
          {NAV_ITEMS.map((item) => (
            <NavItem key={item.to} {...item} />
          ))}
        </nav>

        <div className="border-t border-line pt-4 text-sm">
          <div className="truncate font-medium text-foreground">{user?.name}</div>
          <button
            onClick={logout}
            className="mt-2 flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground hover:text-expense"
          >
            <LogOut className="h-3.5 w-3.5" /> Sair
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-card/95 backdrop-blur md:hidden">
        {NAV_ITEMS.map((item) => (
          <NavItem key={item.to} {...item} mobile />
        ))}
      </nav>
    </div>
  );
}

function NavItem({
  to,
  label,
  num,
  icon: Icon,
  mobile,
}: {
  to: string;
  label: string;
  num: string;
  icon: typeof LayoutDashboard;
  mobile?: boolean;
}) {
  return (
    <NavLink
      to={to}
      end={to === "/"}
      className={({ isActive }) =>
        cn(
          mobile
            ? "flex flex-1 flex-col items-center gap-1 py-2.5 text-[0.65rem]"
            : "group relative flex items-center gap-3 border-l-2 py-2.5 pl-3 text-sm",
          mobile
            ? isActive
              ? "text-primary"
              : "text-muted-foreground"
            : isActive
              ? "border-accent font-medium text-foreground"
              : "border-transparent text-muted-foreground hover:border-line-strong hover:text-foreground",
        )
      }
    >
      {mobile ? (
        <Icon className="h-5 w-5" />
      ) : (
        <span className="font-mono text-[0.65rem] tabular-nums text-ink-faint group-hover:text-muted-foreground">
          {num}
        </span>
      )}
      {label}
    </NavLink>
  );
}
