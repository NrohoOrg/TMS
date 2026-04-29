"use client";

import { QueryClient } from "@tanstack/react-query";

let _client: QueryClient | null = null;

export function getQueryClient(): QueryClient {
  if (!_client) {
    _client = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 60_000,
          gcTime: 5 * 60_000,
          retry: (failureCount, error) => {
            const message = error instanceof Error ? error.message : "";
            if (message.includes("Session expired")) return false;
            return failureCount < 2;
          },
          refetchOnWindowFocus: false,
        },
        mutations: {
          retry: 0,
        },
      },
    });
  }
  return _client;
}
