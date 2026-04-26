"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApi, useAuthReady } from "@/lib/api-context";
import { queryKeys } from "@/lib/queryClient";
import { toast } from "@/components/ui/use-toast";

export function useTeam() {
  const api = useApi();
  const ready = useAuthReady();
  return useQuery({
    queryKey: queryKeys.team,
    queryFn: () => api.get("/team").then((r) => r.data),
    enabled: ready,
  });
}

function invalidateAll(qc) {
  qc.invalidateQueries({ queryKey: queryKeys.team });
  qc.invalidateQueries({ queryKey: queryKeys.dashboard });
  qc.invalidateQueries({ queryKey: queryKeys.software });
}

export function useCreateMember() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input) => api.post("/team", input).then((r) => r.data),
    onSuccess: () => { invalidateAll(qc); toast({ title: "Member added" }); },
    onError: (e) => toast({ title: "Failed to add member", description: e.message, variant: "destructive" }),
  });
}

export function useUpdateMember() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }) => api.patch(`/team/${id}`, input).then((r) => r.data),
    onSuccess: () => { invalidateAll(qc); toast({ title: "Member updated" }); },
    onError: (e) => toast({ title: "Failed to update", description: e.message, variant: "destructive" }),
  });
}

export function useDeleteMember() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.delete(`/team/${id}`),
    onSuccess: () => { invalidateAll(qc); toast({ title: "Member removed" }); },
    onError: (e) => toast({ title: "Failed to remove", description: e.message, variant: "destructive" }),
  });
}
