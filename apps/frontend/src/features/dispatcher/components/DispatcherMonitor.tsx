"use client";

import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  Monitor as MonitorIcon,
  Phone,
  RefreshCw,
} from "lucide-react";
import { useDrivers, useMonitor, usePlan, useUpdateStopStatus } from "@/features/shared/hooks";
import { useToast } from "@/hooks/use-toast";
import { MapView, MapLegend, getDriverColor, type MapMarker, type MapRoute } from "@/components/map";
import type { LatLng } from "@/lib/osrm";
import { cn } from "@/lib/utils";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

const STATUS_LABELS: Record<string, string> = {
  on_route: "On Route",
  at_stop: "At Stop",
  completed: "Completed",
};

export default function DispatcherMonitor() {
  const { toast } = useToast();
  const [date, setDate] = useState(todayStr());
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);

  const monitorQuery = useMonitor(date);
  const driversQuery = useDrivers();
  const planQuery = usePlan(monitorQuery.data?.planId ?? null);
  const updateStopStatus = useUpdateStopStatus();

  const monitor = monitorQuery.data;
  const drivers = driversQuery.data ?? [];

  // build map data from the published plan
  const mapMarkers: MapMarker[] = useMemo(() => {
    if (!planQuery.data) return [];
    const out: MapMarker[] = [];
    planQuery.data.routes.forEach((route, rIdx) => {
      const driver = drivers.find((d) => d.id === route.driverId);
      if (driver && (!selectedDriverId || selectedDriverId === driver.id)) {
        out.push({
          id: `depot-${driver.id}`,
          position: [driver.depotLat, driver.depotLng],
          kind: "depot",
          label: "🏠",
          popup: `Depot — ${driver.name}`,
        });
      }
      if (selectedDriverId && route.driverId !== selectedDriverId) return;
      route.stops.forEach((stop, sIdx) => {
        const lat = stop.type === "pickup" ? stop.task.pickupLat : stop.task.dropoffLat;
        const lng = stop.type === "pickup" ? stop.task.pickupLng : stop.task.dropoffLng;
        if (lat == null || lng == null) return;
        out.push({
          id: stop.stopId,
          position: [lat, lng],
          kind: stop.type,
          label: sIdx + 1,
          color: getDriverColor(rIdx),
          status: stop.status,
          popup: (
            <div className="text-xs">
              <div className="font-display font-semibold">{stop.task.title}</div>
              <div className="text-muted-foreground">
                {stop.type === "pickup" ? stop.task.pickupAddress : stop.task.dropoffAddress}
              </div>
              <div className="mt-1">
                Status: <strong>{stop.status}</strong>
              </div>
            </div>
          ),
        });
      });
    });

    // Add "last known driver position" markers from the monitor data
    monitor?.drivers.forEach((d) => {
      if (selectedDriverId && d.id !== selectedDriverId) return;
      if (!d.currentStop) return;
      const planStop = planQuery.data?.routes
        .flatMap((r) => r.stops)
        .find((s) => s.stopId === d.currentStop?.stopId);
      if (!planStop) return;
      const lat = planStop.type === "pickup" ? planStop.task.pickupLat : planStop.task.dropoffLat;
      const lng = planStop.type === "pickup" ? planStop.task.pickupLng : planStop.task.dropoffLng;
      if (lat == null || lng == null) return;
      out.push({
        id: `driver-${d.id}`,
        position: [lat, lng],
        kind: "driver",
        label: "🚚",
        popup: (
          <div className="text-xs">
            <div className="font-display font-semibold">{d.name}</div>
            <div className="text-muted-foreground">{STATUS_LABELS[d.status] ?? d.status}</div>
            <div className="text-muted-foreground">last known • {d.currentStop?.address}</div>
          </div>
        ),
      });
    });

    return out;
  }, [planQuery.data, drivers, monitor, selectedDriverId]);

  const mapRoutes: MapRoute[] = useMemo(() => {
    if (!planQuery.data) return [];
    return planQuery.data.routes
      .filter((r) => !selectedDriverId || r.driverId === selectedDriverId)
      .map((route, rIdx) => {
        const driver = drivers.find((d) => d.id === route.driverId);
        const stops: LatLng[] = [];
        if (driver) stops.push([driver.depotLat, driver.depotLng]);
        route.stops.forEach((s) => {
          const lat = s.type === "pickup" ? s.task.pickupLat : s.task.dropoffLat;
          const lng = s.type === "pickup" ? s.task.pickupLng : s.task.dropoffLng;
          if (lat != null && lng != null) stops.push([lat, lng]);
        });
        return { id: `monitor-route-${route.driverId}`, driverIndex: rIdx, stops };
      });
  }, [planQuery.data, drivers, selectedDriverId]);

  async function handleStopStatus(
    stopId: string,
    status: "arrived" | "done" | "skipped",
  ) {
    try {
      await updateStopStatus.mutateAsync({ stopId, status });
      toast({ title: `Stop marked ${status}` });
    } catch (err) {
      toast({
        title: "Update failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    }
  }

  const selectedDriver = monitor?.drivers.find((d) => d.id === selectedDriverId) ?? null;
  const selectedRoute = planQuery.data?.routes.find((r) => r.driverId === selectedDriverId) ?? null;

  return (
    <div className="p-6 space-y-4">
      <PageHeader
        title="Live Execution Monitor"
        subtitle="Polling every 10 seconds"
        actions={
          <div className="flex items-center gap-2">
            <Label className="text-xs">Date</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-8 w-40 text-xs"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => monitorQuery.refetch()}
              disabled={monitorQuery.isFetching}
              className="text-xs"
            >
              <RefreshCw
                className={cn(
                  "w-3.5 h-3.5 mr-1",
                  monitorQuery.isFetching && "animate-spin",
                )}
              />
              Refresh
            </Button>
          </div>
        }
      />

      {monitor && monitor.overview.delays > 0 && (
        <Card className="border-tms-warning/30 bg-tms-warning-light/30">
          <CardContent className="p-3 flex items-center gap-2 text-sm">
            <AlertTriangle className="w-4 h-4 text-tms-warning-dark" />
            <span>
              <strong>{monitor.overview.delays}</strong> stops are running late
              (their scheduled ETA has already passed).
            </span>
          </CardContent>
        </Card>
      )}

      {/* Overview tiles */}
      {monitor && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <OverviewTile label="Total" value={monitor.overview.total} />
          <OverviewTile label="Completed" value={monitor.overview.completed} tone="success" />
          <OverviewTile label="In Progress" value={monitor.overview.inProgress} tone="info" />
          <OverviewTile label="Pending" value={monitor.overview.pending} />
          <OverviewTile label="Delays" value={monitor.overview.delays} tone={monitor.overview.delays ? "warn" : undefined} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-[500px]">
        {/* Map */}
        <Card className="lg:col-span-2 overflow-hidden p-0">
          <CardContent className="p-0 h-full relative">
            {monitorQuery.isLoading ? (
              <Skeleton className="h-[500px] w-full" />
            ) : monitorQuery.isError ? (
              <ErrorState
                message={monitorQuery.error instanceof Error ? monitorQuery.error.message : "Failed to load monitor"}
                onRetry={() => monitorQuery.refetch()}
              />
            ) : !monitor || !monitor.planId ? (
              <div className="p-4 h-[500px] flex items-center justify-center">
                <EmptyState
                  icon={MonitorIcon}
                  title="No published plan for this date"
                  description="Publish a plan in the planning workspace to see live progress."
                />
              </div>
            ) : (
              <>
                <MapView
                  markers={mapMarkers}
                  routes={mapRoutes}
                  height={500}
                  fitBoundsKey={`${monitor.planId}-${selectedDriverId}-${monitor.drivers.length}`}
                />
                <div className="absolute bottom-3 left-3 z-[400]">
                  <MapLegend
                    items={[
                      { color: "#1f2937", label: "Depot" },
                      { color: "#f59e0b", label: "Driver" },
                      { color: "#10b981", label: "Done" },
                      { color: "#3b82f6", label: "Pending" },
                      { color: "#6b7280", label: "Skipped" },
                    ]}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Right panel: drivers + selected driver detail */}
        <div className="space-y-3 overflow-y-auto max-h-[700px] pr-1">
          {monitor?.drivers.length === 0 ? (
            <Card>
              <CardContent className="p-4">
                <EmptyState
                  icon={MonitorIcon}
                  title="No drivers"
                  description="No drivers are assigned in this plan."
                />
              </CardContent>
            </Card>
          ) : (
            monitor?.drivers.map((d, idx) => {
              const isSelected = selectedDriverId === d.id;
              const color = getDriverColor(idx);
              const pct =
                d.progress.total > 0 ? (d.progress.completed / d.progress.total) * 100 : 0;
              return (
                <Card
                  key={d.id}
                  className={cn(
                    "cursor-pointer transition-shadow hover:shadow-md",
                    isSelected && "ring-2 ring-primary",
                  )}
                  onClick={() => setSelectedDriverId(isSelected ? null : d.id)}
                >
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-display font-semibold truncate">
                          {d.name}
                        </div>
                        <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Phone className="w-2.5 h-2.5" />
                          {d.phone}
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px]">
                        {STATUS_LABELS[d.status] ?? d.status}
                      </Badge>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground mb-1">
                        Progress: {d.progress.completed}/{d.progress.total}
                      </div>
                      <Progress value={pct} className="h-1" />
                    </div>
                    {d.currentStop && (
                      <div className="text-[10px] text-muted-foreground border-t border-border pt-1.5">
                        <Clock className="w-2.5 h-2.5 inline mr-1" />
                        Next: <strong>{d.currentStop.address}</strong> @ {d.currentStop.scheduledArrival}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}

          {selectedDriver && selectedRoute && (
            <Card className="border-primary/30">
              <CardContent className="p-3 space-y-2">
                <div className="text-xs font-display font-semibold border-b border-border pb-2">
                  Stops for {selectedDriver.name}
                </div>
                <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
                  {selectedRoute.stops.map((s, i) => (
                    <div
                      key={s.stopId}
                      className="flex items-center gap-2 rounded-md border border-border bg-background px-2 py-1.5 text-xs"
                    >
                      <div className="text-[10px] font-mono text-muted-foreground w-5">{i + 1}.</div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{s.task.title}</div>
                        <div className="text-[10px] text-muted-foreground truncate">
                          {s.type === "pickup" ? "↑ " : "↓ "}
                          {s.type === "pickup" ? s.task.pickupAddress : s.task.dropoffAddress}
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[9px]">
                        {s.status}
                      </Badge>
                      {s.status === "pending" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 text-[10px]"
                          onClick={() => handleStopStatus(s.stopId, "arrived")}
                          disabled={updateStopStatus.isPending}
                        >
                          Arrived
                        </Button>
                      )}
                      {s.status === "arrived" && (
                        <Button
                          size="sm"
                          className="h-6 text-[10px] bg-tms-success hover:bg-tms-success-dark"
                          onClick={() => handleStopStatus(s.stopId, "done")}
                          disabled={updateStopStatus.isPending}
                        >
                          <CheckCircle2 className="w-3 h-3 mr-0.5" /> Done
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {monitor && monitor.recentEvents.length > 0 && (
        <Card>
          <CardContent className="p-3">
            <div className="text-xs font-display font-semibold mb-2">Recent events</div>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {monitor.recentEvents.map((e, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs">
                  <div
                    className={cn(
                      "h-2 w-2 rounded-full",
                      e.type === "success" && "bg-tms-success",
                      e.type === "warning" && "bg-tms-warning",
                      e.type === "info" && "bg-tms-info",
                    )}
                  />
                  <span className="font-mono text-[10px] text-muted-foreground">{e.time}</span>
                  <span className="font-medium">{e.driverName}</span>
                  <span className="text-muted-foreground truncate">{e.event}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {updateStopStatus.isPending && (
        <div className="text-xs text-muted-foreground flex items-center gap-2">
          <Loader2 className="w-3 h-3 animate-spin" />
          Updating stop…
        </div>
      )}
    </div>
  );
}

function OverviewTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "success" | "info" | "warn";
}) {
  return (
    <Card>
      <CardContent className="p-3 text-center">
        <div
          className={cn(
            "text-2xl font-display font-bold",
            tone === "success" && "text-tms-success-dark",
            tone === "info" && "text-tms-info-dark",
            tone === "warn" && "text-tms-warning-dark",
          )}
        >
          {value}
        </div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      </CardContent>
    </Card>
  );
}
