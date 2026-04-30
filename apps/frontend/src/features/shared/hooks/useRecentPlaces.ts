"use client";

import { useCallback, useEffect, useState } from "react";

export interface RecentPlace {
  placeId: string;
  displayName: string;
  lat: number;
  lng: number;
  savedAt: number;
}

const STORAGE_KEY = "tms.recent_places.v1";
const MAX_ENTRIES = 10;

function readStorage(): RecentPlace[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (p): p is RecentPlace =>
        p &&
        typeof p.placeId === "string" &&
        typeof p.displayName === "string" &&
        typeof p.lat === "number" &&
        typeof p.lng === "number" &&
        typeof p.savedAt === "number" &&
        // Tolerate older entries written without coords; only keep usable ones.
        (p.lat !== 0 || p.lng !== 0),
    );
  } catch {
    return [];
  }
}

function writeStorage(value: RecentPlace[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Quota or disabled storage — silent: feature is non-critical.
  }
}

export function useRecentPlaces() {
  const [recents, setRecents] = useState<RecentPlace[]>([]);

  useEffect(() => {
    setRecents(readStorage());
  }, []);

  const addRecent = useCallback((place: Omit<RecentPlace, "savedAt">) => {
    if (!place.placeId || (place.lat === 0 && place.lng === 0)) return;
    const entry: RecentPlace = { ...place, savedAt: Date.now() };
    setRecents((prev) => {
      const deduped = prev.filter((p) => p.placeId !== entry.placeId);
      const next = [entry, ...deduped].slice(0, MAX_ENTRIES);
      writeStorage(next);
      return next;
    });
  }, []);

  const clearRecents = useCallback(() => {
    setRecents([]);
    writeStorage([]);
  }, []);

  return { recents, addRecent, clearRecents };
}
