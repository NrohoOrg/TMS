"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CheckCircle2,
  ClipboardList,
  Clock,
  Loader2,
  RefreshCcw,
  Route as RouteIcon,
  Send,
  Sparkles,
  Users,
} from "lucide-react";
import {
  useDrivers,
  useJobStatus,
  usePlan,
  usePlansFiltered,
  usePublishPlan,
  useTriggerOptimize,
} from "@/features/shared/hooks";
import {
  useCreateDraftPlan,
  useRecalculatePlan,
  useUnassignedTasks,
} from "@/features/shared/hooks/useManualPlanning";
import { useToast } from "@/hooks/use-toast";
import { MapView, MapLegend, getDriverColor, type MapMarker, type MapRoute } from "@/components/map";
import { PlanList } from "./PlanList";
import { PlanRoutesPanel } from "./PlanRoutesPanel";
import { UnassignedPanel } from "./UnassignedPanel";
import type { LatLng } from "@/lib/osrm";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function DispatcherPlanning() {
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [optimizeDialogOpen, setOptimizeDialogOpen] = useState(false);
  const [optimizeReturnToDepot, setOptimizeReturnToDepot] = useState(true);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [highlightedTaskId, setHighlightedTaskId] = useState<string | null>(null);

  const plansQuery = usePlansFiltered({ date: selectedDate });
  const driversQuery = useDrivers();
  const planQuery = usePlan(selectedPlanId);
  const unassignedQuery = useUnassignedTasks(selectedPlanId, selectedDate);

  const createDraft = useCreateDraftPlan();
  const triggerOptimize = useTriggerOptimize();
  const jobStatusQuery = useJobStatus(activeJobId);
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

  // Watch optimization job status
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!jobStatusQuery.data) return;
    const { status, planId } = jobStatusQuery.data;
    if (status === "completed" && planId) {
      toast({ title: "Plan generated", description: "Optimization complete." });
      setActiveJobId(null);
      setSelectedPlanId(planId);
      plansQuery.refetch();
    } else if (status === "failed") {
      toast({
        title: "Optimization failed",
        description: jobStatusQuery.data.error ?? "Unknown error",
        variant: "destructive",
      });
      setActiveJobId(null);
    }
  }, [jobStatusQuery.data, plansQuery, toast]);
  /* eslint-enable react-hooks/set-state-in-effect */

  async function handleCreate(notes: string) {
    try {
      const res = await createDraft.mutateAsync({ date: selectedDate, notes });
      setSelectedPlanId(res.planId);
      setCreateDialogOpen(false);
      toast({ title: "Empty draft plan created" });
    } catch (err) {
      toast({
        title: "Create failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    }
  }

  async function handleOptimize() {
    try {
      const res = await triggerOptimize.mutateAsync({
        date: selectedDate,
        returnToDepot: optimizeReturnToDepot,
      });
      setActiveJobId(res.jobId);
      setOptimizeDialogOpen(false);
      toast({ title: "Optimization queued", description: `Job ${res.jobId.slice(0, 8)}…` });
    } catch (err) {
      toast({
        title: "Optimization failed to start",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    }
  }

  async function handleRecalculate() {
    if (!selectedPlanId) return;
    try {
      await recalculate.mutateAsync();
      toast({ title: "ETAs recalculated" });
    } catch (err) {
      toast({
        title: "Recalc failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    }
  }

  async function handlePublish() {
    if (!selectedPlanId) return;
    if (!confirm("Publish this plan? Drivers will be notified and the plan becomes read-only.")) return;
    try {
      await publish.mutateAsync(selectedPlanId);
      toast({ title: "Plan published" });
      plansQuery.refetch();
    } catch (err) {
      toast({
        title: "Publish failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    }
  }

  // Map data
  const mapMarkers: MapMarker[] = useMemo(() => {
    const markers: MapMarker[] = [];
    if (!plan) return markers;

    plan.routes.forEach((route, rIdx) => {
      const driver = drivers.find((d) => d.id === route.driverId);
      if (driver) {
        markers.push({
          id: `depot-${driver.id}`,
          position: [driver.depotLat, driver.depotLng],
          kind: "depot",
          label: "🏠",
          popup: `Depot — ${driver.name}`,
        });
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
    const assignedTasks = totalStops / 2;
    const unassignedCount = plan.unassigned.length;
    const totalTime = plan.routes.reduce((s, r) => s + r.totalTimeMinutes, 0);
    const totalDistance = plan.routes.reduce((s, r) => s + r.totalDistanceKm, 0);
    return {
      assignedTasks,
      unassignedCount,
      totalTime,
      totalDistance,
      driversUsed: plan.routes.length,
    };
  }, [plan]);

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      <div className="border-b border-border bg-background px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <PageHeader title="Planning Workspace" subtitle="" />
          <div className="flex items-center gap-2">
            <Label className="text-xs">Date</Label>
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
              <Stat icon={ClipboardList} label="Assigned" value={String(stats.assignedTasks)} />
              <Stat
                icon={ClipboardList}
                label="Unassigned"
                value={String(stats.unassignedCount)}
                tone={stats.unassignedCount > 0 ? "warn" : undefined}
              />
              <Stat icon={Users} label="Drivers" value={String(stats.driversUsed)} />
              <Stat icon={Clock} label="Time" value={`${stats.totalTime.toFixed(0)}m`} />
              <Stat icon={RouteIcon} label="Distance" value={`${stats.totalDistance.toFixed(1)}km`} />
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
                    <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                  ) : (
                    <RefreshCcw className="w-3.5 h-3.5 mr-1" />
                  )}
                  Recalculate
                </Button>
                <Button
                  size="sm"
                  onClick={handlePublish}
                  disabled={publish.isPending || stats.assignedTasks === 0}
                  className="text-xs bg-tms-success hover:bg-tms-success-dark"
                >
                  {publish.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5 mr-1" />
                  )}
                  Publish
                </Button>
              </>
            ) : (
              <Badge className="text-[10px] bg-tms-success-light text-tms-success-dark">
                <CheckCircle2 className="w-3 h-3 mr-1" /> Published
              </Badge>
            )}
          </div>
        )}
      </div>

      {activeJobId && jobStatusQuery.data && (
        <div className="px-4 py-2 border-b border-border bg-primary/5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-display font-semibold">
              Optimizing… ({jobStatusQuery.data.status})
            </span>
            <span className="text-xs text-muted-foreground">
              {jobStatusQuery.data.progressPercent}%
            </span>
          </div>
          <Progress value={jobStatusQuery.data.progressPercent} className="h-1.5" />
        </div>
      )}

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 gap-0">
        {/* Left rail */}
        <div className="lg:col-span-2 border-r border-border bg-muted/20 min-h-0">
          <PlanList
            plans={plansQuery.data}
            isLoading={plansQuery.isLoading}
            selectedPlanId={selectedPlanId}
            onSelect={(id) => {
              setSelectedPlanId(id);
              setHighlightedTaskId(null);
            }}
            onCreate={() => setCreateDialogOpen(true)}
            onOptimize={() => setOptimizeDialogOpen(true)}
          />
        </div>

        {/* Center: map */}
        <div className="lg:col-span-7 relative min-h-[400px]">
          {planQuery.isLoading ? (
            <Skeleton className="h-full w-full" />
          ) : planQuery.isError ? (
            <div className="p-4">
              <ErrorState
                message={planQuery.error instanceof Error ? planQuery.error.message : "Failed to load plan"}
                onRetry={() => planQuery.refetch()}
              />
            </div>
          ) : !plan ? (
            <div className="p-4 h-full flex items-center justify-center">
              <EmptyState
                icon={RouteIcon}
                title="No plan selected"
                description="Pick an existing plan, create an empty draft, or run the optimizer."
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
              <div className="absolute bottom-3 left-3 z-[400]">
                <MapLegend
                  items={[
                    { color: "#1f2937", label: "Depot" },
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
        <div className="lg:col-span-3 border-l border-border bg-muted/20 grid grid-rows-[1fr_auto] min-h-0 overflow-hidden">
          {plan ? (
            <PlanRoutesPanel
              plan={plan}
              drivers={drivers}
              unassignedTasks={unassignedQuery.data ?? []}
            />
          ) : (
            <div className="p-4 text-xs text-muted-foreground text-center">
              Select or create a plan to start.
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

      {/* Create draft dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New empty draft plan</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Date</Label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Notes (optional)</Label>
              <Input
                placeholder="e.g. Express runs only"
                onChange={(e) => ((window as { _planNotes?: string })._planNotes = e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                const notes = (window as { _planNotes?: string })._planNotes ?? "";
                handleCreate(notes);
              }}
              disabled={createDraft.isPending}
            >
              {createDraft.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Optimize dialog */}
      <Dialog open={optimizeDialogOpen} onOpenChange={setOptimizeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Run optimizer</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Date</Label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Return to depot at end of day</Label>
              <Switch
                checked={optimizeReturnToDepot}
                onCheckedChange={setOptimizeReturnToDepot}
              />
            </div>
            <Card className="bg-muted/40">
              <CardContent className="p-3 text-xs space-y-1">
                <div>
                  <strong>{drivers.filter((d) => d.active).length}</strong> active drivers
                </div>
                <div className="text-muted-foreground">
                  Optimizer will only assign pending tasks scheduled for this date.
                </div>
              </CardContent>
            </Card>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOptimizeDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleOptimize} disabled={triggerOptimize.isPending}>
              {triggerOptimize.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2" />
              )}
              Generate plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
