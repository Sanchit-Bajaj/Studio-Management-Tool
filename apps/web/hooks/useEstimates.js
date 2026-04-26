"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApi, useAuthReady } from "@/lib/api-context";
import { queryKeys } from "@/lib/queryClient";
import { toast } from "@/components/ui/use-toast";

export function useEstimates() {
  const api = useApi();
  const ready = useAuthReady();
  return useQuery({
    queryKey: queryKeys.estimates,
    queryFn: () => api.get("/estimates").then((r) => r.data),
    enabled: ready,
  });
}

export function useEstimate(id) {
  const api = useApi();
  const ready = useAuthReady();
  return useQuery({
    queryKey: queryKeys.estimate(id),
    queryFn: () => api.get(`/estimates/${id}`).then((r) => r.data),
    enabled: ready && !!id,
  });
}

function invalidate(qc, id) {
  qc.invalidateQueries({ queryKey: queryKeys.estimates });
  if (id) qc.invalidateQueries({ queryKey: queryKeys.estimate(id) });
  qc.invalidateQueries({ queryKey: queryKeys.dashboard });
  qc.invalidateQueries({ queryKey: queryKeys.prospects });
}

export function useCreateEstimate() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input) => api.post("/estimates", input).then((r) => r.data),
    onSuccess: () => { invalidate(qc); toast({ title: "Estimate created" }); },
    onError: (e) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });
}

export function useUpdateEstimate() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }) => api.patch(`/estimates/${id}`, input).then((r) => r.data),
    onSuccess: (_d, vars) => { invalidate(qc, vars.id); },
    onError: (e) => toast({ title: "Failed to update", description: e.message, variant: "destructive" }),
  });
}

export function useSetAllocations() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, allocations }) => api.put(`/estimates/${id}/allocations`, allocations).then((r) => r.data),
    onSuccess: (_d, vars) => { invalidate(qc, vars.id); toast({ title: "Allocations saved" }); },
    onError: (e) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });
}

export function useSetExclusions() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, excludedSoftwareIds, excludedOverheadIds }) =>
      api.put(`/estimates/${id}/exclusions`, { excludedSoftwareIds, excludedOverheadIds }).then((r) => r.data),
    onSuccess: (_d, vars) => { invalidate(qc, vars.id); toast({ title: "Exclusions saved" }); },
    onError: (e) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });
}

export function useDeleteEstimate() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.delete(`/estimates/${id}`),
    onSuccess: () => { invalidate(qc); toast({ title: "Estimate deleted" }); },
    onError: (e) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });
}
