"use client";
import { useQuery } from "@tanstack/react-query";
import { useApi, useAuthReady } from "@/lib/api-context";
import { queryKeys } from "@/lib/queryClient";

export function useDashboard() {
  const api = useApi();
  const ready = useAuthReady();
  return useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: () => api.get("/dashboard").then((r) => r.data),
    enabled: ready,
  });
}
