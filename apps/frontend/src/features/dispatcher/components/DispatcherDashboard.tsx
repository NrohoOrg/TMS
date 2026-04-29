"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Map as MapIcon,
  Plus,
  Route as RouteIcon,
  Sparkles,
  Users,
} from "lucide-react";
import { useDrivers, useMonitor, useTasks, usePlans } from "@/features/shared/hooks";
import { useAuth } from "@/lib/auth-context";
import { useTranslation } from "react-i18next";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function DispatcherDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const today = todayStr();

  const tasksQuery = useTasks({ limit: 1, status: "pending" });
  const driversQuery = useDrivers();
  const monitorQuery = useMonitor(today);
  const plansQuery = usePlans();

  const totalPending = (tasksQuery.data as { total?: number } | undefined)?.total ?? 0;
  const drivers = driversQuery.data ?? [];
  const activeDrivers = drivers.filter((d) => d.active);
  const monitor = monitorQuery.data;
  const todaysPlan = plansQuery.data?.find((p) => p.date === today);

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <PageHeader
        title={`${user?.name ? `${user.name.split(" ")[0]} — ` : ""}${t("dispatcher.dashboard.title")}`}
        subtitle={new Date().toLocaleDateString(i18n.language, {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        })}
        actions={
          <>
            <Button size="sm" variant="outline" onClick={() => router.push("/dispatcher/tasks")}>
              <Plus className="w-4 h-4 me-1" /> {t("dispatcher.tasks.newTask")}
            </Button>
            <Button size="sm" onClick={() => router.push("/dispatcher/planning")}>
              <Sparkles className="w-4 h-4 me-1" /> {t("dispatcher.planning.title")}
            </Button>
          </>
        }
      />

      {/* Stat tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatTile
          label={t("dispatcher.dashboard.pendingTasks")}
          value={tasksQuery.isLoading ? "…" : String(totalPending)}
          icon={ClipboardList}
          tone="info"
          onClick={() => router.push("/dispatcher/tasks?status=pending")}
        />
        <StatTile
          label={t("dispatcher.dashboard.activeDrivers")}
          value={driversQuery.isLoading ? "…" : String(activeDrivers.length)}
          icon={Users}
          onClick={() => router.push("/admin/drivers")}
        />
        <StatTile
          label={t("dispatcher.dashboard.todaysTasks")}
          value={monitorQuery.isLoading ? "…" : String(monitor?.overview.total ?? 0)}
          icon={RouteIcon}
          onClick={() => router.push("/dispatcher/operations")}
        />
        <StatTile
          label={t("dispatcher.dashboard.delays")}
          value={monitorQuery.isLoading ? "…" : String(monitor?.overview.delays ?? 0)}
          icon={AlertTriangle}
          tone={monitor && monitor.overview.delays > 0 ? "warn" : undefined}
          onClick={() => router.push("/dispatcher/operations")}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Today's plan */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-display">{t("dispatcher.dashboard.todaysPlan")}</CardTitle>
            <Button
              size="sm"
              variant="ghost"
              className="text-xs"
              onClick={() => router.push("/dispatcher/planning")}
            >
              {t("dispatcher.dashboard.open")} <ArrowRight className="w-3 h-3 ms-1" />
            </Button>
          </CardHeader>
          <CardContent>
            {plansQuery.isLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : !todaysPlan ? (
              <EmptyState
                icon={RouteIcon}
                title={t("dispatcher.dashboard.noPlanYet")}
                description={t("dispatcher.dashboard.createOrRunOptimizer")}
                action={
                  <Button size="sm" onClick={() => router.push("/dispatcher/planning")}>
                    {t("dispatcher.dashboard.openPlanningWorkspace")}
                  </Button>
                }
              />
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Badge
                    className={
                      todaysPlan.status === "published"
                        ? "bg-tms-success-light text-tms-success-dark"
                        : ""
                    }
                  >
                    {todaysPlan.status === "published" ? (
                      <>
                        <CheckCircle2 className="w-3 h-3 me-1" /> {t("status.published")}
                      </>
                    ) : (
                      t("status.draft")
                    )}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {todaysPlan.taskCount} {t("dispatcher.dashboard.tasks")} • {todaysPlan.routeCount} {t("dispatcher.dashboard.drivers")}
                  </span>
                </div>
                {monitor && monitor.planId === todaysPlan.planId && (
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <Tile label={t("common.completed")} value={monitor.overview.completed} tone="success" />
                    <Tile label={t("common.inProgress")} value={monitor.overview.inProgress} tone="info" />
                    <Tile label={t("common.pending")} value={monitor.overview.pending} />
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick actions */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-display">{t("dispatcher.dashboard.quickLinks")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {[
              { label: t("dispatcher.dashboard.operations"), icon: MapIcon, href: "/dispatcher/operations" },
              { label: t("dispatcher.dashboard.planningWorkspace"), icon: RouteIcon, href: "/dispatcher/planning" },
              { label: t("dispatcher.dashboard.tasksPage"), icon: ClipboardList, href: "/dispatcher/tasks" },
              { label: t("dispatcher.dashboard.driversPage"), icon: Users, href: "/dispatcher/availability" },
            ].map((q) => (
              <button
                key={q.href}
                onClick={() => router.push(q.href)}
                className="w-full flex items-center gap-2 p-2 text-sm rounded-md hover:bg-muted/40 transition-colors"
              >
                <q.icon className="w-4 h-4 text-muted-foreground" />
                <span className="flex-1 text-left">{q.label}</span>
                <ArrowRight className="w-3 h-3 text-muted-foreground" />
              </button>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Recent events */}
      {monitor && monitor.recentEvents.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-display">{t("dispatcher.dashboard.recentActivity")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1">
              {monitor.recentEvents.slice(0, 8).map((e, i) => (
                <li key={i} className="flex items-center gap-2 text-xs">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      e.type === "success"
                        ? "bg-tms-success"
                        : e.type === "warning"
                          ? "bg-tms-warning"
                          : "bg-tms-info"
                    }`}
                  />
                  <span className="font-mono text-[10px] text-muted-foreground">{e.time}</span>
                  <span className="font-medium">{e.driverName}</span>
                  <span className="text-muted-foreground truncate">{e.event}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatTile({
  label,
  value,
  icon: Icon,
  tone,
  onClick,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  tone?: "info" | "warn";
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="text-left rounded-lg border border-border bg-background p-3 hover:border-primary/40 transition-colors"
    >
      <div className="flex items-center justify-between mb-1">
        <Icon
          className={`w-4 h-4 ${
            tone === "warn"
              ? "text-tms-warning"
              : tone === "info"
                ? "text-tms-info"
                : "text-muted-foreground"
          }`}
        />
      </div>
      <div className="text-2xl font-display font-bold">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </button>
  );
}

function Tile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "success" | "info";
}) {
  return (
    <div className="rounded-md border border-border bg-background p-2 text-center">
      <div
        className={`text-lg font-display font-bold ${
          tone === "success"
            ? "text-tms-success-dark"
            : tone === "info"
              ? "text-tms-info-dark"
              : "text-foreground"
        }`}
      >
        {value}
      </div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}
