"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getAvailability, patchAvailability } from "@/lib/api-services";

export function useAvailability(date?: string) {
  return useQuery({
    queryKey: ["availability", date ?? "today"],
    queryFn: () => getAvailability({ date }),
  });
}

export function useUpdateAvailability() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      driverId: string;
      data: {
        date: string;
        available?: boolean;
        shiftStartOverride?: string | null;
        shiftEndOverride?: string | null;
      };
    }) => patchAvailability(params.driverId, params.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["availability"] }),
  });
}
