"use client";

import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CheckCircle2,
  ClipboardList,
  Loader2,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDeletePlan } from "@/features/shared/hooks/useManualPlanning";
import { useToast } from "@/hooks/use-toast";
import type { PlanListItem } from "@/types/api";
import { useTranslation } from "react-i18next";

interface Props {
  plans: PlanListItem[] | undefined;
  isLoading: boolean;
  selectedPlanId: string | null;
  onSelect: (planId: string) => void;
  onOptimize: () => void;
}

export function PlanList({
  plans,
  isLoading,
  selectedPlanId,
  onSelect,
  onOptimize,
}: Props) {
  const deleteMut = useDeletePlan();
  const { toast } = useToast();
  const { t } = useTranslation();

  async function handleDelete(planId: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm("Discard this draft plan?")) return;
    try {
      await deleteMut.mutateAsync(planId);
      toast({ title: t("common.delete") });
    } catch (err) {
      toast({
        title: t("common.deleteFailed"),
        description: err instanceof Error ? err.message : t("common.unknownError"),
        variant: "destructive",
      });
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border p-3 space-y-2">
        <div className="text-xs uppercase tracking-wider text-muted-foreground font-display font-semibold">
          {t("admin.dashboard.plans")}
        </div>
        <Button size="sm" className="w-full text-xs" onClick={onOptimize}>
          ✨ {t("dispatcher.planning.runOptimizer")}
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : !plans || plans.length === 0 ? (
          <div className="text-xs text-muted-foreground p-4 text-center">
            {t("dispatcher.planning.noPlansForDate")}
          </div>
        ) : (
          plans.map((p) => {
            const isSelected = p.planId === selectedPlanId;
            return (
              <div
                key={p.planId}
                role="button"
                tabIndex={0}
                onClick={() => onSelect(p.planId)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect(p.planId);
                  }
                }}
                className={cn(
                  "w-full text-left rounded-md border p-2.5 transition-all hover:border-primary/40 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isSelected
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border bg-background",
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-display font-semibold text-foreground">
                    {format(new Date(p.date), "EEE dd MMM yyyy")}
                  </span>
                  <div className="flex items-center gap-1">
                    {p.status === "published" ? (
                      <Badge className="text-[9px] bg-tms-success-light text-tms-success-dark">
                        <CheckCircle2 className="w-2.5 h-2.5 me-0.5" />
                        {t("status.published")}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[9px]">
                        {t("status.draft")}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <ClipboardList className="w-2.5 h-2.5" /> {p.taskCount} {t("dispatcher.dashboard.tasks")} •{" "}
                    {p.routeCount} {t("dispatcher.dashboard.drivers")}
                  </span>
                  {p.status === "draft" && (
                    <button
                      type="button"
                      onClick={(e) => handleDelete(p.planId, e)}
                      className="text-muted-foreground hover:text-tms-error"
                      disabled={deleteMut.isPending}
                    >
                      {deleteMut.isPending ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Trash2 className="w-3 h-3" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
