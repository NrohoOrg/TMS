"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Clock,
  ExternalLink,
  Loader2,
  MapPin,
  Navigation as NavIcon,
  Phone,
  Route as RouteIcon,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import {
  useDrivers,
  useMonitor,
  usePlan,
  useUpdateStopStatus,
} from "@/features/shared/hooks";
import { MapView, MapLegend, type MapMarker, type MapRoute } from "@/components/map";
import type { LatLng } from "@/lib/osrm";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function secondsToHHMM(s: number): string {
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export default function DriverDashboard() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { t: tFn, i18n } = useTranslation();
  const today = todayStr();
  const [date, setDate] = useState(today);

  const monitorQuery = useMonitor(date);
  const planQuery = usePlan(monitorQuery.data?.planId ?? null);
  const driversQuery = useDrivers();
  const updateStop = useUpdateStopStatus();

  // Match the logged-in user to a driver record by email or name (best-effort
  // since the DRIVER role isn't in the backend yet).
  const drivers = driversQuery.data ?? [];
  const myDriver = useMemo(() => {
    if (!user) return null;
    return (
      drivers.find((d) => d.phone === user.phone) ??
      drivers.find((d) => d.name.toLowerCase() === user.name.toLowerCase()) ??
      drivers[0] ??
      null
    );
  }, [drivers, user]);

  const myMonitorEntry = monitorQuery.data?.drivers.find((d) => d.id === myDriver?.id);
  const myRoute = planQuery.data?.routes.find((r) => r.driverId === myDriver?.id);

  const markers: MapMarker[] = useMemo(() => {
    if (!myRoute) return [];
    const out: MapMarker[] = [];
    if (myDriver) {
      out.push({
        id: "depot",
        position: [myDriver.depotLat, myDriver.depotLng],
        kind: "depot",
        label: "🏠",
        popup: "Depot",
      });
    }
    myRoute.stops.forEach((s, i) => {
      const lat = s.type === "pickup" ? s.task.pickupLat : s.task.dropoffLat;
      const lng = s.type === "pickup" ? s.task.pickupLng : s.task.dropoffLng;
      if (lat == null || lng == null) return;
      out.push({
        id: s.stopId,
        position: [lat, lng],
        kind: s.type,
        label: i + 1,
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
    return out;
  }, [myRoute, myDriver]);

  const routes: MapRoute[] = useMemo(() => {
    if (!myRoute || !myDriver) return [];
    const stops: LatLng[] = [[myDriver.depotLat, myDriver.depotLng]];
    myRoute.stops.forEach((s) => {
      const lat = s.type === "pickup" ? s.task.pickupLat : s.task.dropoffLat;
      const lng = s.type === "pickup" ? s.task.pickupLng : s.task.dropoffLng;
      if (lat != null && lng != null) stops.push([lat, lng]);
    });
    return [{ id: "myroute", stops, color: "#2265c3" }];
  }, [myRoute, myDriver]);

  async function handleStatus(stopId: string, status: "arrived" | "done" | "skipped") {
    try {
      await updateStop.mutateAsync({ stopId, status });
      toast({ title: tFn("driver.stopMarkedAs", { status: tFn(`status.${status}`) }) });
    } catch (err) {
      toast({
        title: tFn("common.updateFailed"),
        description: err instanceof Error ? err.message : tFn("common.unknownError"),
        variant: "destructive",
      });
    }
  }

  const isLoading = monitorQuery.isLoading || planQuery.isLoading || driversQuery.isLoading;
  const isError = monitorQuery.isError || planQuery.isError;
  const completed = myRoute?.stops.filter((s) => s.status === "done").length ?? 0;
  const total = myRoute?.stops.length ?? 0;
  const pct = total > 0 ? (completed / total) * 100 : 0;

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <PageHeader
        title={user?.name ? `${user.name.split(" ")[0]} — ${tFn("driver.title")}` : tFn("driver.title")}
        subtitle={new Date(date).toLocaleDateString(i18n.language, {
          weekday: "long",
          day: "numeric",
          month: "long",
        })}
        actions={
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-8 px-2 text-xs border border-border rounded-md bg-background"
          />
        }
      />

      {isError ? (
        <ErrorState message={tFn("driver.unableToLoad")} onRetry={() => monitorQuery.refetch()} />
      ) : isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : !myRoute || !monitorQuery.data?.planId ? (
        <EmptyState
          icon={RouteIcon}
          title={tFn("driver.noRoute")}
          description={tFn("driver.noRouteHint")}
        />
      ) : (
        <>
          <Card>
            <CardContent className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Tile label={tFn("driver.stops")} value={String(total)} icon={MapPin} />
              <Tile label={tFn("driver.completed")} value={String(completed)} icon={CheckCircle2} tone="success" />
              <Tile label={tFn("driver.distance")} value={`${myRoute.totalDistanceKm.toFixed(1)}km`} icon={NavIcon} />
              <Tile label={tFn("driver.duration")} value={`${myRoute.totalTimeMinutes.toFixed(0)}m`} icon={Clock} />
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardContent className="p-0 relative">
              <MapView markers={markers} routes={routes} height={400} />
              <div className="absolute bottom-3 start-3 z-[400]">
                <MapLegend
                  items={[
                    { color: "#1f2937", label: "Depot" },
                    { color: "#10b981", label: "Done" },
                    { color: "#3b82f6", label: "Pending" },
                    { color: "#f59e0b", label: "Arrived" },
                  ]}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-display flex items-center justify-between">
                <span>{tFn("driver.todaysStops")}</span>
                <Progress value={pct} className="h-1.5 w-32" />
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 space-y-2">
              {myRoute.stops.map((s, i) => {
                const lat = s.type === "pickup" ? s.task.pickupLat : s.task.dropoffLat;
                const lng = s.type === "pickup" ? s.task.pickupLng : s.task.dropoffLng;
                const address =
                  s.type === "pickup" ? s.task.pickupAddress : s.task.dropoffAddress;
                const isCurrent =
                  myMonitorEntry?.currentStop?.stopId === s.stopId;
                return (
                  <div
                    key={s.stopId}
                    className={`rounded-md border p-3 ${
                      s.status === "done"
                        ? "border-tms-success/30 bg-tms-success-light/20"
                        : isCurrent
                          ? "border-primary bg-primary/5"
                          : "border-border"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        <div className="h-7 w-7 rounded-full bg-background border border-border flex items-center justify-center text-xs font-mono">
                          {i + 1}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <div className="flex items-center gap-2 min-w-0">
                            {s.type === "pickup" ? (
                              <ArrowUp className="w-3.5 h-3.5 text-tms-success" />
                            ) : (
                              <ArrowDown className="w-3.5 h-3.5 text-tms-error" />
                            )}
                            <span className="text-sm font-medium truncate">
                              {s.task.title}
                            </span>
                          </div>
                          <Badge variant="outline" className="text-[10px]">
                            {tFn(`status.${s.status}`)}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">{address}</div>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-1">
                          <Clock className="w-3 h-3" />
                          {tFn("driver.eta")} {secondsToHHMM(s.etaSeconds)}
                          {lat != null && lng != null && (
                            <a
                              href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=18/${lat}/${lng}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary inline-flex items-center gap-0.5 hover:underline"
                            >
                              {tFn("driver.openInMaps")}
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {s.status === "pending" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-7"
                              onClick={() => handleStatus(s.stopId, "arrived")}
                              disabled={updateStop.isPending}
                            >
                              {tFn("driver.markArrived")}
                            </Button>
                          )}
                          {s.status === "arrived" && (
                            <Button
                              size="sm"
                              className="text-xs h-7 bg-tms-success hover:bg-tms-success-dark"
                              onClick={() => handleStatus(s.stopId, "done")}
                              disabled={updateStop.isPending}
                            >
                              <CheckCircle2 className="w-3 h-3 me-1" /> {tFn("driver.done")}
                            </Button>
                          )}
                          {s.status !== "done" && s.status !== "skipped" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-xs h-7 text-muted-foreground"
                              onClick={() => handleStatus(s.stopId, "skipped")}
                              disabled={updateStop.isPending}
                            >
                              {tFn("driver.markSkipped")}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {myDriver && (
            <Card className="bg-muted/20">
              <CardContent className="p-3 text-xs text-muted-foreground flex items-center gap-3">
                <Phone className="w-3 h-3" />
                Dispatcher: contact via your supervisor.
                {updateStop.isPending && (
                  <span className="inline-flex items-center gap-1 ms-auto">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    {tFn("common.loading")}
                  </span>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function Tile({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  tone?: "success";
}) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <Icon
        className={`w-4 h-4 mb-1 ${
          tone === "success" ? "text-tms-success" : "text-muted-foreground"
        }`}
      />
      <div
        className={`text-2xl font-display font-bold ${
          tone === "success" ? "text-tms-success-dark" : "text-foreground"
        }`}
      >
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}
