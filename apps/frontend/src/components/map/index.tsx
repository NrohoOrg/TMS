"use client";

import dynamic from "next/dynamic";
import { MapSkeleton } from "@/components/ui/skeleton";

// Leaflet touches `window` on import; render only on the client.
export const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => <MapSkeleton />,
});

export { MapLegend } from "./MapLegend";
export { getDriverColor, getStatusColor, createMarkerIcon } from "./markers";
export type { MapMarker, MapRoute } from "./MapView";
