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
  Clock,
  Map as MapIcon,
  Plus,
  Route as RouteIcon,
  Sparkles,
  Users,
} from "lucide-react";
import { useDrivers, useMonitor, useTasks, usePlans } from "@/features/shared/hooks";
import { useAuth } from "@/lib/auth-context";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function DispatcherDashboard() {
  const router = useRouter();
  const { user } = useAuth();
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
    <div className="p-6 space-y-6">
      <PageHeader
        title={`Welcome back${user?.name ? `, ${user.name.split(" ")[0]}` : ""}`}
        subtitle={`Today is ${new Date().toLocaleDateString(undefined, {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        })}`}
        actions={
          <>
            <Button size="sm" variant="outline" onClick={() => router.push("/dispatcher/tasks")}>
              <Plus className="w-4 h-4 mr-1" /> New task
            </Button>
            <Button size="sm" onClick={() => router.push("/dispatcher/planning")}>
              <Sparkles className="w-4 h-4 mr-1" /> Plan today
            </Button>
          </>
        }
      />

      {/* Stat tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatTile
          label="Pending tasks"
          value={tasksQuery.isLoading ? "…" : String(totalPending)}
          icon={ClipboardList}
          tone="info"
          onClick={() => router.push("/dispatcher/tasks?status=pending")}
        />
        <StatTile
          label="Active drivers"
          value={driversQuery.isLoading ? "…" : String(activeDrivers.length)}
          icon={Users}
          onClick={() => router.push("/admin/drivers")}
        />
        <StatTile
          label="Today's stops"
          value={monitorQuery.isLoading ? "…" : String(monitor?.overview.total ?? 0)}
          icon={RouteIcon}
          onClick={() => router.push("/dispatcher/monitor")}
        />
        <StatTile
          label="Delays"
          value={monitorQuery.isLoading ? "…" : String(monitor?.overview.delays ?? 0)}
          icon={AlertTriangle}
          tone={monitor && monitor.overview.delays > 0 ? "warn" : undefined}
          onClick={() => router.push("/dispatcher/monitor")}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Today's plan */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-display">Today&apos;s plan</CardTitle>
            <Button
              size="sm"
              variant="ghost"
              className="text-xs"
              onClick={() => router.push("/dispatcher/planning")}
            >
              Open <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            {plansQuery.isLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : !todaysPlan ? (
              <EmptyState
                icon={RouteIcon}
                title="No plan for today yet"
                description="Create an empty plan or run the optimizer to generate one."
                action={
                  <Button size="sm" onClick={() => router.push("/dispatcher/planning")}>
                    Open planning workspace
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
                        <CheckCircle2 className="w-3 h-3 mr-1" /> Published
                      </>
                    ) : (
                      "Draft"
                    )}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {todaysPlan.taskCount} tasks • {todaysPlan.routeCount} drivers
                  </span>
                </div>
                {monitor && monitor.planId === todaysPlan.planId && (
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <Tile label="Done" value={monitor.overview.completed} tone="success" />
                    <Tile label="In Progress" value={monitor.overview.inProgress} tone="info" />
                    <Tile label="Pending" value={monitor.overview.pending} />
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick actions */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-display">Quick links</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {[
              { label: "Live map", icon: MapIcon, href: "/dispatcher/map" },
              { label: "Live monitor", icon: Clock, href: "/dispatcher/monitor" },
              { label: "Planning workspace", icon: RouteIcon, href: "/dispatcher/planning" },
              { label: "Tasks", icon: ClipboardList, href: "/dispatcher/tasks" },
              { label: "Driver availability", icon: Users, href: "/dispatcher/availability" },
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
            <CardTitle className="text-base font-display">Recent activity</CardTitle>
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
