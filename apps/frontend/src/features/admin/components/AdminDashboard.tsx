"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Map as MapIcon,
  Route as RouteIcon,
  Users,
} from "lucide-react";
import {
  useAdminHealth,
  useAdminUsers,
  useDrivers,
  useMonitor,
  usePlans,
  useTasks,
} from "@/features/shared/hooks";
import { useAuth } from "@/lib/auth-context";
import { useTranslation } from "react-i18next";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function AdminDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const { t: tFn } = useTranslation();

  const usersQuery = useAdminUsers();
  const driversQuery = useDrivers();
  const tasksQuery = useTasks({ limit: 1 });
  const plansQuery = usePlans();
  const monitorQuery = useMonitor(todayStr());
  const healthQuery = useAdminHealth({ refetchIntervalMs: 30_000 });

  const totalTasks = (tasksQuery.data as { total?: number } | undefined)?.total ?? 0;
  const todaysPlan = plansQuery.data?.find((p) => p.date === todayStr());
  const monitor = monitorQuery.data;
  const health = healthQuery.data;
  const allHealthy = health?.status === "ok";

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <PageHeader
        title={`${user?.name ? `${user.name.split(" ")[0]} — ` : ""}${tFn("admin.dashboard.title")}`}
        subtitle={tFn("admin.dashboard.subtitle")}
        actions={
          <>
            <Button size="sm" variant="outline" onClick={() => router.push("/admin/map")}>
              <MapIcon className="w-4 h-4 me-1" /> {tFn("admin.dashboard.liveMap")}
            </Button>
            <Button size="sm" onClick={() => router.push("/admin/health")}>
              <Activity className="w-4 h-4 me-1" /> {tFn("admin.dashboard.health")}
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <StatTile
          icon={Users}
          label={tFn("admin.dashboard.users")}
          value={usersQuery.isLoading ? "…" : String(usersQuery.data?.length ?? 0)}
          onClick={() => router.push("/admin/users")}
        />
        <StatTile
          icon={Users}
          label={tFn("admin.dashboard.drivers")}
          value={driversQuery.isLoading ? "…" : String(driversQuery.data?.length ?? 0)}
          onClick={() => router.push("/admin/drivers")}
        />
        <StatTile
          icon={ClipboardList}
          label={tFn("admin.dashboard.tasks")}
          value={tasksQuery.isLoading ? "…" : String(totalTasks)}
          onClick={() => router.push("/dispatcher/tasks")}
        />
        <StatTile
          icon={RouteIcon}
          label={tFn("admin.dashboard.plans")}
          value={plansQuery.isLoading ? "…" : String(plansQuery.data?.length ?? 0)}
          onClick={() => router.push("/dispatcher/planning")}
        />
        <StatTile
          icon={Activity}
          label={tFn("admin.dashboard.system")}
          value={healthQuery.isLoading ? "…" : allHealthy ? tFn("common.ok") : tFn("common.issue")}
          tone={allHealthy ? "success" : "warn"}
          onClick={() => router.push("/admin/health")}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-display">{tFn("admin.dashboard.todaysOperations")}</CardTitle>
            <Button size="sm" variant="ghost" onClick={() => router.push("/dispatcher/operations")}>
              {tFn("admin.dashboard.openOperations")} <ArrowRight className="w-3 h-3 ms-1" />
            </Button>
          </CardHeader>
          <CardContent>
            {monitorQuery.isLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : !monitor || !monitor.planId ? (
              <p className="text-sm text-muted-foreground">{tFn("admin.dashboard.noPublishedPlan")}</p>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-4 gap-2 text-xs">
                  <Tile label={tFn("admin.dashboard.total")} value={monitor.overview.total} />
                  <Tile label={tFn("admin.dashboard.done")} value={monitor.overview.completed} tone="success" />
                  <Tile label={tFn("admin.dashboard.inProgress")} value={monitor.overview.inProgress} tone="info" />
                  <Tile
                    label={tFn("admin.dashboard.delays")}
                    value={monitor.overview.delays}
                    tone={monitor.overview.delays > 0 ? "warn" : undefined}
                  />
                </div>
                {todaysPlan && (
                  <div className="text-xs text-muted-foreground">
                    {tFn("dispatcher.dashboard.planTasksDrivers", { planId: todaysPlan.planId.slice(0, 8), tasks: todaysPlan.taskCount, drivers: todaysPlan.routeCount })}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-display">{tFn("admin.dashboard.systemHealth")}</CardTitle>
          </CardHeader>
          <CardContent>
            {healthQuery.isLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : healthQuery.isError ? (
              <ErrorState message={tFn("admin.dashboard.healthCheckFailed")} onRetry={() => healthQuery.refetch()} />
            ) : (
              <div className="space-y-2">
                <HealthRow label={tFn("admin.dashboard.database")} healthy={health?.services.db === "ok"} />
                <HealthRow label={tFn("admin.dashboard.redis")} healthy={health?.services.redis === "ok"} />
                <HealthRow label={tFn("admin.dashboard.optimizer")} healthy={health?.services.optimizer === "ok"} />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent users */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-display">{tFn("admin.dashboard.recentUsers")}</CardTitle>
          <Button size="sm" variant="ghost" onClick={() => router.push("/admin/users")}>
            {tFn("admin.dashboard.manage")} <ArrowRight className="w-3 h-3 ms-1" />
          </Button>
        </CardHeader>
        <CardContent>
          {usersQuery.isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            <ul className="space-y-1">
              {(usersQuery.data ?? []).slice(0, 6).map((u) => (
                <li
                  key={u.id}
                  className="flex items-center justify-between border-b border-border last:border-0 py-1.5"
                >
                  <div>
                    <div className="text-sm font-medium">{u.name ?? u.email}</div>
                    <div className="text-[10px] text-muted-foreground">{u.email}</div>
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    {u.role}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  tone,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  tone?: "success" | "warn";
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="text-left rounded-lg border border-border bg-background p-3 hover:border-primary/40 transition-colors"
    >
      <Icon
        className={`w-4 h-4 mb-1 ${
          tone === "warn"
            ? "text-tms-warning"
            : tone === "success"
              ? "text-tms-success"
              : "text-muted-foreground"
        }`}
      />
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
  tone?: "success" | "info" | "warn";
}) {
  return (
    <div className="rounded-md border border-border bg-background p-2 text-center">
      <div
        className={`text-lg font-display font-bold ${
          tone === "success"
            ? "text-tms-success-dark"
            : tone === "info"
              ? "text-tms-info-dark"
              : tone === "warn"
                ? "text-tms-warning-dark"
                : "text-foreground"
        }`}
      >
        {value}
      </div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}

function HealthRow({ label, healthy }: { label: string; healthy: boolean }) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-between text-sm">
      <span>{label}</span>
      <Badge
        className={
          healthy
            ? "bg-tms-success-light text-tms-success-dark"
            : "bg-tms-error-light text-tms-error-dark"
        }
      >
        {healthy ? (
          <>
            <CheckCircle2 className="w-3 h-3 me-0.5" /> {t("admin.health.healthy")}
          </>
        ) : (
          <>
            <AlertTriangle className="w-3 h-3 me-0.5" /> {t("admin.health.down")}
          </>
        )}
      </Badge>
    </div>
  );
}
