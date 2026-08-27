import { createBrowserRouter } from "react-router-dom";
import { LoginPage } from "@/features/auth/login-page";
import { RegisterPage } from "@/features/auth/register-page";
import { DashboardPage } from "@/features/dashboard/dashboard-page";
import { TransactionsPage } from "@/features/transactions/transactions-page";
import { AccountsPage } from "@/features/accounts/accounts-page";
import { CategoriesPage } from "@/features/categories/categories-page";
import { AppLayout } from "@/layout/app-layout";
import { ProtectedRoute } from "@/layout/protected-route";

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  { path: "/register", element: <RegisterPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: "/", element: <DashboardPage /> },
          { path: "/transactions", element: <TransactionsPage /> },
          { path: "/accounts", element: <AccountsPage /> },
          { path: "/categories", element: <CategoriesPage /> },
        ],
      },
    ],
  },
]);
