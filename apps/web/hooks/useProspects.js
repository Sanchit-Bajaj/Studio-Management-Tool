"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApi, useAuthReady } from "@/lib/api-context";
import { queryKeys } from "@/lib/queryClient";
import { toast } from "@/components/ui/use-toast";

export function useProspects() {
  const api = useApi();
  const ready = useAuthReady();
  return useQuery({
    queryKey: queryKeys.prospects,
    queryFn: () => api.get("/prospects").then((r) => r.data),
    enabled: ready,
  });
}

export function useProspect(id) {
  const api = useApi();
  const ready = useAuthReady();
  return useQuery({
    queryKey: queryKeys.prospect(id),
    queryFn: () => api.get(`/prospects/${id}`).then((r) => r.data),
    enabled: ready && !!id,
  });
}

function invalidate(qc, id) {
  qc.invalidateQueries({ queryKey: queryKeys.prospects });
  if (id) qc.invalidateQueries({ queryKey: queryKeys.prospect(id) });
  qc.invalidateQueries({ queryKey: queryKeys.dashboard });
}

export function useCreateProspect() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input) => api.post("/prospects", input).then((r) => r.data),
    onSuccess: () => { invalidate(qc); toast({ title: "Prospect created" }); },
    onError: (e) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });
}

export function useUpdateProspect() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }) => api.patch(`/prospects/${id}`, input).then((r) => r.data),
    onSuccess: (data, vars) => { invalidate(qc, vars.id); },
    onError: (e) => toast({ title: "Failed to update", description: e.message, variant: "destructive" }),
  });
}

export function useDeleteProspect() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.delete(`/prospects/${id}`),
    onSuccess: () => { invalidate(qc); toast({ title: "Prospect deleted" }); },
    onError: (e) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });
}
