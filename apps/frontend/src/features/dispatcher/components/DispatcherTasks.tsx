"use client";

import { useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  Search,
  Upload,
  MapPin,
  Clock,
  ArrowDown,
  ArrowUp,
  LayoutList,
  Grid3X3,
  Map,
  Loader2,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  useTasksList,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  useImportTasks,
} from "../hooks";
import type { ApiTask, ApiTaskPriority, ApiTaskStatus, CreateTaskPayload } from "../types";

// â”€â”€ Style maps â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const PRIORITY_STYLES: Record<string, string> = {
  urgent: "bg-tms-error text-destructive-foreground",
  high: "bg-tms-warning text-accent-foreground",
  normal: "bg-muted text-muted-foreground",
  low: "bg-muted/50 text-muted-foreground",
};

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  planned: "bg-tms-info-light text-tms-info-dark",
  assigned: "bg-tms-success-light text-primary",
  in_progress: "bg-tms-warning-light text-tms-warning-dark",
  completed: "bg-tms-success-light text-tms-success-dark",
  cancelled: "bg-tms-error-light text-tms-error-dark",
  pending: "bg-muted text-muted-foreground",
};

// â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function fmtTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "â€”";
  }
}

function toIso(date: string, time: string): string {
  return new Date(`${date}T${time}`).toISOString();
}

function isoToTime(iso: string): string {
  try {
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  } catch {
    return "08:00";
  }
}

