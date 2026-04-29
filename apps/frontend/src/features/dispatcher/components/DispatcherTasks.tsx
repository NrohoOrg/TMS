"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle,
  Plus,
  Search,
  ArrowDown,
  ArrowUp,
  Check,
  CheckCircle2,
  LayoutList,
  Loader2,
  Map as MapIcon,
  RefreshCw,
  Sparkles,
  Trash2,
  Pencil,
  ClipboardList,
  Users,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { TableSkeleton } from "@/components/ui/skeleton";
import {
  useApproveTask,
  useDeleteTask,
  useDrivers,
  useJobStatus,
  useRejectTask,
  useRunMidDayReoptimization,
  useTasks,
  useTriggerOptimize,
} from "@/features/shared/hooks";
import type { MidDayResult } from "@/lib/api-services";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import type { Task } from "@/types/api";
import { TaskFormDrawer } from "./TaskFormDrawer";
import { ImpactStrip } from "./ImpactStrip";
import { MapView, getDriverColor, type MapMarker, type MapRoute } from "@/components/map";

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

const PRIORITY_STYLES: Record<string, string> = {
  urgent: "bg-tms-error text-destructive-foreground",
  normal: "bg-muted text-muted-foreground",
};

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  assigned: "bg-tms-success-light text-primary",
  cancelled: "bg-tms-error-light text-tms-error-dark",
};

function formatTime(iso: string) {
  const d = new Date(iso);
  const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
  const isToday = d.toDateString() === new Date().toDateString();
  return isToday ? time : `${d.toLocaleDateString([], { month: "short", day: "numeric" })} ${time}`;
}

function tasksFromResponse(data: unknown): Task[] {
  if (!data) return [];
  if (Array.isArray(data)) return data as Task[];
  const obj = data as { data?: Task[]; items?: Task[] };
  return obj.data ?? obj.items ?? [];
}

function totalFromResponse(data: unknown): number {
  if (!data) return 0;
  if (Array.isArray(data)) return data.length;
  const obj = data as { total?: number };
  return obj.total ?? tasksFromResponse(data).length;
}

