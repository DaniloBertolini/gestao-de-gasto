import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/features/auth/auth-context";

export function ProtectedRoute() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Carregando...</div>;
  }

  if (!user) return <Navigate to="/login" replace />;

  return <Outlet />;
}
