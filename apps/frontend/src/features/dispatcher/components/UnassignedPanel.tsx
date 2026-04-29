"use client";

import { Badge } from "@/components/ui/badge";
import { ArrowDown, ArrowUp, MapPin } from "lucide-react";
import type { Task, UnassignedTaskInPlan } from "@/types/api";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface Props {
  tasksInPlan: UnassignedTaskInPlan[];
  pendingTasks: Task[];
  selectedTaskId: string | null;
  onSelect: (taskId: string | null) => void;
}

export function UnassignedPanel({
  tasksInPlan,
  pendingTasks,
  selectedTaskId,
  onSelect,
}: Props) {
  const { t } = useTranslation();
  const all = [
    ...tasksInPlan.map((t) => ({
      id: t.taskId,
      title: t.title,
      pickup: t.pickupAddress,
      dropoff: t.dropoffAddress,
      priority: t.priority,
      reason: t.reason,
    })),
    ...pendingTasks.map((t) => ({
      id: t.id,
      title: t.title,
      pickup: t.pickupAddress,
      dropoff: t.dropoffAddress,
      priority: t.priority,
      reason: undefined,
    })),
  ];

  // Deduplicate by id
  const seen = new Set<string>();
  const unique = all.filter((t) => (seen.has(t.id) ? false : seen.add(t.id)));

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border p-3">
        <div className="text-xs uppercase tracking-wider text-muted-foreground font-display font-semibold">
          {t("dispatcher.planning.unassigned")} ({unique.length})
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {unique.length === 0 ? (
          <div className="text-xs text-muted-foreground p-4 text-center">
            {t("dispatcher.planning.assigned")} 🎉
          </div>
        ) : (
          unique.map((task) => {
            const isSelected = selectedTaskId === task.id;
            return (
              <button
                key={task.id}
                onClick={() => onSelect(isSelected ? null : task.id)}
                className={cn(
                  "w-full text-left rounded-md border p-2 hover:border-primary/40 transition-colors",
                  isSelected ? "border-primary bg-primary/5" : "border-border bg-background",
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-display font-semibold truncate flex-1">
                    {task.title}
                  </span>
                  <Badge variant="outline" className="text-[9px] capitalize ms-1">
                    {task.priority}
                  </Badge>
                </div>
                <div className="text-[10px] text-muted-foreground space-y-0.5">
                  <div className="flex items-center gap-1 truncate">
                    <ArrowUp className="w-2.5 h-2.5 text-tms-success flex-shrink-0" />
                    <span className="truncate">{task.pickup}</span>
                  </div>
                  <div className="flex items-center gap-1 truncate">
                    <ArrowDown className="w-2.5 h-2.5 text-tms-error flex-shrink-0" />
                    <span className="truncate">{task.dropoff}</span>
                  </div>
                </div>
                {task.reason && (
                  <div className="mt-1 flex items-start gap-1 text-[10px] text-tms-warning-dark">
                    <MapPin className="w-2.5 h-2.5 mt-0.5 flex-shrink-0" />
                    <span>{task.reason}</span>
                  </div>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
