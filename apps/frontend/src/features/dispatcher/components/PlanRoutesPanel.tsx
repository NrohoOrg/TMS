"use client";

import { useState } from "react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  closestCenter,
  DragOverlay,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronDown,
  ChevronUp,
  GripVertical,
  Lock,
  LockOpen,
  Plus,
  Trash2,
  UserCheck,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useAddRouteToPlan,
  useAddTaskToRoute,
  useMoveStop,
  useRemoveRoute,
  useRemoveStop,
  useUpdateStopMeta,
} from "@/features/shared/hooks/useManualPlanning";
import { useToast } from "@/hooks/use-toast";
import type { Driver, PlanDetails, PlanStop, Task } from "@/types/api";
import { getDriverColor } from "@/components/map";

interface Props {
  plan: PlanDetails;
  drivers: Driver[];
  unassignedTasks: Task[];
  onStopHover?: (stopId: string | null) => void;
}

function secondsToHHMM(s: number): string {
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

interface SortableStopProps {
  stop: PlanStop;
  routeId: string;
  index: number;
  onLockToggle: () => void;
  onDelete: () => void;
}

function SortableStop({ stop, routeId, index, onLockToggle, onDelete }: SortableStopProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({
      id: stop.stopId,
      data: { routeId, sequence: index, taskId: stop.taskId, type: stop.type },
    });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 rounded-md border border-border bg-background px-2 py-1.5 text-xs",
        stop.locked && "bg-muted/40",
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-muted-foreground"
      >
        <GripVertical className="w-3 h-3" />
      </button>
      {stop.type === "pickup" ? (
        <ArrowUp className="w-3 h-3 text-tms-success flex-shrink-0" />
      ) : (
        <ArrowDown className="w-3 h-3 text-tms-error flex-shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate text-[11px]">{stop.task.title}</div>
        <div className="text-[10px] text-muted-foreground truncate">
          {stop.type === "pickup" ? stop.task.pickupAddress : stop.task.dropoffAddress}
        </div>
      </div>
      <div className="text-[10px] font-mono text-muted-foreground flex-shrink-0">
        {secondsToHHMM(stop.etaSeconds)}
      </div>
      <button
        onClick={onLockToggle}
        className="text-muted-foreground hover:text-foreground"
        title={stop.locked ? "Unlock" : "Lock"}
      >
        {stop.locked ? <Lock className="w-3 h-3" /> : <LockOpen className="w-3 h-3" />}
      </button>
      <button
        onClick={onDelete}
        className="text-muted-foreground hover:text-tms-error"
        title="Remove"
      >
        <Trash2 className="w-3 h-3" />
      </button>
    </div>
  );
}

export function PlanRoutesPanel({ plan, drivers, unassignedTasks }: Props) {
  const isDraft = plan.status === "draft";
  const { toast } = useToast();

  const [expandedRoutes, setExpandedRoutes] = useState<Set<string>>(
    () => new Set(plan.routes.map((r) => r.driverId)),
  );
  const [activeStop, setActiveStop] = useState<PlanStop | null>(null);
  const [selectedDriverToAdd, setSelectedDriverToAdd] = useState<string>("");
  const [taskToAdd, setTaskToAdd] = useState<Record<string, string>>({});

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const addRoute = useAddRouteToPlan(plan.planId);
  const removeRoute = useRemoveRoute(plan.planId);
  const addTask = useAddTaskToRoute(plan.planId);
  const moveStop = useMoveStop(plan.planId);
  const updateStopMeta = useUpdateStopMeta(plan.planId);
  const removeStop = useRemoveStop(plan.planId);

  function toggleExpand(driverId: string) {
    const next = new Set(expandedRoutes);
    if (next.has(driverId)) next.delete(driverId);
    else next.add(driverId);
    setExpandedRoutes(next);
  }

  async function handleAddRoute() {
    if (!selectedDriverToAdd) return;
    try {
      await addRoute.mutateAsync({ driverId: selectedDriverToAdd });
      toast({ title: "Driver added" });
      setSelectedDriverToAdd("");
    } catch (err) {
      toast({
        title: "Add failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    }
  }

  async function handleRemoveRoute(routeId: string) {
    if (!confirm("Remove this driver and free their tasks?")) return;
    try {
      await removeRoute.mutateAsync(routeId);
      toast({ title: "Driver removed" });
    } catch (err) {
      toast({
        title: "Remove failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    }
  }

  async function handleAddTask(routeId: string, taskId: string) {
    try {
      await addTask.mutateAsync({ routeId, taskId });
      toast({ title: "Task assigned" });
      setTaskToAdd((p) => ({ ...p, [routeId]: "" }));
    } catch (err) {
      toast({
        title: "Assign failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    }
  }

  async function handleLockToggle(stop: PlanStop) {
    try {
      await updateStopMeta.mutateAsync({
        stopId: stop.stopId,
        data: { locked: !stop.locked },
      });
    } catch (err) {
      toast({
        title: "Update failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    }
  }

  async function handleDeleteStop(stop: PlanStop) {
    if (!confirm(`Remove ${stop.task.title} from this route?`)) return;
    try {
      await removeStop.mutateAsync(stop.stopId);
      toast({ title: "Stop removed" });
    } catch (err) {
      toast({
        title: "Remove failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    }
  }

  function findStop(stopId: string): { stop: PlanStop; routeId: string; index: number } | null {
    for (const route of plan.routes) {
      const idx = route.stops.findIndex((s) => s.stopId === stopId);
      if (idx >= 0) {
        return {
          stop: route.stops[idx],
          routeId: route.routeId ?? `${plan.planId}-${route.driverId}`,
          index: idx,
        };
      }
    }
    return null;
  }

  function handleDragStart(e: DragStartEvent) {
    const found = findStop(String(e.active.id));
    setActiveStop(found?.stop ?? null);
  }

  async function handleDragEnd(e: DragEndEvent) {
    setActiveStop(null);
    if (!e.over || e.over.id === e.active.id) return;
    const source = findStop(String(e.active.id));
    const target = findStop(String(e.over.id));
    if (!source || !target) return;

    try {
      await moveStop.mutateAsync({
        stopId: source.stop.stopId,
        targetRouteId: target.routeId !== source.routeId ? target.routeId : undefined,
        targetSequence: target.index,
      });
    } catch (err) {
      toast({
        title: "Move failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    }
  }

  const driversWithRoutes = new Set(plan.routes.map((r) => r.driverId));
  const driversWithoutRoutes = drivers.filter((d) => !driversWithRoutes.has(d.id) && d.active);

  return (
    <div className="flex flex-col h-full">
      {isDraft && (
        <div className="border-b border-border p-3 space-y-2 bg-muted/20">
          <div className="text-xs font-display font-semibold uppercase tracking-wider text-muted-foreground">
            Add Driver
          </div>
          <div className="flex gap-2">
            <Select value={selectedDriverToAdd} onValueChange={setSelectedDriverToAdd}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Pick a driver..." />
              </SelectTrigger>
              <SelectContent>
                {driversWithoutRoutes.length === 0 ? (
                  <div className="px-2 py-1 text-xs text-muted-foreground">
                    All drivers assigned
                  </div>
                ) : (
                  driversWithoutRoutes.map((d) => (
                    <SelectItem key={d.id} value={d.id} className="text-xs">
                      {d.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              className="text-xs"
              onClick={handleAddRoute}
              disabled={!selectedDriverToAdd || addRoute.isPending}
            >
              <UserCheck className="w-3 h-3 mr-1" /> Add
            </Button>
          </div>
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {plan.routes.length === 0 ? (
            <div className="text-xs text-muted-foreground p-4 text-center">
              No drivers assigned to this plan yet.
            </div>
          ) : (
            plan.routes.map((route, idx) => {
              const driver = drivers.find((d) => d.id === route.driverId);
              const expanded = expandedRoutes.has(route.driverId);
              const color = getDriverColor(idx);
              const routeId = route.routeId ?? `${plan.planId}-${route.driverId}`;
              return (
                <div key={route.driverId} className="border border-border rounded-md bg-background overflow-hidden">
                  <button
                    onClick={() => toggleExpand(route.driverId)}
                    className="w-full flex items-center gap-2 px-2 py-2 hover:bg-muted/40"
                  >
                    <div
                      className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <div className="flex-1 text-left min-w-0">
                      <div className="text-xs font-display font-semibold truncate">
                        {driver?.name ?? route.driverName}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {route.stops.length} stops • {route.totalTimeMinutes.toFixed(0)}min •{" "}
                        {route.totalDistanceKm.toFixed(1)}km
                      </div>
                    </div>
                    {isDraft && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveRoute(routeId);
                        }}
                        className="text-muted-foreground hover:text-tms-error"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                    {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                  {expanded && (
                    <div className="border-t border-border p-2 space-y-1.5">
                      {route.stops.length === 0 ? (
                        <div className="text-[10px] text-muted-foreground text-center py-2">
                          No stops
                        </div>
                      ) : (
                        <SortableContext
                          items={route.stops.map((s) => s.stopId)}
                          strategy={verticalListSortingStrategy}
                        >
                          <div className="space-y-1">
                            {route.stops.map((stop, sIdx) => (
                              <SortableStop
                                key={stop.stopId}
                                stop={stop}
                                routeId={routeId}
                                index={sIdx}
                                onLockToggle={() => handleLockToggle(stop)}
                                onDelete={() => handleDeleteStop(stop)}
                              />
                            ))}
                          </div>
                        </SortableContext>
                      )}
                      {isDraft && unassignedTasks.length > 0 && (
                        <div className="flex gap-1 pt-1">
                          <Select
                            value={taskToAdd[routeId] ?? ""}
                            onValueChange={(v) => setTaskToAdd((p) => ({ ...p, [routeId]: v }))}
                          >
                            <SelectTrigger className="h-7 text-[11px]">
                              <SelectValue placeholder="+ Add task" />
                            </SelectTrigger>
                            <SelectContent>
                              {unassignedTasks.map((t) => (
                                <SelectItem key={t.id} value={t.id} className="text-xs">
                                  <Badge className="mr-1 text-[9px] capitalize" variant="outline">
                                    {t.priority}
                                  </Badge>
                                  {t.title}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2"
                            onClick={() => {
                              const taskId = taskToAdd[routeId];
                              if (taskId) handleAddTask(routeId, taskId);
                            }}
                            disabled={!taskToAdd[routeId] || addTask.isPending}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
        <DragOverlay>
          {activeStop ? (
            <div className="rounded-md border border-primary bg-background px-2 py-1.5 text-xs shadow-lg">
              {activeStop.type === "pickup" ? "↑ " : "↓ "}
              {activeStop.task.title}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
