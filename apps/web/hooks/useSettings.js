"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApi, useAuthReady } from "@/lib/api-context";
import { queryKeys } from "@/lib/queryClient";
import { toast } from "@/components/ui/use-toast";

export function useSettings() {
  const api = useApi();
  const ready = useAuthReady();
  return useQuery({
    queryKey: queryKeys.settings,
    queryFn: () => api.get("/settings").then((r) => r.data),
    enabled: ready,
  });
}

export function useUpdateSettings() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch) => api.patch("/settings", patch).then((r) => r.data),
    onSuccess: (data) => {
      qc.setQueryData(queryKeys.settings, (prev) => ({ ...(prev || {}), ...data }));
      qc.invalidateQueries({ queryKey: queryKeys.dashboard });
      toast({ title: "Settings saved" });
    },
    onError: (err) => toast({ title: "Failed to save", description: err.message, variant: "destructive" }),
  });
}
