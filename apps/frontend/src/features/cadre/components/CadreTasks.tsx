"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Clock,
  ClipboardList,
  Pencil,
  Plus,
  Trash2,
  Truck,
  XCircle,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { TableSkeleton } from "@/components/ui/skeleton";
import {
  useDeleteCadreTask,
  useMyCadreTasks,
} from "@/features/shared/hooks";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { TaskFormDrawer } from "@/features/dispatcher/components/TaskFormDrawer";
import type { CadreDisplayStatus, CadreTaskView, Task } from "@/types/api";

interface Props {
  initialOpenForm?: boolean;
}

const STATUS_KEYS: Record<CadreDisplayStatus, string> = {
  created: "cadre.status.created",
  approved: "cadre.status.approved",
  rejected: "cadre.status.rejected",
  assigned: "cadre.status.assigned",
  started: "cadre.status.started",
  completed: "cadre.status.completed",
};

const STATUS_STYLES: Record<CadreDisplayStatus, string> = {
  created: "bg-muted text-muted-foreground",
  approved: "bg-tms-success-light text-tms-success-dark",
  rejected: "bg-tms-error-light text-tms-error-dark",
  assigned: "bg-blue-100 text-blue-800",
  started: "bg-amber-100 text-amber-800",
  completed: "bg-emerald-100 text-emerald-800",
};

const STATUS_ICONS: Record<CadreDisplayStatus, typeof Clock> = {
  created: Clock,
  approved: CheckCircle2,
  rejected: XCircle,
  assigned: Truck,
  started: Truck,
  completed: CheckCircle2,
};

function formatTime(iso: string) {
  const d = new Date(iso);
  return `${d.toLocaleDateString([], { month: "short", day: "numeric" })} ${d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })}`;
}

export default function CadreTasks({ initialOpenForm = false }: Props) {
  const { toast } = useToast();
  const { t } = useTranslation();
  const tasksQuery = useMyCadreTasks();
  const deleteCadre = useDeleteCadreTask();
  const [drawerOpen, setDrawerOpen] = useState(initialOpenForm);
  const [editing, setEditing] = useState<Task | null>(null);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (initialOpenForm) {
      setEditing(null);
      setDrawerOpen(true);
    }
  }, [initialOpenForm]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const tasks = tasksQuery.data ?? [];

  function canEdit(t: CadreTaskView) {
    return t.approvalStatus !== "approved";
  }

  async function handleDelete(item: CadreTaskView) {
    if (!canEdit(item)) {
      toast({
        title: t("cadre.cannotDeleteApproved"),
        variant: "destructive",
      });
      return;
    }
    if (!confirm(t("cadre.confirmDelete", { title: item.title }))) return;
    try {
      await deleteCadre.mutateAsync(item.id);
      toast({ title: t("cadre.taskDeleted") });
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
        title={t("cadre.title")}
        subtitle={t("cadre.subtitle", { count: tasks.length })}
        actions={
          <Button
            size="sm"
            onClick={() => {
              setEditing(null);
              setDrawerOpen(true);
            }}
          >
            <Plus className="w-4 h-4 me-2" /> {t("cadre.addTask")}
          </Button>
        }
      />

      <Card>
        <CardHeader className="pb-3">
          <p className="text-xs text-muted-foreground">
            {t("cadre.intro")}
          </p>
        </CardHeader>
        <CardContent className="p-0">
          {tasksQuery.isLoading ? (
            <div className="p-4">
              <TableSkeleton rows={5} />
            </div>
          ) : tasksQuery.isError ? (
            <div className="p-4">
              <ErrorState
                message={
                  tasksQuery.error instanceof Error
                    ? tasksQuery.error.message
                    : t("cadre.loadFailed")
                }
                onRetry={() => tasksQuery.refetch()}
              />
            </div>
          ) : tasks.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={ClipboardList}
                title={t("cadre.empty.title")}
                description={t("cadre.empty.description")}
              />
            </div>
          ) : (
            <Table className="[&_th]:border-e [&_th]:border-border [&_th:last-child]:border-e-0 [&_td]:border-e [&_td]:border-border [&_td:last-child]:border-e-0">
              <TableHeader>
                <TableRow>
                  <TableHead>{t("cadre.table.title")}</TableHead>
                  <TableHead>{t("cadre.table.pickupDropoff")}</TableHead>
                  <TableHead>{t("common.time")}</TableHead>
                  <TableHead>{t("common.status")}</TableHead>
                  <TableHead className="w-24">{t("common.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.map((task) => {
                  const Icon = STATUS_ICONS[task.displayStatus];
                  const statusLabel =
                    task.displayStatus === "assigned" && task.assignedDriverName
                      ? t("cadre.assignedTo", { name: task.assignedDriverName })
                      : task.displayStatus === "started" && task.assignedDriverName
                        ? t("cadre.startedBy", { name: task.assignedDriverName })
                        : t(STATUS_KEYS[task.displayStatus]);
                  const editable = canEdit(task);
                  return (
                    <TableRow key={task.id}>
                      <TableCell className="text-sm">{task.title || "—"}</TableCell>
                      <TableCell>
                        <div className="space-y-0.5 text-xs">
                          <div className="flex items-center gap-1">
                            <ArrowUp className="w-3 h-3 text-tms-success" />
                            <span className="truncate max-w-[220px]">{task.pickupAddress}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <ArrowDown className="w-3 h-3 text-tms-error" />
                            <span className="truncate max-w-[220px]">{task.dropoffAddress}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        {formatTime(task.pickupWindowStart)}
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-[10px] inline-flex items-center gap-1 ${STATUS_STYLES[task.displayStatus]}`}>
                          <Icon className="w-3 h-3" />
                          {statusLabel}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            disabled={!editable}
                            onClick={() => {
                              setEditing(task);
                              setDrawerOpen(true);
                            }}
                            title={editable ? t("common.edit") : t("cadre.cannotEditApproved")}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-tms-error"
                            disabled={!editable}
                            onClick={() => handleDelete(task)}
                            title={editable ? t("common.delete") : t("cadre.cannotDeleteApproved")}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <TaskFormDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        task={editing}
        mode="cadre"
      />
    </div>
  );
}
