"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApi, useAuthReady } from "@/lib/api-context";
import { queryKeys } from "@/lib/queryClient";
import { toast } from "@/components/ui/use-toast";

export function useOverheads() {
  const api = useApi();
  const ready = useAuthReady();
  return useQuery({
    queryKey: queryKeys.overheads,
    queryFn: () => api.get("/overheads").then((r) => r.data),
    enabled: ready,
  });
}

function invalidate(qc) {
  qc.invalidateQueries({ queryKey: queryKeys.overheads });
  qc.invalidateQueries({ queryKey: queryKeys.dashboard });
}

export function useCreateOverhead() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input) => api.post("/overheads", input).then((r) => r.data),
    onSuccess: () => { invalidate(qc); toast({ title: "Overhead added" }); },
    onError: (e) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });
}

export function useUpdateOverhead() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }) => api.patch(`/overheads/${id}`, input).then((r) => r.data),
    onSuccess: () => { invalidate(qc); toast({ title: "Overhead updated" }); },
    onError: (e) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });
}

export function useStopOverhead() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, date }) => api.patch(`/overheads/${id}/stop`, { date }).then((r) => r.data),
    onSuccess: () => { invalidate(qc); toast({ title: "Overhead stopped" }); },
  });
}

export function useResumeOverhead() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.patch(`/overheads/${id}/resume`).then((r) => r.data),
    onSuccess: () => { invalidate(qc); toast({ title: "Overhead resumed" }); },
  });
}

export function useDeleteOverhead() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.delete(`/overheads/${id}`),
    onSuccess: () => { invalidate(qc); toast({ title: "Overhead deleted" }); },
  });
}
