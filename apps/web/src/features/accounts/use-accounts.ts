import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateAccountInput, UpdateAccountInput } from "@gestao/shared";
import { api } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import type { Account } from "@/types/domain";

export function useAccounts(includeArchived = false) {
  return useQuery({
    queryKey: qk.accounts(includeArchived),
    queryFn: () => api.get<Account[]>("/accounts", { includeArchived }),
  });
}

export function useCreateAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAccountInput) => api.post<Account>("/accounts", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["accounts"] }),
  });
}

export function useUpdateAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateAccountInput }) =>
      api.patch<Account>(`/accounts/${id}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["accounts"] }),
  });
}

export function useDeleteAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/accounts/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["accounts"] }),
  });
}
