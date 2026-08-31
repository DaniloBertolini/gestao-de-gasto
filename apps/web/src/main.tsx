import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MutationCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
import { Toaster, toast } from "sonner";
import "./index.css";
import { AuthProvider } from "@/features/auth/auth-context";
import { ConfirmProvider } from "@/components/confirm-provider";
import { ApiError } from "@/lib/api";
import { router } from "./router";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
  mutationCache: new MutationCache({
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : "Não foi possível concluir a ação. Tente novamente.");
    },
  }),
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ConfirmProvider>
          <RouterProvider router={router} />
        </ConfirmProvider>
      </AuthProvider>
      <Toaster richColors position="top-right" />
    </QueryClientProvider>
  </StrictMode>,
);
