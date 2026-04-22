"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createDriver,
  deleteDriver,
  getDrivers,
  patchDriver,
} from "@/lib/api-services";
import type { Driver } from "@/types/api";

const DRIVERS_KEY = ["drivers"] as const;

export function useDrivers() {
  return useQuery({ queryKey: DRIVERS_KEY, queryFn: getDrivers });
}

export function useCreateDriver() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Driver>) => createDriver(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: DRIVERS_KEY }),
  });
}

export function useUpdateDriver() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Driver> }) =>
      patchDriver(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: DRIVERS_KEY }),
  });
}

export function useDeleteDriver() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteDriver(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: DRIVERS_KEY }),
  });
}
