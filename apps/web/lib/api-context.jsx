"use client";
import * as React from "react";
import { useAuth } from "@clerk/nextjs";
import { createApiClient } from "./api";

const ApiContext = React.createContext(null);

export function ApiProvider({ children }) {
  const { getToken, isLoaded } = useAuth();
  const client = React.useMemo(
    () => createApiClient(() => getToken({ template: undefined })),
    [getToken],
  );
  return (
    <ApiContext.Provider value={{ api: client, isAuthReady: isLoaded }}>
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
