"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApi, useAuthReady } from "@/lib/api-context";
import { queryKeys } from "@/lib/queryClient";
import { toast } from "@/components/ui/use-toast";

export function useSoftware() {
  const api = useApi();
  const ready = useAuthReady();
  return useQuery({
    queryKey: queryKeys.software,
    queryFn: () => api.get("/software").then((r) => r.data),
    enabled: ready,
  });
}

function invalidate(qc) {
  qc.invalidateQueries({ queryKey: queryKeys.software });
  qc.invalidateQueries({ queryKey: queryKeys.dashboard });
}

export function useCreateSoftware() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input) => api.post("/software", input).then((r) => r.data),
    onSuccess: () => { invalidate(qc); toast({ title: "Software added" }); },
    onError: (e) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });
}

export function useUpdateSoftware() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }) => api.patch(`/software/${id}`, input).then((r) => r.data),
    onSuccess: () => { invalidate(qc); toast({ title: "Software updated" }); },
    onError: (e) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });
}

export function useSetSoftwareAssignments() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, memberIds }) => api.put(`/software/${id}/assignments`, memberIds).then((r) => r.data),
    onSuccess: () => { invalidate(qc); toast({ title: "Assignments updated" }); },
    onError: (e) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });
}

export function useDeleteSoftware() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.delete(`/software/${id}`),
    onSuccess: () => { invalidate(qc); toast({ title: "Software removed" }); },
    onError: (e) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });
}
