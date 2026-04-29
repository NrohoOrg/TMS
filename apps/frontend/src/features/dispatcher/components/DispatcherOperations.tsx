"use client";

import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/ui/page-header";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Loader2,
  Map as MapIcon,
  Phone,
  PlayCircle,
  RefreshCw,
} from "lucide-react";
import {
  useDrivers,
  useMonitor,
  usePlan,
  useUpdateStopStatus,
} from "@/features/shared/hooks";
import { useToast } from "@/hooks/use-toast";
import {
  MapView,
  MapLegend,
  getDriverColor,
  type MapMarker,
  type MapRoute,
} from "@/components/map";
import type { LatLng } from "@/lib/osrm";
import type { PlanRoute, PlanStop } from "@/types/api";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

type TaskStatus = "pending" | "started" | "done" | "skipped";

type TaskRow = {
  taskId: string;
  title: string;
  pickupAddress: string;
  dropoffAddress: string;
  status: TaskStatus;
  pickup: PlanStop;
  dropoff: PlanStop;
};

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function secondsToHHMM(s: number): string {
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function deriveTasksFromRoute(route: PlanRoute): TaskRow[] {
  const byTask = new Map<string, { pickup?: PlanStop; dropoff?: PlanStop }>();
  for (const stop of route.stops) {
    const slot = byTask.get(stop.taskId) ?? {};
    if (stop.type === "pickup") slot.pickup = stop;
    else slot.dropoff = stop;
    byTask.set(stop.taskId, slot);
  }

  const rows: TaskRow[] = [];
  for (const [taskId, { pickup, dropoff }] of byTask) {
    if (!pickup || !dropoff) continue;
    rows.push({
      taskId,
      title: pickup.task.title,
      pickupAddress: pickup.task.pickupAddress,
      dropoffAddress: pickup.task.dropoffAddress,
      status: deriveTaskStatus(pickup.status, dropoff.status),
      pickup,
      dropoff,
    });
  }

  rows.sort((a, b) => a.pickup.sequence - b.pickup.sequence);
  return rows;
}

function deriveTaskStatus(
  pickupStatus: PlanStop["status"],
  dropoffStatus: PlanStop["status"],
): TaskStatus {
  if (pickupStatus === "skipped" || dropoffStatus === "skipped") return "skipped";
  if (dropoffStatus === "done") return "done";
  if (pickupStatus === "done" || pickupStatus === "arrived") return "started";
  return "pending";
}

const DRIVER_STATUS_KEY: Record<string, string> = {
  on_route: "status.onRoute",
  at_stop: "status.atStop",
  completed: "status.completed",
};

export default function DispatcherOperations() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [date, setDate] = useState(todayStr());
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);

  const monitorQuery = useMonitor(date);
  const driversQuery = useDrivers();
  const planQuery = usePlan(monitorQuery.data?.planId ?? null);
  const updateStopStatus = useUpdateStopStatus();

  const monitor = monitorQuery.data;
  const drivers = driversQuery.data ?? [];
  const plan = planQuery.data;

  const selectDriver = (driverId: string) =>
    setSelectedDriverId((current) => (current === driverId ? null : driverId));

  const mapMarkers: MapMarker[] = useMemo(() => {
    if (!plan) return [];
    const out: MapMarker[] = [];
    // Dedupe depot pins: drivers share a depot, so render one marker per
    // unique lat/lng instead of stacking N markers on the same spot.
    const depotsSeen = new Set<string>();

    plan.routes.forEach((route, rIdx) => {
      const driver = drivers.find((d) => d.id === route.driverId);
      const isSelected = selectedDriverId === route.driverId;
      const isVisible = !selectedDriverId || isSelected;
      if (!isVisible) return;

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
              <div className="mt-1">Status: <strong>{stop.status}</strong></div>
            </div>
          ),
          onClick: () => selectDriver(route.driverId),
        });
      });
    });

    return out;
  }, [plan, drivers, selectedDriverId]);

  const mapRoutes: MapRoute[] = useMemo(() => {
    if (!plan) return [];
    return plan.routes
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
        return { id: `ops-route-${route.driverId}`, driverIndex: rIdx, stops };
      });
  }, [plan, drivers, selectedDriverId]);

  const selectedRoute =
    plan?.routes.find((r) => r.driverId === selectedDriverId) ?? null;
  const selectedMonitorDriver = monitor?.drivers.find((d) => d.id === selectedDriverId) ?? null;

  async function markStopDone(stopId: string, label: string) {
    try {
      await updateStopStatus.mutateAsync({ stopId, status: "done" });
      toast({ title: label });
    } catch (err) {
      toast({
        title: t("common.updateFailed"),
        description: err instanceof Error ? err.message : t("common.unknownError"),
        variant: "destructive",
      });
    }
  }

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <PageHeader
        title={t("dispatcher.operations.title")}
        subtitle={t("dispatcher.operations.subtitle")}
        actions={
          <div className="flex items-center gap-2">
            <Label className="text-xs">{t("common.date")}</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                setSelectedDriverId(null);
              }}
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
                  "w-3.5 h-3.5 me-1",
                  monitorQuery.isFetching && "animate-spin",
                )}
              />
              {t("common.refresh")}
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:min-h-[600px]">
        {/* Map */}
        <Card className="lg:col-span-2 overflow-hidden p-0">
          <CardContent className="p-0 h-full relative">
            {monitorQuery.isLoading ? (
              <Skeleton className="h-[600px] w-full" />
            ) : monitorQuery.isError ? (
              <ErrorState
                message={
                  monitorQuery.error instanceof Error
                    ? monitorQuery.error.message
                    : t("dispatcher.operations.failedToLoad")
                }
                onRetry={() => monitorQuery.refetch()}
              />
            ) : !monitor || !monitor.planId ? (
              <div className="p-4 h-[600px] flex items-center justify-center">
                <EmptyState
                  icon={MapIcon}
                  title={t("dispatcher.operations.noPublishedPlan")}
                  description={t("dispatcher.operations.runOptimizerHint")}
                />
              </div>
            ) : (
              <>
                <MapView
                  markers={mapMarkers}
                  routes={mapRoutes}
                  height={600}
                  fitBoundsKey={`${monitor.planId}-${selectedDriverId}`}
                />
                <div className="absolute bottom-3 left-3 z-[400]">
                  <MapLegend
                    items={[
                      { color: "#1f2937", label: t("dispatcher.operations.ministry") },
                      { color: "#3b82f6", label: t("status.pending") },
                      { color: "#10b981", label: t("status.done") },
                      { color: "#6b7280", label: t("status.skipped") },
                    ]}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Right: drivers list + selected driver task list */}
        <div className="space-y-3 lg:overflow-y-auto lg:max-h-[700px] pe-1">
          {!monitor?.drivers || monitor.drivers.length === 0 ? (
            <Card>
              <CardContent className="p-4">
                <EmptyState
                  icon={MapIcon}
                  title={t("dispatcher.operations.noDrivers")}
                  description={t("dispatcher.operations.noDriversAssigned")}
                />
              </CardContent>
            </Card>
          ) : (
            monitor.drivers.map((d, idx) => {
              const isSelected = selectedDriverId === d.id;
              const color = getDriverColor(idx);
              const pct =
                d.progress.total > 0
                  ? (d.progress.completed / d.progress.total) * 100
                  : 0;
              return (
                <Card
                  key={d.id}
                  className={cn(
                    "cursor-pointer transition-shadow hover:shadow-md",
                    isSelected && "ring-2 ring-primary",
                    !d.available && "opacity-60 border-tms-error/40 bg-tms-error-light/20",
                  )}
                  onClick={() => selectDriver(d.id)}
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
                      {d.available ? (
                        <Badge variant="outline" className="text-[10px]">
                          {DRIVER_STATUS_KEY[d.status] ? t(DRIVER_STATUS_KEY[d.status]) : d.status}
                        </Badge>
                      ) : (
                        <Badge className="text-[10px] bg-tms-error text-destructive-foreground">
                          Not Available
                        </Badge>
                      )}
                    </div>
                    {!d.available && d.unavailableFromTime && (
                      <div className="text-[10px] text-tms-error-dark">
                        Off shift from {d.unavailableFromTime}
                      </div>
                    )}
                    <div>
                      <div className="text-[10px] text-muted-foreground mb-1">
                        {t("dispatcher.operations.progress")}: {d.progress.completed}/{d.progress.total}
                      </div>
                      <Progress value={pct} className="h-1" />
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}

          {selectedMonitorDriver && selectedRoute && (
            <Card className="border-primary/30">
              <CardContent className="p-3 space-y-2">
                <div className="text-xs font-display font-semibold border-b border-border pb-2">
                  {t("dispatcher.operations.tasksFor", { name: selectedMonitorDriver.name })}
                </div>
                {selectedRoute.stops.length === 0 ? (
                  <div className="text-xs text-muted-foreground p-2">
                    {t("dispatcher.operations.noTasksAssigned")}
                  </div>
                ) : (
                  <div className="space-y-1 max-h-[420px] overflow-y-auto">
                    {[...selectedRoute.stops]
                      .sort((a, b) => a.sequence - b.sequence)
                      .map((stop, idx) => {
                        const isPickup = stop.type === "pickup";
                        // The dropoff for the same task is "do-able" only after
                        // the matching pickup is done.
                        const matchingPickup = !isPickup
                          ? selectedRoute.stops.find(
                              (s) => s.taskId === stop.taskId && s.type === "pickup",
                            )
                          : null;
                        const dropoffEnabled =
                          isPickup ||
                          matchingPickup?.status === "done" ||
                          matchingPickup?.status === "arrived";
                        const stopDone =
                          stop.status === "done" || stop.status === "skipped";
                        const buttonDisabled =
                          stopDone ||
                          updateStopStatus.isPending ||
                          (!isPickup && !dropoffEnabled);
                        const address = isPickup
                          ? stop.task.pickupAddress
                          : stop.task.dropoffAddress;
                        const buttonLabel = isPickup
                          ? t("dispatcher.operations.taskStarted")
                          : t("dispatcher.operations.taskDone");

                        return (
                          <div
                            key={stop.stopId}
                            className="rounded-md border border-border bg-background px-2 py-2 text-xs flex items-center gap-2"
                          >
                            <div className="text-[10px] font-mono text-muted-foreground w-5">
                              {idx + 1}.
                            </div>
                            {isPickup ? (
                              <ArrowUp className="w-3 h-3 text-tms-success flex-shrink-0" />
                            ) : (
                              <ArrowDown className="w-3 h-3 text-tms-error flex-shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate text-[11px]">
                                {stop.task.title}
                              </div>
                              <div className="text-[10px] text-muted-foreground truncate">
                                {address}
                              </div>
                            </div>
                            <span className="text-[10px] font-mono tabular-nums text-muted-foreground flex-shrink-0">
                              {secondsToHHMM(stop.etaSeconds)}
                            </span>
                            {stopDone ? (
                              <Badge
                                className={cn(
                                  "text-[9px]",
                                  stop.status === "done"
                                    ? "bg-tms-success-light text-tms-success-dark"
                                    : "bg-tms-warning-light text-tms-warning-dark",
                                )}
                              >
                                {stop.status}
                              </Badge>
                            ) : (
                              <Button
                                size="sm"
                                variant={isPickup ? "outline" : "default"}
                                className={cn(
                                  "h-6 text-[10px]",
                                  !isPickup && "bg-tms-success hover:bg-tms-success-dark",
                                )}
                                disabled={buttonDisabled}
                                onClick={() =>
                                  markStopDone(stop.stopId, buttonLabel)
                                }
                              >
                                {isPickup ? (
                                  <PlayCircle className="w-3 h-3 me-0.5" />
                                ) : (
                                  <CheckCircle2 className="w-3 h-3 me-0.5" />
                                )}
                                {buttonLabel}
                              </Button>
                            )}
                          </div>
                        );
                      })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {updateStopStatus.isPending && (
        <div className="text-xs text-muted-foreground flex items-center gap-2">
          <Loader2 className="w-3 h-3 animate-spin" />
          {t("dispatcher.operations.updatingStatus")}
        </div>
      )}
    </div>
  );
}
