"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApi, useAuthReady } from "@/lib/api-context";
import { queryKeys } from "@/lib/queryClient";
import { toast } from "@/components/ui/use-toast";

export function useRoles() {
  const api = useApi();
  const ready = useAuthReady();
  return useQuery({
    queryKey: queryKeys.roles,
    queryFn: () => api.get("/roles").then((r) => r.data),
    enabled: ready,
  });
}

export function useCreateRole() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input) => api.post("/roles", input).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.roles }); toast({ title: "Role created" }); },
    onError: (e) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });
}

export function useUpdateRole() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }) => api.patch(`/roles/${id}`, input).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.roles });
      qc.invalidateQueries({ queryKey: queryKeys.team });
    },
    onError: (e) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });
}

export function useDeleteRole() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.delete(`/roles/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.roles });
      qc.invalidateQueries({ queryKey: queryKeys.team });
      toast({ title: "Role deleted" });
    },
    onError: (e) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });
}
