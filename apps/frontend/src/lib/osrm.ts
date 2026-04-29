"use client";

import { useQuery } from "@tanstack/react-query";

const OSRM_URL =
  process.env.NEXT_PUBLIC_OSRM_URL ?? "https://router.project-osrm.org";

export type LatLng = [number, number];

export interface OsrmRoute {
  geometry: LatLng[];
  distanceM: number;
  durationS: number;
}

export async function fetchOsrmRoute(coords: LatLng[]): Promise<OsrmRoute> {
  if (coords.length < 2) {
    return { geometry: coords, distanceM: 0, durationS: 0 };
  }
  const path = coords.map(([lat, lng]) => `${lng},${lat}`).join(";");
  const url = `${OSRM_URL}/route/v1/driving/${path}?overview=full&geometries=geojson`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`OSRM ${res.status}`);
  const json = (await res.json()) as {
    routes?: Array<{
      distance: number;
      duration: number;
      geometry: { coordinates: [number, number][] };
    }>;
    code?: string;
  };
  const route = json.routes?.[0];
  if (!route) throw new Error("OSRM no route");
  return {
    geometry: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]) as LatLng[],
    distanceM: Math.round(route.distance),
    durationS: Math.round(route.duration),
  };
}

function hashCoords(coords: LatLng[]): string {
  return coords.map(([lat, lng]) => `${lat.toFixed(5)},${lng.toFixed(5)}`).join("|");
}

export function useOsrmRoute(coords: LatLng[] | null | undefined) {
  return useQuery({
    queryKey: ["osrm", coords ? hashCoords(coords) : null],
    queryFn: () => fetchOsrmRoute(coords!),
    enabled: !!coords && coords.length >= 2,
    staleTime: 30 * 60_000,
    gcTime: 60 * 60_000,
    retry: 0,
  });
}
