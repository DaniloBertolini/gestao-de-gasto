import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CategoryKind, CreateCategoryInput, UpdateCategoryInput } from "@gestao/shared";
import { api } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import type { Category } from "@/types/domain";

export function useCategories(kind?: CategoryKind) {
  return useQuery({
    queryKey: qk.categories(kind),
    queryFn: () => api.get<Category[]>("/categories", kind ? { kind } : undefined),
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCategoryInput) => api.post<Category>("/categories", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["categories"] }),
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateCategoryInput }) =>
      api.patch<Category>(`/categories/${id}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["categories"] }),
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/categories/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["categories"] }),
  });
}
