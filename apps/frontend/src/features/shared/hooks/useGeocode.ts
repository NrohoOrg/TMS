"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { geocodeSearch } from "@/lib/api-services";

function useDebounced<T>(value: T, delayMs = 400): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

export function useGeocode(query: string, options?: { enabled?: boolean; minLength?: number }) {
  const minLength = options?.minLength ?? 3;
  const debouncedQuery = useDebounced(query, 400);
  const enabled = (options?.enabled ?? true) && debouncedQuery.length >= minLength;
  return useQuery({
    queryKey: ["geocode", debouncedQuery],
    queryFn: () => geocodeSearch(debouncedQuery, 8),
    enabled,
    staleTime: 5 * 60_000,
  });
}
