"use client";
import * as React from "react";
import { useSession } from "next-auth/react";
import { createApiClient } from "./api";

const ApiContext = React.createContext(null);

export function ApiProvider({ children }) {
  const { data: session, status } = useSession();
  const client = React.useMemo(
    () => createApiClient(() => Promise.resolve(session?.apiToken ?? null)),
    [session?.apiToken],
  );
  return (
    <ApiContext.Provider value={{ api: client, isAuthReady: status !== "loading" }}>
      {children}
    </ApiContext.Provider>
  );
}

export function useApi() {
  const ctx = React.useContext(ApiContext);
  if (!ctx) throw new Error("useApi must be used inside <ApiProvider>");
  return ctx.api;
}

export function useAuthReady() {
  const ctx = React.useContext(ApiContext);
  return ctx?.isAuthReady ?? false;
}
