"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CheckCircle2,
  ClipboardList,
  Loader2,
  RefreshCcw,
  Route as RouteIcon,
  Send,
  Users,
} from "lucide-react";
import {
  useDrivers,
  usePlan,
  usePlansFiltered,
  usePublishPlan,
} from "@/features/shared/hooks";
import {
  useRecalculatePlan,
  useUnassignedTasks,
} from "@/features/shared/hooks/useManualPlanning";
import { useToast } from "@/hooks/use-toast";
import { MapView, MapLegend, getDriverColor, type MapMarker, type MapRoute } from "@/components/map";
import { PlanRoutesPanel } from "./PlanRoutesPanel";
import { UnassignedPanel } from "./UnassignedPanel";
import type { LatLng } from "@/lib/osrm";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

import { useTranslation } from "react-i18next";

export default function DispatcherPlanning() {
  const { toast } = useToast();
  const { t: tFn } = useTranslation();
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [highlightedTaskId, setHighlightedTaskId] = useState<string | null>(null);

  const plansQuery = usePlansFiltered({ date: selectedDate });
  const driversQuery = useDrivers();
  const planQuery = usePlan(selectedPlanId);
  const unassignedQuery = useUnassignedTasks(selectedPlanId, selectedDate);

  const recalculate = useRecalculatePlan(selectedPlanId ?? "");
  const publish = usePublishPlan();

  const drivers = driversQuery.data ?? [];
  const plan = planQuery.data;
  const isDraft = plan?.status === "draft";

  // Auto-select most recent plan when plans load
  useEffect(() => {
    if (!selectedPlanId && plansQuery.data && plansQuery.data.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedPlanId(plansQuery.data[0].planId);
    }
  }, [plansQuery.data, selectedPlanId]);

  async function handleRecalculate() {
    if (!selectedPlanId) return;
    try {
      await recalculate.mutateAsync();
      toast({ title: tFn("dispatcher.planning.recalculated") });
    } catch (err) {
      toast({
        title: tFn("dispatcher.planning.recalculateFailed"),
        description: err instanceof Error ? err.message : tFn("common.unknownError"),
        variant: "destructive",
      });
    }
  }

  async function handlePublish() {
    if (!selectedPlanId) return;
    if (!confirm("Publish this plan? Drivers will be notified and the plan becomes read-only.")) return;
    try {
      await publish.mutateAsync(selectedPlanId);
      toast({ title: tFn("dispatcher.planning.planPublished") });
      plansQuery.refetch();
      router.push("/dispatcher/operations");
    } catch (err) {
      toast({
        title: tFn("dispatcher.planning.publishFailed"),
        description: err instanceof Error ? err.message : tFn("common.unknownError"),
        variant: "destructive",
      });
    }
  }

  // Map data
  const mapMarkers: MapMarker[] = useMemo(() => {
    const markers: MapMarker[] = [];
    if (!plan) return markers;
    // Dedupe depot pins (drivers share a single shared depot).
    const depotsSeen = new Set<string>();

    plan.routes.forEach((route, rIdx) => {
      const driver = drivers.find((d) => d.id === route.driverId);
      if (driver) {
        const key = `${driver.depotLat.toFixed(5)},${driver.depotLng.toFixed(5)}`;
        if (!depotsSeen.has(key)) {
          depotsSeen.add(key);
          markers.push({
            id: `depot-${key}`,
            position: [driver.depotLat, driver.depotLng],
            kind: "depot",
            label: "🏠",
            popup: "Ministère des Startups",
          });
        }
      }
      route.stops.forEach((stop, sIdx) => {
        const lat =
          stop.type === "pickup" ? stop.task.pickupLat : stop.task.dropoffLat;
        const lng =
          stop.type === "pickup" ? stop.task.pickupLng : stop.task.dropoffLng;
        if (lat == null || lng == null) return;
        markers.push({
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
              <div className="text-muted-foreground mt-1">
                Driver: {route.driverName} • Stop #{sIdx + 1}
              </div>
            </div>
          ),
        });
      });
    });

    // Highlight the selected unassigned task with a marker pair
    if (highlightedTaskId) {
      const t = unassignedQuery.data?.find((x) => x.id === highlightedTaskId);
      if (t) {
        markers.push({
          id: `${t.id}-pickup-hl`,
          position: [t.pickupLat, t.pickupLng],
          kind: "pickup",
          label: "P",
          color: "#dc2626",
          popup: `Unassigned: ${t.title}`,
        });
        markers.push({
          id: `${t.id}-dropoff-hl`,
          position: [t.dropoffLat, t.dropoffLng],
          kind: "dropoff",
          label: "D",
          color: "#dc2626",
          popup: `Unassigned: ${t.title}`,
        });
      }
    }
    return markers;
  }, [plan, drivers, highlightedTaskId, unassignedQuery.data]);

  const mapRoutes: MapRoute[] = useMemo(() => {
    if (!plan) return [];
    return plan.routes.map((route, rIdx) => {
      const driver = drivers.find((d) => d.id === route.driverId);
      const stops: LatLng[] = [];
      if (driver) stops.push([driver.depotLat, driver.depotLng]);
      route.stops.forEach((s) => {
        const lat = s.type === "pickup" ? s.task.pickupLat : s.task.dropoffLat;
        const lng = s.type === "pickup" ? s.task.pickupLng : s.task.dropoffLng;
        if (lat != null && lng != null) stops.push([lat, lng]);
      });
      return {
        id: `route-${route.driverId}`,
        driverIndex: rIdx,
        stops,
      };
    });
  }, [plan, drivers]);

  const stats = useMemo(() => {
    if (!plan) return null;
    const totalStops = plan.routes.reduce((s, r) => s + r.stops.length, 0);
    return {
      assignedTasks: totalStops / 2,
      unassignedCount: plan.unassigned.length,
      driversUsed: plan.routes.length,
    };
  }, [plan]);

  return (
    <div className="flex flex-col lg:h-[calc(100vh-3.5rem)]">
      <div className="border-b border-border bg-background px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <PageHeader title={tFn("dispatcher.planning.title")} subtitle={tFn("dispatcher.planning.subtitle")} />
          <div className="flex items-center gap-2">
            <Label className="text-xs">{tFn("common.date")}</Label>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setSelectedPlanId(null);
              }}
              className="h-8 w-40 text-xs"
            />
          </div>
        </div>
        {plan && stats && (
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-3 text-xs">
              <Stat icon={ClipboardList} label={tFn("dispatcher.planning.assigned")} value={String(stats.assignedTasks)} />
              <Stat
                icon={ClipboardList}
                label={tFn("dispatcher.planning.unassigned")}
                value={String(stats.unassignedCount)}
                tone={stats.unassignedCount > 0 ? "warn" : undefined}
              />
              <Stat icon={Users} label={tFn("dispatcher.planning.drivers")} value={String(stats.driversUsed)} />
            </div>
            {isDraft ? (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRecalculate}
                  disabled={recalculate.isPending}
                  className="text-xs"
                >
                  {recalculate.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 me-1 animate-spin" />
                  ) : (
                    <RefreshCcw className="w-3.5 h-3.5 me-1" />
                  )}
                  {tFn("dispatcher.planning.recalculate")}
                </Button>
                <Button
                  size="sm"
                  onClick={handlePublish}
                  disabled={publish.isPending || stats.assignedTasks === 0}
                  className="text-xs bg-tms-success hover:bg-tms-success-dark"
                >
                  {publish.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 me-1 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5 me-1" />
                  )}
                  {tFn("dispatcher.planning.publish")}
                </Button>
              </>
            ) : (
              <Badge className="text-[10px] bg-tms-success-light text-tms-success-dark">
                <CheckCircle2 className="w-3 h-3 me-1" /> {tFn("dispatcher.planning.published")}
              </Badge>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 gap-0">
        {/* Center: map (now wider since left rail removed) */}
        <div className="lg:col-span-8 relative min-h-[400px]">
          {planQuery.isLoading ? (
            <Skeleton className="h-full w-full" />
          ) : planQuery.isError ? (
            <div className="p-4">
              <ErrorState
                message={planQuery.error instanceof Error ? planQuery.error.message : tFn("common.unknownError")}
                onRetry={() => planQuery.refetch()}
              />
            </div>
          ) : !plan ? (
            <div className="p-4 h-full flex items-center justify-center">
              <EmptyState
                icon={RouteIcon}
                title={tFn("dispatcher.planning.noPlanSelected")}
                description={tFn("dispatcher.planning.selectPlanHint")}
              />
            </div>
          ) : (
            <>
              <MapView
                markers={mapMarkers}
                routes={mapRoutes}
                height="100%"
                fitBoundsKey={`${plan.planId}-${plan.routes.length}`}
              />
              <div className="absolute bottom-3 start-3 z-[400]">
                <MapLegend
                  items={[
                    { color: "#1f2937", label: "Ministère" },
                    { color: "#2265c3", label: "Pickup" },
                    { color: "#0d9488", label: "Dropoff" },
                    { color: "#dc2626", label: "Unassigned" },
                  ]}
                />
              </div>
            </>
          )}
        </div>

        {/* Right rail */}
        <div className="lg:col-span-4 lg:border-l border-t lg:border-t-0 border-border bg-muted/20 lg:grid lg:grid-rows-[1fr_auto] lg:min-h-0 lg:overflow-hidden">
          {plan ? (
            <PlanRoutesPanel
              plan={plan}
              drivers={drivers}
              unassignedTasks={unassignedQuery.data ?? []}
            />
          ) : (
            <div className="p-4 text-xs text-muted-foreground text-center">
              {tFn("dispatcher.planning.selectPlanHint")}
            </div>
          )}
          <div className="border-t border-border max-h-72 overflow-hidden">
            <UnassignedPanel
              tasksInPlan={plan?.unassigned ?? []}
              pendingTasks={unassignedQuery.data ?? []}
              selectedTaskId={highlightedTaskId}
              onSelect={setHighlightedTaskId}
            />
          </div>
        </div>
      </div>

    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  tone?: "warn";
}) {
  return (
    <div
      className={`flex items-center gap-1.5 px-2 py-1 rounded-md border border-border bg-background ${
        tone === "warn" ? "border-tms-warning/40 bg-tms-warning-light/30" : ""
      }`}
    >
      <Icon className="w-3 h-3 text-muted-foreground" />
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-mono font-semibold">{value}</span>
    </div>
  );
}
