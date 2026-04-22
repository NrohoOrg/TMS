"use client";

import { useQuery } from "@tanstack/react-query";
import { getReports } from "@/lib/api-services";

export function useReports(params?: {
  period?: "1d" | "7d" | "30d";
  startDate?: string;
  endDate?: string;
}) {
  return useQuery({
    queryKey: ["reports", params ?? {}],
    queryFn: () => getReports(params),
  });
}
