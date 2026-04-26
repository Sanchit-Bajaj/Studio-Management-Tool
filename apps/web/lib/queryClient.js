import { QueryClient } from "@tanstack/react-query";

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        retry: (count, err) => {
          if (err?.status === 401 || err?.status === 403 || err?.status === 404) return false;
          return count < 2;
        },
      },
      mutations: { retry: 0 },
    },
  });
}

export const queryKeys = {
  settings: ["settings"],
  team: ["team"],
  roles: ["roles"],
  software: ["software"],
  overheads: ["overheads"],
  prospects: ["prospects"],
  prospect: (id) => ["prospects", id],
  estimates: ["estimates"],
  estimate: (id) => ["estimates", id],
  dashboard: ["dashboard"],
};