export default function DispatcherTasks() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [view, setView] = useState<"table" | "map">("table");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [optimizeDialogOpen, setOptimizeDialogOpen] = useState(false);
  const [optimizeDate, setOptimizeDate] = useState(todayStr());
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  const { data, isLoading, isError, error, refetch } = useTasks({
    page,
    limit: 50,
    status: statusFilter !== "all" ? statusFilter : undefined,
    priority: priorityFilter !== "all" ? priorityFilter : undefined,
  });

  const deleteTask = useDeleteTask();
  const approveTask = useApproveTask();
  const rejectTask = useRejectTask();
  const runMidDay = useRunMidDayReoptimization();
  const driversQuery = useDrivers();
  const triggerOptimize = useTriggerOptimize();
  const jobStatusQuery = useJobStatus(activeJobId);

  // Smart prompt after approval: if a published plan exists for the approved
  // task's date, show a preview of how it would be inserted via mid-day
  // re-optimization. Dispatcher can apply or dismiss without leaving the page.
  const [reoptPreview, setReoptPreview] = useState<MidDayResult | null>(null);

  const activeDrivers = (driversQuery.data ?? []).filter((d) => d.active);

  // Watch the optimization job: navigate to Planning on success, toast on failure.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!jobStatusQuery.data) return;
    const { status, planId, error: jobError } = jobStatusQuery.data;
    if (status === "completed" && planId) {
      toast({ title: t("dispatcher.tasks.planGenerated"), description: t("dispatcher.tasks.optimizationComplete") });
      setActiveJobId(null);
      setOptimizeDialogOpen(false);
      router.push("/dispatcher/planning");
    } else if (status === "failed") {
      toast({
        title: t("dispatcher.tasks.optimizationFailed"),
        description: jobError ?? t("common.unknownError"),
        variant: "destructive",
      });
      setActiveJobId(null);
    }
  }, [jobStatusQuery.data, router, toast, t]);
  /* eslint-enable react-hooks/set-state-in-effect */

  async function handleConfirmOptimize() {
    try {
      const res = await triggerOptimize.mutateAsync({
        date: optimizeDate,
        returnToDepot: true,
      });
      setActiveJobId(res.jobId);
      toast({ title: t("dispatcher.tasks.optimizationQueued") });
    } catch (err) {
      toast({
        title: t("dispatcher.tasks.optimizationFailedToStart"),
        description: err instanceof Error ? err.message : t("common.unknownError"),
        variant: "destructive",
      });
    }
  }

  const tasks = useMemo(() => tasksFromResponse(data), [data]);
  const total = useMemo(() => totalFromResponse(data), [data]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tasks;
    return tasks.filter(
      (task) =>
        (task.title ?? "").toLowerCase().includes(q) ||
        task.pickupAddress.toLowerCase().includes(q) ||
        task.dropoffAddress.toLowerCase().includes(q),
    );
  }, [tasks, search]);

  const pendingApproval = useMemo(
    () => filtered.filter((t) => t.approvalStatus === "pending_approval"),
    [filtered],
  );
  const standardTasks = useMemo(
    () => filtered.filter((t) => t.approvalStatus !== "pending_approval"),
    [filtered],
  );

  async function handleApprove(task: Task) {
    try {
      await approveTask.mutateAsync(task.id);
      toast({ title: "Task approved" });
    } catch (err) {
      toast({
        title: "Approve failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
      return;
    }

    // Smart prompt: if a published plan exists for this task's date, the
    // mid-day re-optimizer will surface where the new task could slot in.
    // No published plan → empty assignments → dialog stays closed.
    try {
      const taskDate = task.pickupWindowStart.slice(0, 10);
      const preview = await runMidDay.mutateAsync({ date: taskDate, dryRun: true });
      if (preview.assignments.length > 0) {
        setReoptPreview(preview);
      }
    } catch {
      // Preview is best-effort. If it errors, just stay silent — the task is
      // already approved and will be picked up by the next run.
    }
  }

  async function handleApplyReopt() {
    if (!reoptPreview) return;
    try {
      const applied = await runMidDay.mutateAsync({
        date: reoptPreview.date,
        dryRun: false,
      });
      setReoptPreview(null);
      toast({
        title: "Plan updated",
        description: `${applied.assignedCount} task(s) inserted.`,
      });
    } catch (err) {
      toast({
        title: "Could not update plan",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    }
  }

  async function handleReject(task: Task) {
    try {
      await rejectTask.mutateAsync(task.id);
      toast({ title: "Task rejected" });
    } catch (err) {
      toast({
        title: "Reject failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    }
  }

  const pendingCount = tasks.filter((task) => task.status === "pending").length;

  const pendingForDateCount = useMemo(() => {
    return tasks.filter(
      (task) =>
        task.status === "pending" &&
        new Date(task.pickupWindowStart).toISOString().slice(0, 10) === optimizeDate,
    ).length;
  }, [tasks, optimizeDate]);

  const mapMarkers: MapMarker[] = useMemo(() => {
    const out: MapMarker[] = [];
    filtered.forEach((task, idx) => {
      const color = getDriverColor(idx);
      out.push({
        id: `${task.id}-pickup`,
        position: [task.pickupLat, task.pickupLng],
        kind: "pickup",
        label: "P",
        color,
        popup: (
          <div className="text-xs">
            <div className="font-display font-semibold">{task.title}</div>
            <div className="text-muted-foreground">Pickup — {task.pickupAddress}</div>
          </div>
        ),
        onClick: () => {
          setEditing(task);
          setDrawerOpen(true);
        },
      });
      out.push({
        id: `${task.id}-dropoff`,
        position: [task.dropoffLat, task.dropoffLng],
        kind: "dropoff",
        label: "D",
        color,
        popup: (
          <div className="text-xs">
            <div className="font-display font-semibold">{task.title}</div>
            <div className="text-muted-foreground">Dropoff — {task.dropoffAddress}</div>
          </div>
        ),
        onClick: () => {
          setEditing(task);
          setDrawerOpen(true);
        },
      });
    });
    return out;
  }, [filtered]);

  const mapRoutes: MapRoute[] = useMemo(
    () =>
      filtered.map((task, idx) => ({
        id: `${task.id}-link`,
        color: getDriverColor(idx),
        useOsrm: false,
        stops: [
          [task.pickupLat, task.pickupLng],
          [task.dropoffLat, task.dropoffLng],
        ],
      })),
    [filtered],
  );

  async function handleDelete(id: string) {
    if (!confirm(t("dispatcher.tasks.confirmDelete"))) return;
    try {
      await deleteTask.mutateAsync(id);
      toast({ title: t("dispatcher.tasks.taskDeleted") });
    } catch (err) {
      toast({
        title: t("common.deleteFailed"),
        description: err instanceof Error ? err.message : t("common.unknownError"),
        variant: "destructive",
      });
    }
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <PageHeader
        title={t("dispatcher.tasks.title")}
        subtitle={t("dispatcher.tasks.totalSummary", { total, pending: pendingCount })}
        actions={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setOptimizeDialogOpen(true)}
              disabled={triggerOptimize.isPending || activeJobId !== null}
            >
              {activeJobId ? (
                <Loader2 className="w-4 h-4 me-2 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 me-2" />
              )}
              {t("dispatcher.tasks.runOptimizer")}
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setEditing(null);
                setDrawerOpen(true);
              }}
            >
              <Plus className="w-4 h-4 me-2" /> {t("dispatcher.tasks.createTask")}
            </Button>
          </div>
        }
      />

      <ImpactStrip />

      {pendingApproval.length > 0 && (
        <Card className="border-amber-300/60 bg-amber-50/40">
          <CardHeader className="pb-3">
            <h3 className="text-sm font-display font-semibold text-amber-900">
              {t("dispatcher.tasks.pendingApprovalTitle", {
                count: pendingApproval.length,
              })}
            </h3>
            <p className="text-xs text-muted-foreground">
              {t("dispatcher.tasks.pendingApprovalHint")}
            </p>
          </CardHeader>
          <CardContent className="p-0">
            <Table className="[&_th]:border-e [&_th]:border-border [&_th:last-child]:border-e-0 [&_td]:border-e [&_td]:border-border [&_td:last-child]:border-e-0">
              <TableHeader>
                <TableRow>
                  <TableHead>{t("dispatcher.tasks.tableTitle")}</TableHead>
                  <TableHead>{t("dispatcher.tasks.tablePickup")}</TableHead>
                  <TableHead>{t("common.time")}</TableHead>
                  <TableHead>{t("dispatcher.tasks.tablePriority")}</TableHead>
                  <TableHead>{t("dispatcher.tasks.tableStatus")}</TableHead>
                  <TableHead className="w-24">{t("dispatcher.tasks.tableActions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingApproval.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell className="text-sm">{task.title || "—"}</TableCell>
                    <TableCell>
                      <div className="space-y-0.5 text-xs">
                        <div className="flex items-center gap-1">
                          <ArrowUp className="w-3 h-3 text-tms-success" />
                          <span className="truncate max-w-[180px]">{task.pickupAddress}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <ArrowDown className="w-3 h-3 text-tms-error" />
                          <span className="truncate max-w-[180px]">{task.dropoffAddress}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      {formatTime(task.pickupWindowStart)}
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-[10px] ${PRIORITY_STYLES[task.priority]}`}>
                        {t(`priority.${task.priority}`)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className="text-[10px] bg-amber-200 text-amber-900">
                        {t("dispatcher.tasks.awaitingApproval")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-tms-success hover:bg-tms-success-light"
                          disabled={approveTask.isPending}
                          onClick={() => handleApprove(task)}
                          title={t("dispatcher.tasks.approve")}
                        >
                          <Check className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-tms-error hover:bg-tms-error-light"
                          disabled={rejectTask.isPending}
                          onClick={() => handleReject(task)}
                          title={t("dispatcher.tasks.reject")}
                        >
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-3 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder={t("dispatcher.tasks.searchPlaceholder")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="ps-9 h-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                <SelectTrigger className="w-36 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("dispatcher.tasks.allStatuses")}</SelectItem>
                  {["pending", "assigned", "cancelled"].map((s) => (
                    <SelectItem key={s} value={s} className="capitalize">
                      {t(`status.${s}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={(v) => { setPriorityFilter(v); setPage(1); }}>
                <SelectTrigger className="w-32 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("dispatcher.tasks.allPriorities")}</SelectItem>
                  {["urgent", "normal"].map((p) => (
                    <SelectItem key={p} value={p} className="capitalize">
                      {t(`priority.${p}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-1 border border-border rounded-md p-0.5">
              {(
                [
                  ["table", LayoutList],
                  ["map", MapIcon],
                ] as const
              ).map(([mode, Icon]) => (
                <Button
                  key={mode}
                  variant={view === mode ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => setView(mode)}
                >
                  <Icon className="w-3.5 h-3.5" />
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4">
              <TableSkeleton rows={6} />
            </div>
          ) : isError ? (
            <div className="p-4">
              <ErrorState
                message={error instanceof Error ? error.message : t("common.unknownError")}
                onRetry={() => refetch()}
              />
            </div>
          ) : view === "map" ? (
            filtered.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon={ClipboardList}
                  title={t("dispatcher.tasks.noTasksToMap")}
                  description={t("dispatcher.tasks.createFirst")}
                />
              </div>
            ) : (
              <div className="p-4">
                <MapView markers={mapMarkers} routes={mapRoutes} height={520} />
              </div>
            )
          ) : (
            <Table className="[&_th]:border-e [&_th]:border-border [&_th:last-child]:border-e-0 [&_td]:border-e [&_td]:border-border [&_td:last-child]:border-e-0">
              <TableHeader>
                <TableRow>
                  <TableHead>{t("dispatcher.tasks.tableTitle")}</TableHead>
                  <TableHead>{t("dispatcher.tasks.tablePickup")}</TableHead>
                  <TableHead>{t("common.time")}</TableHead>
                  <TableHead>{t("dispatcher.tasks.tablePriority")}</TableHead>
                  <TableHead>{t("dispatcher.tasks.tableStatus")}</TableHead>
                  <TableHead className="w-24">{t("dispatcher.tasks.tableActions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {standardTasks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10">
                      <EmptyState
                        icon={ClipboardList}
                        title={t("dispatcher.tasks.noTasksFound")}
                        description={t("dispatcher.tasks.createFirst")}
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {standardTasks.map((task) => (
                      <TableRow
                        key={task.id}
                        className={task.priority === "urgent" ? "bg-tms-error-light/30" : ""}
                      >
                        <TableCell className="text-sm">{task.title || "—"}</TableCell>
                        <TableCell>
                          <div className="space-y-0.5 text-xs">
                            <div className="flex items-center gap-1">
                              <ArrowUp className="w-3 h-3 text-tms-success" />
                              <span className="truncate max-w-[180px]">{task.pickupAddress}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <ArrowDown className="w-3 h-3 text-tms-error" />
                              <span className="truncate max-w-[180px]">{task.dropoffAddress}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs">
                            {formatTime(task.pickupWindowStart)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={`text-[10px] ${PRIORITY_STYLES[task.priority]}`}>
                            {t(`priority.${task.priority}`)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={`text-[10px] ${STATUS_STYLES[task.status] ?? STATUS_STYLES.pending}`}
                          >
                            {t(`status.${task.status}`)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => {
                                setEditing(task);
                                setDrawerOpen(true);
                              }}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-tms-error"
                              onClick={() => handleDelete(task.id)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <TaskFormDrawer open={drawerOpen} onOpenChange={setDrawerOpen} task={editing} />

      <Dialog
        open={optimizeDialogOpen}
        onOpenChange={(o) => {
          // Don't allow closing while a job is running
          if (!activeJobId) setOptimizeDialogOpen(o);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("dispatcher.tasks.runOptimizer")}</DialogTitle>
          </DialogHeader>

          {activeJobId && jobStatusQuery.data ? (
            <div className="space-y-3 py-2">
              <div className="text-sm">
                {t("dispatcher.tasks.optimizing")} ({jobStatusQuery.data.status})
              </div>
              <Progress value={jobStatusQuery.data.progressPercent} className="h-2" />
              <div className="text-xs text-muted-foreground text-center">
                {jobStatusQuery.data.progressPercent}%
              </div>
            </div>
          ) : (
            <div className="space-y-3 py-1">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">{t("dispatcher.tasks.optimizationDate")}</label>
                <Input
                  type="date"
                  value={optimizeDate}
                  onChange={(e) => setOptimizeDate(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div className="text-sm">
                <strong>{pendingForDateCount}</strong> {t("dispatcher.tasks.pendingShort")}
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span>
                  <strong>{activeDrivers.length}</strong> {t("dispatcher.dashboard.activeDrivers")}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {t("dispatcher.tasks.optimizationDescription")}
              </p>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setOptimizeDialogOpen(false)}
              disabled={!!activeJobId}
            >
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleConfirmOptimize}
              disabled={
                triggerOptimize.isPending ||
                activeJobId !== null ||
                pendingForDateCount === 0 ||
                activeDrivers.length === 0
              }
            >
              {triggerOptimize.isPending || activeJobId ? (
                <Loader2 className="w-4 h-4 me-2 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 me-2" />
              )}
              {activeJobId ? t("dispatcher.tasks.optimizing") : t("dispatcher.tasks.queueOptimization")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Smart prompt: mid-day re-optimization preview shown right after a
          Cadre task is approved if a published plan exists for that date. */}
      <Dialog
        open={!!reoptPreview}
        onOpenChange={(o) => {
          if (!o && !runMidDay.isPending) setReoptPreview(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-amber-700" />
              Insert into today&apos;s plan?
            </DialogTitle>
          </DialogHeader>

          {reoptPreview && (
            <div className="space-y-3 py-1">
              <p className="text-xs text-muted-foreground">
                A published plan already exists for{" "}
                <span className="font-medium text-foreground">
                  {reoptPreview.date}
                </span>
                . The newly approved task can be slotted in now. Review and
                apply, or dismiss to leave today&apos;s plan untouched.
              </p>

              <div className="rounded-md border border-border bg-background p-2.5">
                <ul className="space-y-1 max-h-60 overflow-y-auto">
                  {reoptPreview.assignments.map((a) => (
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

              {reoptPreview.unassigned.length > 0 && (
                <div className="rounded-md border border-tms-warning/30 bg-background p-2.5">
                  <p className="text-[11px] text-tms-warning-dark flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                    {reoptPreview.unassigned.length} couldn&apos;t fit.
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setReoptPreview(null)}
              disabled={runMidDay.isPending}
            >
              Dismiss
            </Button>
            <Button
              onClick={handleApplyReopt}
              disabled={runMidDay.isPending}
              className="bg-tms-success hover:bg-tms-success-dark"
            >
              {runMidDay.isPending ? (
                <Loader2 className="w-4 h-4 me-2 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4 me-2" />
              )}
              Approve &amp; apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
