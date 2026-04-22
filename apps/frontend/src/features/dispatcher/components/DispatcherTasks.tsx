"use client";

import { useMemo, useRef, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  Plus,
  Search,
  Upload,
  ArrowDown,
  ArrowUp,
  LayoutList,
  Map as MapIcon,
  Trash2,
  Loader2,
  Pencil,
  ClipboardList,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { TableSkeleton } from "@/components/ui/skeleton";
import { useDeleteTask, useImportTasks, useTasks } from "@/features/shared/hooks";
import { useToast } from "@/hooks/use-toast";
import type { Task } from "@/types/api";
import { TaskFormDrawer } from "./TaskFormDrawer";
import { MapView, type MapMarker } from "@/components/map";

const PRIORITY_STYLES: Record<string, string> = {
  urgent: "bg-tms-error text-destructive-foreground",
  high: "bg-tms-warning text-accent-foreground",
  normal: "bg-muted text-muted-foreground",
  low: "bg-muted/50 text-muted-foreground",
};

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  assigned: "bg-tms-success-light text-primary",
  cancelled: "bg-tms-error-light text-tms-error-dark",
};

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
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
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [page, setPage] = useState(0);
  const [view, setView] = useState<"table" | "map">("table");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data, isLoading, isError, error, refetch } = useTasks({
    page,
    limit: 50,
    status: statusFilter !== "all" ? statusFilter : undefined,
    priority: priorityFilter !== "all" ? priorityFilter : undefined,
  });

  const deleteTask = useDeleteTask();
  const importTasks = useImportTasks();

  const tasks = useMemo(() => tasksFromResponse(data), [data]);
  const total = useMemo(() => totalFromResponse(data), [data]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tasks;
    return tasks.filter(
      (t) =>
        t.id.toLowerCase().includes(q) ||
        (t.title ?? "").toLowerCase().includes(q) ||
        t.pickupAddress.toLowerCase().includes(q) ||
        t.dropoffAddress.toLowerCase().includes(q),
    );
  }, [tasks, search]);

  const pendingCount = tasks.filter((t) => t.status === "pending").length;

  const mapMarkers: MapMarker[] = useMemo(() => {
    const out: MapMarker[] = [];
    filtered.forEach((t) => {
      out.push({
        id: `${t.id}-pickup`,
        position: [t.pickupLat, t.pickupLng],
        kind: "pickup",
        label: "P",
        popup: (
          <div className="text-xs">
            <div className="font-display font-semibold">{t.title}</div>
            <div className="text-muted-foreground">{t.pickupAddress}</div>
          </div>
        ),
        onClick: () => {
          setEditing(t);
          setDrawerOpen(true);
        },
      });
      out.push({
        id: `${t.id}-dropoff`,
        position: [t.dropoffLat, t.dropoffLng],
        kind: "dropoff",
        label: "D",
        popup: (
          <div className="text-xs">
            <div className="font-display font-semibold">{t.title}</div>
            <div className="text-muted-foreground">{t.dropoffAddress}</div>
          </div>
        ),
        onClick: () => {
          setEditing(t);
          setDrawerOpen(true);
        },
      });
    });
    return out;
  }, [filtered]);

  async function handleDelete(id: string) {
    if (!confirm("Delete this task?")) return;
    try {
      await deleteTask.mutateAsync(id);
      toast({ title: "Task deleted" });
    } catch (err) {
      toast({
        title: "Delete failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    }
  }

  async function handleImport(file: File) {
    try {
      const res = await importTasks.mutateAsync(file);
      const errors = res.errors ?? [];
      if (errors.length > 0) {
        toast({
          title: `Imported ${res.created} • ${errors.length} errors`,
          description: errors
            .slice(0, 3)
            .map((e) => `Row ${e.row}: ${e.message}`)
            .join("; "),
          variant: "destructive",
        });
      } else {
        toast({ title: `Imported ${res.created} tasks` });
      }
    } catch (err) {
      toast({
        title: "Import failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    }
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Task Management"
        subtitle={`${total} tasks total • ${pendingCount} pending`}
        actions={
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleImport(f);
                e.target.value = "";
              }}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={importTasks.isPending}
            >
              {importTasks.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Upload className="w-4 h-4 mr-2" />
              )}
              Bulk Import (CSV)
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setEditing(null);
                setDrawerOpen(true);
              }}
            >
              <Plus className="w-4 h-4 mr-2" /> Create Task
            </Button>
          </>
        }
      />

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-3 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search tasks..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
                <SelectTrigger className="w-36 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  {["pending", "assigned", "cancelled"].map((s) => (
                    <SelectItem key={s} value={s} className="capitalize">
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={(v) => { setPriorityFilter(v); setPage(0); }}>
                <SelectTrigger className="w-32 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priority</SelectItem>
                  {["urgent", "high", "normal", "low"].map((p) => (
                    <SelectItem key={p} value={p} className="capitalize">
                      {p}
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
                message={error instanceof Error ? error.message : "Unable to load tasks"}
                onRetry={() => refetch()}
              />
            </div>
          ) : view === "map" ? (
            filtered.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon={ClipboardList}
                  title="No tasks to map"
                  description="Create a task or adjust your filters."
                />
              </div>
            ) : (
              <div className="p-4">
                <MapView markers={mapMarkers} height={520} />
              </div>
            )
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Route</TableHead>
                  <TableHead>Time Window</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10">
                      <EmptyState
                        icon={ClipboardList}
                        title="No tasks found"
                        description="Try adjusting filters or create one."
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((t) => (
                    <TableRow
                      key={t.id}
                      className={t.priority === "urgent" ? "bg-tms-error-light/30" : ""}
                    >
                      <TableCell className="font-mono text-xs font-medium">
                        {t.id.slice(0, 8)}
                      </TableCell>
                      <TableCell className="text-sm">{t.title || "—"}</TableCell>
                      <TableCell>
                        <div className="space-y-0.5 text-xs">
                          <div className="flex items-center gap-1">
                            <ArrowUp className="w-3 h-3 text-tms-success" />
                            <span className="truncate max-w-[180px]">{t.pickupAddress}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <ArrowDown className="w-3 h-3 text-tms-error" />
                            <span className="truncate max-w-[180px]">{t.dropoffAddress}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs space-y-0.5">
                          <div>
                            {formatTime(t.pickupWindowStart)}–{formatTime(t.pickupWindowEnd)}
                          </div>
                          <div className="text-muted-foreground">
                            ⏰ {formatTime(t.dropoffDeadline)}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-[10px] ${PRIORITY_STYLES[t.priority]}`}>
                          {t.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`text-[10px] ${STATUS_STYLES[t.status] ?? STATUS_STYLES.pending}`}
                        >
                          {t.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => {
                              setEditing(t);
                              setDrawerOpen(true);
                            }}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-tms-error"
                            onClick={() => handleDelete(t.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <TaskFormDrawer open={drawerOpen} onOpenChange={setDrawerOpen} task={editing} />
    </div>
  );
}
