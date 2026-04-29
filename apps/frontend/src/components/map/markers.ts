"use client";

import L from "leaflet";

export type MarkerKind = "depot" | "pickup" | "dropoff" | "driver" | "task";

const KIND_STYLES: Record<MarkerKind, { bg: string; emoji: string; ring: string }> = {
  depot: { bg: "#1f2937", emoji: "🏠", ring: "#9ca3af" },
  pickup: { bg: "#2265c3", emoji: "P", ring: "#bfdbfe" },
  dropoff: { bg: "#0d9488", emoji: "D", ring: "#99f6e4" },
  driver: { bg: "#f59e0b", emoji: "🚚", ring: "#fde68a" },
  task: { bg: "#dc2626", emoji: "•", ring: "#fecaca" },
};

const STATUS_COLORS: Record<string, string> = {
  pending: "#3b82f6",
  arrived: "#f59e0b",
  done: "#10b981",
  skipped: "#6b7280",
};

export function createMarkerIcon(opts: {
  kind: MarkerKind;
  label?: string | number;
  status?: string;
  color?: string;
}): L.DivIcon {
  const style = KIND_STYLES[opts.kind];
  const color =
    opts.color ?? (opts.status ? STATUS_COLORS[opts.status] ?? style.bg : style.bg);
  const labelText = opts.label !== undefined ? String(opts.label) : style.emoji;

  const html = `
    <div style="
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: ${color};
      border: 2px solid white;
      box-shadow: 0 1px 4px rgba(0,0,0,0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 11px;
      font-weight: 700;
      font-family: Inter, sans-serif;
    ">${labelText}</div>
  `;

  return L.divIcon({
    html,
    className: "",
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
}

export function getStatusColor(status: string): string {
  return STATUS_COLORS[status] ?? "#6b7280";
}

// 12 visually distinct colors for cycling driver routes.
const DRIVER_COLORS = [
  "#2265c3", "#dc2626", "#0d9488", "#7c3aed", "#f59e0b", "#16a34a",
  "#db2777", "#0891b2", "#ea580c", "#4f46e5", "#65a30d", "#be123c",
];

export function getDriverColor(index: number): string {
  return DRIVER_COLORS[index % DRIVER_COLORS.length];
}
