"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Plus,
  RefreshCw,
  UserX,
  Zap,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  useDrivers,
  useMarkDriverUnavailable,
  usePreviewDriverUnavailable,
  useRunMidDayReoptimization,
} from "@/features/shared/hooks";
import type {
  DriverUnavailablePreview,
  MidDayResult,
} from "@/lib/api-services";
import { TaskFormDrawer } from "./TaskFormDrawer";
import { useTranslation } from "react-i18next";

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function nowHHMM(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

export default function DispatcherIncidents() {
  const { toast } = useToast();
  const { t: tFn } = useTranslation();

  // Date selector at the page level — drives every API call below so a
  // dispatcher (or tester) can simulate "today" being a different day.
  const [pageDate, setPageDate] = useState(todayStr());

  // ── Add Mid-Day Task ───────────────────────────────────────────────
  const [taskDrawerOpen, setTaskDrawerOpen] = useState(false);
  const [taskUrgent, setTaskUrgent] = useState(false);

  const openAddTask = (urgent: boolean) => {
    setTaskUrgent(urgent);
    setTaskDrawerOpen(true);
  };

  const handleTaskCreated = async (_createdTask: { id: string; priority: string }) => {
    // Both normal and urgent tasks go through mid-day re-optimization — same
    // path as releasing tasks from an unavailable driver. Urgent priority is
    // honoured by the optimizer's penalty (much larger than for normal), so
    // urgent tasks are picked up first; the placement is shown to the
    // dispatcher in the assignments panel below.
    await handleRunMidDay(true);
  };

  // ── Mark Driver Unavailable ────────────────────────────────────────
  const driversQuery = useDrivers();
  const previewUnavailable = usePreviewDriverUnavailable();
  const markUnavailable = useMarkDriverUnavailable();
  const [unavailDriverId, setUnavailDriverId] = useState<string>("");
  const [unavailFromTime, setUnavailFromTime] = useState<string>(nowHHMM());
  // R5.x easy-path: "Until" can be "End of day" (default) or a specific HH:MM.
  // Backend captures the field but does not yet enforce a return time.
  const [unavailUntilMode, setUnavailUntilMode] = useState<"endOfDay" | "atTime">("endOfDay");
  const [unavailToTime, setUnavailToTime] = useState<string>("17:00");
  // Last successful mid-day re-optimization result, shown to the dispatcher
  // so they can see exactly which task moved to which driver.
  const [midDayResult, setMidDayResult] = useState<MidDayResult | null>(null);
  const [unavailPreview, setUnavailPreview] = useState<DriverUnavailablePreview | null>(null);

  const activeDrivers = useMemo(
    () => (driversQuery.data ?? []).filter((d) => d.active),
    [driversQuery.data],
  );

  const handlePreviewUnavailable = async () => {
    if (!unavailDriverId) {
      toast({
        title: tFn("dispatcher.incidents.pickADriver"),
        description: tFn("dispatcher.incidents.selectDriverToMark"),
        variant: "destructive",
      });
      return;
    }
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(unavailFromTime)) {
      toast({
        title: tFn("dispatcher.incidents.invalidTime"),
        description: tFn("dispatcher.incidents.useHHMM"),
        variant: "destructive",
      });
      return;
    }

    try {
      const preview = await previewUnavailable.mutateAsync({
        driverId: unavailDriverId,
        date: pageDate,
      });
      setUnavailPreview(preview);
    } catch (err) {
      toast({
        title: tFn("dispatcher.incidents.previewFailed"),
        description: err instanceof Error ? err.message : tFn("common.unknownError"),
        variant: "destructive",
      });
    }
  };

  const resetUnavailPanel = () => {
    setUnavailPreview(null);
    setUnavailDriverId("");
    setUnavailFromTime(nowHHMM());
  };

  const handleConfirmRelease = async () => {
    if (!unavailPreview) return;
    try {
      const result = await markUnavailable.mutateAsync({
        driverId: unavailPreview.driverId,
        date: unavailPreview.date,
        fromTime: unavailFromTime,
        toTime: unavailUntilMode === "atTime" ? unavailToTime : undefined,
      });
      toast({
        title: tFn("dispatcher.incidents.driverMarkedUnavailable"),
        description:
          result.releasedTaskIds.length > 0
            ? tFn("dispatcher.incidents.tasksReleased", { count: result.releasedTaskIds.length })
            : tFn("dispatcher.incidents.noTasksToRelease"),
      });
      resetUnavailPanel();
    } catch (err) {
      toast({
        title: tFn("dispatcher.incidents.markUnavailableFailed"),
        description: err instanceof Error ? err.message : tFn("common.unknownError"),
        variant: "destructive",
      });
    }
  };

  // ── Mid-day re-optimization ────────────────────────────────────────
  const runMidDay = useRunMidDayReoptimization();

  // Preview-first flow. The first call runs with dryRun=true so the dispatcher
  // sees the proposed assignments and decides whether to commit them.
  const handleRunMidDay = async (silent = false) => {
    try {
      const result = await runMidDay.mutateAsync({ date: pageDate, dryRun: true });
      setMidDayResult(result);
      if (!silent && result.assignments.length === 0) {
        const unassignedNote =
          result.unassigned.length > 0
            ? ` ${tFn("dispatcher.incidents.couldntFit", { count: result.unassigned.length })}`
            : "";
        toast({
          title: tFn("dispatcher.incidents.previewComputed"),
          description: `${tFn("dispatcher.incidents.tasksAssigned", { count: 0 })}${unassignedNote}`,
        });
      }
    } catch (err) {
      toast({
        title: tFn("dispatcher.incidents.reoptimizationFailed"),
        description: err instanceof Error ? err.message : tFn("common.unknownError"),
        variant: "destructive",
      });
    }
  };

  const handleApproveMidDay = async () => {
    if (!midDayResult) return;
    try {
      const result = await runMidDay.mutateAsync({ date: pageDate, dryRun: false });
      setMidDayResult(null);
      toast({
        title: tFn("dispatcher.incidents.reoptimizationComplete"),
        description: tFn("dispatcher.incidents.tasksAssigned", { count: result.assignedCount }),
      });
    } catch (err) {
      toast({
        title: tFn("dispatcher.incidents.reoptimizationFailed"),
        description: err instanceof Error ? err.message : tFn("common.unknownError"),
        variant: "destructive",
      });
    }
  };

  const handleCancelMidDay = () => {
    setMidDayResult(null);
    toast({ title: tFn("dispatcher.incidents.previewDiscarded") });
  };

  return (
    <div className="p-4 sm:p-6 pb-24 sm:pb-6 space-y-4 sm:space-y-6">
      <PageHeader
        title={tFn("dispatcher.incidents.title")}
        subtitle={tFn("dispatcher.incidents.subtitle")}
        actions={
          <div className="flex items-center gap-2">
            <Label className="text-xs">{tFn("common.date")}</Label>
            <Input
              type="date"
              value={pageDate}
              onChange={(e) => setPageDate(e.target.value)}
              className="h-8 w-40 text-xs"
            />
          </div>
        }
      />

      {midDayResult && (
        <Card
          className={
            midDayResult.dryRun
              ? "border-amber-300/60 bg-amber-50/40"
              : "border-tms-info/40 bg-tms-info-light/10"
          }
        >
          <CardContent className="p-4 sm:p-5 space-y-3">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <div
                  className={`h-9 w-9 rounded-md flex items-center justify-center flex-shrink-0 ${
                    midDayResult.dryRun
                      ? "bg-amber-200/60 text-amber-900"
                      : "bg-tms-info/15 text-tms-info"
                  }`}
                >
                  <RefreshCw className="h-4 w-4" />
                </div>
                <h3 className="font-display font-semibold text-sm text-foreground">
                  {midDayResult.dryRun
                    ? tFn("dispatcher.incidents.proposedReassignments")
                    : tFn("dispatcher.incidents.reoptimizationComplete")}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {midDayResult.dryRun ? (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCancelMidDay}
                      disabled={runMidDay.isPending}
                    >
                      {tFn("common.cancel")}
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleApproveMidDay}
                      disabled={
                        runMidDay.isPending ||
                        midDayResult.assignments.length === 0
                      }
                      className="bg-tms-success hover:bg-tms-success-dark"
                    >
                      {runMidDay.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 me-1 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-3.5 w-3.5 me-1" />
                      )}
                      {tFn("dispatcher.incidents.approveAndApply")}
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setMidDayResult(null)}
                  >
                    {tFn("common.dismiss")}
                  </Button>
                )}
              </div>
            </div>

            {midDayResult.assignments.length > 0 && (
              <div className="rounded-md border border-border bg-background p-2.5 space-y-1">
                <ul className="space-y-1 max-h-60 overflow-y-auto">
                  {midDayResult.assignments.map((a) => (
                    <li
                      key={a.taskId}
                      className="text-[11px] flex items-center gap-2 min-w-0"
                    >
                      <CheckCircle2 className="h-3 w-3 text-tms-success flex-shrink-0" />
                      <span className="font-medium text-foreground truncate">
                        {a.taskTitle}
                      </span>
                      <span className="text-muted-foreground flex-shrink-0">→</span>
                      <span className="text-foreground truncate">{a.driverName}</span>
                      <span className="ms-auto text-[9px] font-mono text-muted-foreground flex-shrink-0">
                        #{a.pickupSequence}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {midDayResult.unassigned.length > 0 && (
              <div className="rounded-md border border-tms-warning/30 bg-background p-2.5">
                <p className="text-[11px] text-tms-warning-dark flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                  {tFn("dispatcher.incidents.couldntFit", { count: midDayResult.unassigned.length })}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Add Mid-Day Task */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-md bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                <Plus className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h3 className="font-display font-semibold text-foreground">
                  {tFn("dispatcher.incidents.addMidDayTask")}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {tFn("dispatcher.incidents.addMidDayTaskHint")}
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Button
                onClick={() => openAddTask(false)}
                className="w-full justify-start"
              >
                <Plus className="h-4 w-4 me-2" />
                {tFn("dispatcher.incidents.addTask")}
              </Button>
              <Button
                variant="outline"
                onClick={() => openAddTask(true)}
                className="w-full justify-start border-tms-error/40 text-tms-error hover:bg-tms-error-light/40"
              >
                <Zap className="h-4 w-4 me-2" />
                {tFn("dispatcher.incidents.addUrgentTask")}
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground">
              {tFn("dispatcher.incidents.urgentTasksHint")}
            </p>
          </CardContent>
        </Card>

        {/* Mark Driver Unavailable */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-md bg-tms-warning-light/40 text-tms-warning flex items-center justify-center flex-shrink-0">
                <UserX className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h3 className="font-display font-semibold text-foreground">
                  {tFn("dispatcher.incidents.markDriverUnavailable")}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {tFn("dispatcher.incidents.markDriverUnavailableHint")}
                </p>
              </div>
            </div>

            {unavailPreview === null ? (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">{tFn("roles.driver")}</Label>
                  <Select
                    value={unavailDriverId}
                    onValueChange={setUnavailDriverId}
                    disabled={driversQuery.isLoading || activeDrivers.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={tFn("dispatcher.incidents.pickADriver")} />
                    </SelectTrigger>
                    <SelectContent>
                      {activeDrivers.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">{tFn("dispatcher.incidents.fromTime")}</Label>
                    <Input
                      type="time"
                      value={unavailFromTime}
                      onChange={(e) => setUnavailFromTime(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">{tFn("dispatcher.incidents.until")}</Label>
                    <Select
                      value={unavailUntilMode}
                      onValueChange={(v) => setUnavailUntilMode(v as "endOfDay" | "atTime")}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="endOfDay">{tFn("dispatcher.incidents.endOfDay")}</SelectItem>
                        <SelectItem value="atTime">{tFn("dispatcher.incidents.atTime")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {unavailUntilMode === "atTime" && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">{tFn("dispatcher.incidents.until")}</Label>
                    <Input
                      type="time"
                      value={unavailToTime}
                      onChange={(e) => setUnavailToTime(e.target.value)}
                    />
                    <p className="text-[10px] text-muted-foreground leading-snug">
                      Captured for your record. The driver currently stays off
                      for the rest of the day; mid-day return is not yet
                      enforced by the optimizer.
                    </p>
                  </div>
                )}
                <Button
                  onClick={handlePreviewUnavailable}
                  disabled={previewUnavailable.isPending || !unavailDriverId}
                  className="w-full"
                >
                  {previewUnavailable.isPending && (
                    <Loader2 className="h-4 w-4 me-2 animate-spin" />
                  )}
                  {tFn("dispatcher.incidents.previewImpact")}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="rounded-md border border-border bg-muted/30 p-3 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-foreground">
                      {unavailPreview.driverName}
                    </span>
                    <span className="text-muted-foreground">
                      shift ends {unavailFromTime}
                    </span>
                  </div>
                  {unavailPreview.publishedPlanId === null && (
                    <p className="text-[11px] text-muted-foreground">
                      No published plan today. Only the availability override
                      will be saved.
                    </p>
                  )}
                  {unavailPreview.frozenStopsCount > 0 && (
                    <p className="text-[11px] text-muted-foreground flex items-start gap-1">
                      <CheckCircle2 className="h-3 w-3 mt-0.5 text-tms-success flex-shrink-0" />
                      <span>
                        {unavailPreview.frozenStopsCount} stop
                        {unavailPreview.frozenStopsCount === 1 ? "" : "s"}{" "}
                        already started — will stay on this driver.
                      </span>
                    </p>
                  )}
                  <div className="space-y-1">
                    <p className="text-[11px] font-medium text-foreground">
                      {unavailPreview.affectedTasks.length === 0
                        ? "No tasks to release."
                        : `${unavailPreview.affectedTasks.length} task${unavailPreview.affectedTasks.length === 1 ? "" : "s"} will be released:`}
                    </p>
                    {unavailPreview.affectedTasks.length > 0 && (
                      <ul className="max-h-32 overflow-y-auto space-y-1">
                        {unavailPreview.affectedTasks.map((t) => (
                          <li
                            key={t.taskId}
                            className="text-[11px] text-muted-foreground flex items-start gap-1"
                          >
                            <span className="capitalize text-[9px] uppercase tracking-wider text-foreground/70 mt-0.5">
                              [{t.priority}]
                            </span>
                            <span>{t.title || `${t.pickupAddress} → ${t.dropoffAddress}`}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Button
                    onClick={async () => {
                      await handleConfirmRelease();
                      await handleRunMidDay(true);
                      toast({
                        title: tFn("dispatcher.incidents.driverMarkedUnavailable"),
                        description: tFn("dispatcher.incidents.reoptimizationComplete"),
                      });
                    }}
                    disabled={markUnavailable.isPending || runMidDay.isPending}
                    className="w-full justify-start"
                  >
                    {(markUnavailable.isPending || runMidDay.isPending) && (
                      <Loader2 className="h-4 w-4 me-2 animate-spin" />
                    )}
                    {!(markUnavailable.isPending || runMidDay.isPending) && (
                      <Zap className="h-4 w-4 me-2" />
                    )}
                    {tFn("dispatcher.incidents.confirmRelease")}
                  </Button>
                  <Button
                    onClick={resetUnavailPanel}
                    variant="ghost"
                    className="w-full"
                    disabled={markUnavailable.isPending}
                  >
                    {tFn("common.cancel")}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

      </div>

      <TaskFormDrawer
        open={taskDrawerOpen}
        onOpenChange={setTaskDrawerOpen}
        lockedDate={pageDate}
        lockedPriority={taskUrgent ? "urgent" : "normal"}
        onCreated={handleTaskCreated}
      />
    </div>
  );
}

