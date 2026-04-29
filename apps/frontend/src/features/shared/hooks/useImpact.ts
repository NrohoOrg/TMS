"use client";

import { useQuery } from "@tanstack/react-query";
import { getImpact } from "@/lib/api-services";

export function useImpact(date?: string) {
  return useQuery({
    queryKey: ["impact", date ?? "today"] as const,
    queryFn: () => getImpact(date),
    // Refetch when the dispatcher does something that changes plan state.
    staleTime: 30_000,
  });
}
