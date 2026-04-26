"use client";
import { useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ApiProvider } from "@/lib/api-context";
import { makeQueryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";

export default function Providers({ children }) {
  const [queryClient] = useState(makeQueryClient);
  return (
    <QueryClientProvider client={queryClient}>
      <ApiProvider>
        {children}
        <Toaster />
        {process.env.NODE_ENV === "development" && <ReactQueryDevtools initialIsOpen={false} />}
      </ApiProvider>
    </QueryClientProvider>
  );
}
