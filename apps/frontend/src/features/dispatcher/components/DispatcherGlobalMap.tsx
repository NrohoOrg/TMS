"use client";

import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { MapView, MapLegend, getDriverColor, type MapMarker, type MapRoute } from "@/components/map";
import { useDrivers, usePlan, useMonitor } from "@/features/shared/hooks";
import type { LatLng } from "@/lib/osrm";
import { Map as MapIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

interface Props {
  /** When true, hide write actions. Used by Admin "Live Map" page. */
  readOnly?: boolean;
}

export default function DispatcherGlobalMap({ readOnly }: Props) {
  const { t } = useTranslation();
  const [date, setDate] = useState(todayStr());
  const [filterDriverId, setFilterDriverId] = useState<string | null>(null);

  const monitorQuery = useMonitor(date);
  const planQuery = usePlan(monitorQuery.data?.planId ?? null);
  const driversQuery = useDrivers();

  const drivers = driversQuery.data ?? [];
  const plan = planQuery.data;

  const markers: MapMarker[] = useMemo(() => {
    if (!plan) return [];
    const out: MapMarker[] = [];
    // Dedupe depot pins (drivers share a single shared depot).
    const depotsSeen = new Set<string>();
    plan.routes.forEach((route, rIdx) => {
      if (filterDriverId && route.driverId !== filterDriverId) return;
      const driver = drivers.find((d) => d.id === route.driverId);
      if (driver) {
        const key = `${driver.depotLat.toFixed(5)},${driver.depotLng.toFixed(5)}`;
        if (!depotsSeen.has(key)) {
          depotsSeen.add(key);
          out.push({
            id: `depot-${key}`,
            position: [driver.depotLat, driver.depotLng],
            kind: "depot",
            label: "🏠",
            popup: "Ministère des Startups",
          });
        }
      }
      route.stops.forEach((s, sIdx) => {
        const lat = s.type === "pickup" ? s.task.pickupLat : s.task.dropoffLat;
        const lng = s.type === "pickup" ? s.task.pickupLng : s.task.dropoffLng;
        if (lat == null || lng == null) return;
        out.push({
          id: s.stopId,
          position: [lat, lng],
          kind: s.type,
          label: sIdx + 1,
          color: getDriverColor(rIdx),
          status: s.status,
          popup: (
            <div className="text-xs">
              <div className="font-display font-semibold">{s.task.title}</div>
              <div className="text-muted-foreground">
                {s.type === "pickup" ? s.task.pickupAddress : s.task.dropoffAddress}
              </div>
            </div>
          ),
        });
      });
    });
    return out;
  }, [plan, drivers, filterDriverId]);

  const routes: MapRoute[] = useMemo(() => {
    if (!plan) return [];
    return plan.routes
      .filter((r) => !filterDriverId || r.driverId === filterDriverId)
      .map((r, rIdx) => {
        const driver = drivers.find((d) => d.id === r.driverId);
        const stops: LatLng[] = [];
        if (driver) stops.push([driver.depotLat, driver.depotLng]);
        r.stops.forEach((s) => {
          const lat = s.type === "pickup" ? s.task.pickupLat : s.task.dropoffLat;
          const lng = s.type === "pickup" ? s.task.pickupLng : s.task.dropoffLng;
          if (lat != null && lng != null) stops.push([lat, lng]);
        });
        return { id: `gm-${r.driverId}`, driverIndex: rIdx, stops };
      });
  }, [plan, drivers, filterDriverId]);

  return (
    <div className="p-6 space-y-4">
      <PageHeader
        title={readOnly ? t("admin.map.title") : t("admin.map.title")}
        subtitle={t("admin.map.subtitle")}
        actions={
          <div className="flex items-center gap-2">
            <Label className="text-xs">{t("common.date")}</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-8 w-40 text-xs"
            />
          </div>
        }
      />

      {/* Driver filter chips */}
      {plan && plan.routes.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={!filterDriverId ? "default" : "outline"}
            className="text-xs h-7"
            onClick={() => setFilterDriverId(null)}
          >
            {t("common.all")} ({plan.routes.length})
          </Button>
          {plan.routes.map((r, idx) => (
            <Button
              key={r.driverId}
              size="sm"
              variant={filterDriverId === r.driverId ? "default" : "outline"}
              className="text-xs h-7"
              onClick={() => setFilterDriverId(r.driverId === filterDriverId ? null : r.driverId)}
            >
              <span
                className="inline-block h-2 w-2 rounded-full me-1"
                style={{ backgroundColor: getDriverColor(idx) }}
              />
              {r.driverName}
              <Badge variant="outline" className="ms-1.5 text-[9px]">
                {r.stops.length}
              </Badge>
            </Button>
          ))}
        </div>
      )}

      <Card>
        <CardContent className="p-0 relative">
          {!plan || plan.routes.length === 0 ? (
            <div className="p-6 h-[500px] flex items-center justify-center">
              <EmptyState
                icon={MapIcon}
                title={t("dispatcher.operations.noPublishedPlan")}
                description={t("dispatcher.operations.runOptimizerHint")}
              />
            </div>
          ) : (
            <>
              <MapView
                markers={markers}
                routes={routes}
                height={600}
                fitBoundsKey={`${plan.planId}-${filterDriverId ?? "all"}`}
              />
              <div className="absolute bottom-3 start-3 z-[400]">
                <MapLegend
                  items={[
                    { color: "#1f2937", label: "Ministère" },
                    { color: "#2265c3", label: "Pickup" },
                    { color: "#0d9488", label: "Dropoff" },
                    { color: "#10b981", label: "Done" },
                    { color: "#6b7280", label: "Skipped" },
                  ]}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