function isoToDate(iso: string): string {
  try {
    return new Date(iso).toISOString().slice(0, 10);
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

function mapStatus(status: ApiTaskStatus): string {
  switch (status) {
    case "assigned": return "assigned";
    case "cancelled": return "cancelled";
    default: return "pending";
  }
}

function uiStatusToApi(uiStatus: string): ApiTaskStatus | undefined {
  const map: Record<string, ApiTaskStatus> = {
    draft: "pending",
    assigned: "assigned",
    cancelled: "cancelled",
  };
  return map[uiStatus];
}

// â”€â”€ Blank form state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const TODAY = new Date().toISOString().slice(0, 10);

interface TaskFormState {
  title: string;
  taskDate: string;
  pickupAddress: string;
  pickupLat: string;
  pickupLng: string;
  pickupStart: string;
  pickupEnd: string;
  dropoffAddress: string;
  dropoffLat: string;
  dropoffLng: string;
  dropoffDeadline: string;
  priority: ApiTaskPriority;
  notes: string;
}

const BLANK_FORM: TaskFormState = {
  title: "",
  taskDate: TODAY,
  pickupAddress: "",
  pickupLat: "",
  pickupLng: "",
  pickupStart: "08:00",
  pickupEnd: "09:00",
  dropoffAddress: "",
  dropoffLat: "",
  dropoffLng: "",
  dropoffDeadline: "12:00",
  priority: "normal",
  notes: "",
};

function taskToForm(t: ApiTask): TaskFormState {
  return {
    title: t.title,
    taskDate: isoToDate(t.pickupWindowStart),
    pickupAddress: t.pickupAddress,
    pickupLat: String(t.pickupLat),
    pickupLng: String(t.pickupLng),
    pickupStart: isoToTime(t.pickupWindowStart),
    pickupEnd: isoToTime(t.pickupWindowEnd),
    dropoffAddress: t.dropoffAddress,
    dropoffLat: String(t.dropoffLat),
    dropoffLng: String(t.dropoffLng),
    dropoffDeadline: isoToTime(t.dropoffDeadline),
    priority: t.priority,
    notes: t.notes ?? "",
  };
}

function formToPayload(f: TaskFormState): CreateTaskPayload {
  return {
    title: f.title,
    pickupAddress: f.pickupAddress,
    pickupLat: parseFloat(f.pickupLat),
    pickupLng: parseFloat(f.pickupLng),
    pickupWindowStart: toIso(f.taskDate, f.pickupStart),
    pickupWindowEnd: toIso(f.taskDate, f.pickupEnd),
    dropoffAddress: f.dropoffAddress,
    dropoffLat: parseFloat(f.dropoffLat),
    dropoffLng: parseFloat(f.dropoffLng),
    dropoffDeadline: toIso(f.taskDate, f.dropoffDeadline),
    priority: f.priority,
    notes: f.notes || undefined,
  };
}

// â”€â”€ Shared form fields component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function TaskFormFields({
  form,
  onChange,
}: {
  form: TaskFormState;
  onChange: (patch: Partial<TaskFormState>) => void;
}) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2 col-span-2">
          <Label>Title</Label>
          <Input
            required
            placeholder="Task title"
            value={form.title}
            onChange={(e) => onChange({ title: e.target.value })}
          />
        </div>
        <div className="space-y-2 col-span-2">
          <Label>Task Date</Label>
          <Input
            type="date"
            value={form.taskDate}
            onChange={(e) => onChange({ taskDate: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Pickup Address</Label>
          <Input
            required
            placeholder="Enter pickup location"
            value={form.pickupAddress}
            onChange={(e) => onChange({ pickupAddress: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Dropoff Address</Label>
          <Input
            required
            placeholder="Enter dropoff location"
            value={form.dropoffAddress}
            onChange={(e) => onChange({ dropoffAddress: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Pickup Lat</Label>
          <Input
            required
            type="number"
            step="any"
            placeholder="36.75"
            value={form.pickupLat}
            onChange={(e) => onChange({ pickupLat: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Pickup Lng</Label>
          <Input
            required
            type="number"
            step="any"
            placeholder="3.05"
            value={form.pickupLng}
            onChange={(e) => onChange({ pickupLng: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Dropoff Lat</Label>
          <Input
            required
            type="number"
            step="any"
            placeholder="36.80"
            value={form.dropoffLat}
            onChange={(e) => onChange({ dropoffLat: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Dropoff Lng</Label>
          <Input
            required
            type="number"
            step="any"
            placeholder="3.10"
            value={form.dropoffLng}
            onChange={(e) => onChange({ dropoffLng: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-2">
          <Label>Pickup Earliest</Label>
          <Input
            type="time"
            value={form.pickupStart}
            onChange={(e) => onChange({ pickupStart: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Pickup Latest</Label>
          <Input
            type="time"
            value={form.pickupEnd}
            onChange={(e) => onChange({ pickupEnd: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Delivery Deadline</Label>
          <Input
            type="time"
            value={form.dropoffDeadline}
            onChange={(e) => onChange({ dropoffDeadline: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Priority</Label>
        <Select
          value={form.priority}
          onValueChange={(v) => onChange({ priority: v as ApiTaskPriority })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(["low", "normal", "high", "urgent"] as ApiTaskPriority[]).map(
              (p) => (
                <SelectItem key={p} value={p} className="capitalize">
                  {p}
                </SelectItem>
              ),
            )}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Notes</Label>
        <Textarea
          placeholder="Special instructions for driver..."
          rows={2}
          value={form.notes}
          onChange={(e) => onChange({ notes: e.target.value })}
        />
      </div>
    </>
  );
}

// â”€â”€ Main component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function DispatcherTasks() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"table" | "card" | "map">("table");

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<TaskFormState>(BLANK_FORM);

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<ApiTask | null>(null);
  const [editForm, setEditForm] = useState<TaskFormState>(BLANK_FORM);

  // Delete confirmation dialog
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Bulk import
  const importRef = useRef<HTMLInputElement>(null);

  // â”€â”€ Mutations â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const importTasks = useImportTasks();

  // â”€â”€ API query â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const apiStatus =
    statusFilter !== "all" ? uiStatusToApi(statusFilter) : undefined;

  const { data, isLoading, isError } = useTasksList({
    search: search.trim() || undefined,
    status: apiStatus,
    limit: 100,
  });

  const tasks = data?.items ?? [];

  const filtered = useMemo(() => {
    return tasks.filter(
      (t) => priorityFilter === "all" || t.priority === priorityFilter,
    );
  }, [tasks, priorityFilter]);

  // â”€â”€ Handlers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    createTask.mutate(formToPayload(createForm), {
      onSuccess: () => {
        toast({ title: "Task created" });
        setCreateOpen(false);
        setCreateForm(BLANK_FORM);
      },
      onError: () => {
        toast({ title: "Failed to create task", variant: "destructive" });
      },
    });
  }

  function openEdit(task: ApiTask) {
    setEditingTask(task);
    setEditForm(taskToForm(task));
    setEditOpen(true);
  }

  function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editingTask) return;
    updateTask.mutate(
      { id: editingTask.id, payload: formToPayload(editForm) },
      {
        onSuccess: () => {
          toast({ title: "Task updated" });
          setEditOpen(false);
          setEditingTask(null);
        },
        onError: () => {
          toast({ title: "Failed to update task", variant: "destructive" });
        },
      },
    );
  }

  function openDelete(id: string) {
    setDeleteTargetId(id);
    setDeleteOpen(true);
  }

  function handleDelete() {
    if (!deleteTargetId) return;
    deleteTask.mutate(deleteTargetId, {
      onSuccess: () => {
        toast({ title: "Task deleted" });
        setDeleteOpen(false);
        setDeleteTargetId(null);
      },
      onError: () => {
        toast({ title: "Failed to delete task", variant: "destructive" });
      },
    });
  }

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    importTasks.mutate(file, {
      onSuccess: (result) => {
        toast({
          title: `Import complete: ${result.imported} imported, ${result.failed} failed`,
        });
      },
      onError: () => {
        toast({ title: "Import failed", variant: "destructive" });
      },
    });
    // reset so the same file can be re-imported
    e.target.value = "";
  }

  // â”€â”€ Row actions (shared between table and card) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  function RowActions({ task }: { task: ApiTask }) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => openEdit(task)}>
            <Pencil className="w-3.5 h-3.5 mr-2" /> Edit
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() => openDelete(task.id)}
          >
            <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // â”€â”€ Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  return (
    <div className="p-6 space-y-6">
      {/* Hidden file input for bulk import */}
      <input
        ref={importRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={handleImportFile}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">
            Task Management
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isLoading ? (
              "Loading tasksâ€¦"
            ) : (
              <>
                {data?.total ?? 0} tasks â€¢{" "}
                {tasks.filter((t) => t.status === "pending").length} pending
              </>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={importTasks.isPending}
            onClick={() => importRef.current?.click()}
          >
            {importTasks.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Upload className="w-4 h-4 mr-2" />
            )}
            Bulk Import
          </Button>

          {/* â”€â”€ Create Task Dialog â”€â”€ */}
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" /> Create Task
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle className="font-display">
                  Create New Task
                </DialogTitle>
              </DialogHeader>
              <form
                onSubmit={handleCreate}
                className="space-y-4 mt-2 max-h-[60vh] overflow-y-auto pr-2"
              >
                <TaskFormFields
                  form={createForm}
                  onChange={(patch) =>
                    setCreateForm((prev) => ({ ...prev, ...patch }))
                  }
                />
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCreateOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createTask.isPending}>
                    {createTask.isPending && (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    )}
                    Save Task
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* â”€â”€ Edit Task Dialog â”€â”€ */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">Edit Task</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={handleUpdate}
            className="space-y-4 mt-2 max-h-[60vh] overflow-y-auto pr-2"
          >
            <TaskFormFields
              form={editForm}
              onChange={(patch) =>
                setEditForm((prev) => ({ ...prev, ...patch }))
              }
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateTask.isPending}>
                {updateTask.isPending && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Save Changes
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* â”€â”€ Delete Confirmation Dialog â”€â”€ */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">Delete Task</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this task? This action cannot be
            undone.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setDeleteOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteTask.isPending}
              onClick={handleDelete}
            >
              {deleteTask.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* â”€â”€ Task List Card â”€â”€ */}
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
              <Select value={statusFilter} onValueChange={setStatusFilter}>
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
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
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
                  ["card", Grid3X3],
                  ["map", Map],
                ] as const
              ).map(([mode, Icon]) => (
                <Button
                  key={mode}
                  variant={viewMode === mode ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => setViewMode(mode as "table" | "card" | "map")}
                >
                  <Icon className="w-3.5 h-3.5" />
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading && (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              <span className="text-sm">Loading tasksâ€¦</span>
            </div>
          )}

          {isError && !isLoading && (
            <div className="py-16 text-center text-sm text-destructive">
              Failed to load tasks. Please try again.
            </div>
          )}

          {!isLoading && !isError && filtered.length === 0 && (
            <div className="py-16 text-center text-sm text-muted-foreground">
              No tasks found.
            </div>
          )}

          {!isLoading && !isError && filtered.length > 0 && viewMode === "table" ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Route</TableHead>
                  <TableHead>Time Window</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((t: ApiTask) => (
                  <TableRow
                    key={t.id}
                    className={
                      t.priority === "urgent" ? "bg-tms-error-light/30" : ""
                    }
                  >
                    <TableCell className="font-mono text-sm font-medium">
                      {t.id.slice(0, 8)}
                    </TableCell>
                    <TableCell className="text-sm max-w-[140px] truncate">
                      {t.title}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-0.5 text-xs">
                        <div className="flex items-center gap-1">
                          <ArrowUp className="w-3 h-3 text-tms-success shrink-0" />
                          <span className="truncate max-w-[160px]">
                            {t.pickupAddress}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <ArrowDown className="w-3 h-3 text-tms-error shrink-0" />
                          <span className="truncate max-w-[160px]">
                            {t.dropoffAddress}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs space-y-0.5">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-muted-foreground" />
                          {fmtTime(t.pickupWindowStart)}â€“
                          {fmtTime(t.pickupWindowEnd)}
                        </div>
                        <div className="text-muted-foreground">
                          Deadline: {fmtTime(t.dropoffDeadline)}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={`text-[10px] ${PRIORITY_STYLES[t.priority]}`}
                      >
                        {t.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={`text-[10px] ${STATUS_STYLES[mapStatus(t.status)]}`}
                      >
                        {mapStatus(t.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[120px] truncate">
                      {t.notes || "â€”"}
                    </TableCell>
                    <TableCell>
                      <RowActions task={t} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : !isLoading && !isError && filtered.length > 0 && viewMode === "card" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
              {filtered.map((t: ApiTask) => (
                <Card
                  key={t.id}
                  className={`cursor-pointer hover:shadow-md transition-shadow ${
                    t.priority === "urgent" ? "border-tms-error/40" : ""
                  }`}
                >
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-sm font-medium truncate max-w-[100px]">
                        {t.id.slice(0, 8)}
                      </span>
                      <div className="flex items-center gap-2">
                        <Badge
                          className={`text-[10px] ${PRIORITY_STYLES[t.priority]}`}
                        >
                          {t.priority}
                        </Badge>
                        <RowActions task={t} />
                      </div>
                    </div>
                    <p className="text-xs font-medium truncate">{t.title}</p>
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center gap-1">
                        <ArrowUp className="w-3 h-3 text-tms-success shrink-0" />
                        <span className="truncate">{t.pickupAddress}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <ArrowDown className="w-3 h-3 text-tms-error shrink-0" />
                        <span className="truncate">{t.dropoffAddress}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <Badge
                        className={`text-[10px] ${STATUS_STYLES[mapStatus(t.status)]}`}
                      >
                        {mapStatus(t.status)}
                      </Badge>
                      <span className="text-muted-foreground truncate max-w-[80px]">
                        {t.notes || "â€”"}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : !isLoading && !isError && viewMode === "map" ? (
            <div className="p-8 text-center text-muted-foreground">
              <MapPin className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">
                Map view â€” Requires geocoding integration
              </p>
              <p className="text-xs mt-1">
                Tasks will be plotted on an interactive map when geocoding is
                enabled
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
