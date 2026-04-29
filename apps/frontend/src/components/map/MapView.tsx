"use client";

import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import { useEffect, useMemo, type ReactNode } from "react";
import { createMarkerIcon, getDriverColor, type MarkerKind } from "./markers";
import { useOsrmRoute, type LatLng } from "@/lib/osrm";

export interface MapMarker {
  id: string;
  position: LatLng;
  kind: MarkerKind;
  label?: string | number;
  status?: string;
  color?: string;
  popup?: ReactNode;
  onClick?: () => void;
}

export interface MapRoute {
  id: string;
  driverIndex?: number;
  color?: string;
  stops: LatLng[];
  /** When true, ask OSRM for road geometry. Defaults to true. */
  useOsrm?: boolean;
}

interface MapViewProps {
  center?: LatLng;
  zoom?: number;
  markers?: MapMarker[];
  routes?: MapRoute[];
  fitBoundsKey?: string | number;
  className?: string;
  height?: string | number;
}

const DEFAULT_CENTER: LatLng = [36.7538, 3.0588]; // Algiers fallback

function FitBounds({
  markers,
  routes,
  trigger,
}: {
  markers: MapMarker[];
  routes: MapRoute[];
  trigger: string | number;
}) {
  const map = useMap();
  useEffect(() => {
    const all: LatLng[] = [
      ...markers.map((m) => m.position),
      ...routes.flatMap((r) => r.stops),
    ];
    if (!all.length) return;
    const bounds = L.latLngBounds(all.map(([lat, lng]) => L.latLng(lat, lng)));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger]);
  return null;
}

function RouteLine({ route }: { route: MapRoute }) {
  const useOsrm = route.useOsrm !== false;
  const { data, isLoading, isError } = useOsrmRoute(useOsrm ? route.stops : null);

  const color = route.color ?? getDriverColor(route.driverIndex ?? 0);

  // Fallback: straight-line polyline if OSRM fails or is disabled
  const fallbackGeometry = route.stops;
  const geometry = data?.geometry ?? fallbackGeometry;

  if (geometry.length < 2) return null;

  return (
    <Polyline
      positions={geometry}
      pathOptions={{
        color,
        weight: 4,
        opacity: isLoading ? 0.4 : 0.8,
        dashArray: isError || !useOsrm ? "8 6" : undefined,
      }}
    />
  );
}

export default function MapView({
  center,
  zoom = 12,
  markers = [],
  routes = [],
  fitBoundsKey,
  className,
  height = 400,
}: MapViewProps) {
  // Pick a sensible initial center
  const initialCenter = useMemo<LatLng>(() => {
    if (center) return center;
    if (markers.length) return markers[0].position;
    if (routes.length && routes[0].stops.length) return routes[0].stops[0];
    return DEFAULT_CENTER;
  }, [center, markers, routes]);

  const fitTrigger = fitBoundsKey ?? `${markers.length}-${routes.length}`;

  return (
    <div className={className} style={{ height, width: "100%" }}>
      <MapContainer
        center={initialCenter}
        zoom={zoom}
        style={{ height: "100%", width: "100%", borderRadius: "0.5rem" }}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {routes.map((route) => (
          <RouteLine key={route.id} route={route} />
        ))}
        {markers.map((m) => (
          <Marker
            key={m.id}
            position={m.position}
            icon={createMarkerIcon({
              kind: m.kind,
              label: m.label,
              status: m.status,
              color: m.color,
            })}
            eventHandlers={m.onClick ? { click: m.onClick } : undefined}
          >
            {m.popup && <Popup>{m.popup}</Popup>}
          </Marker>
        ))}
        <FitBounds markers={markers} routes={routes} trigger={fitTrigger} />
      </MapContainer>
    </div>
  );
}
