"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { Activity, CheckCircle2, AlertTriangle, RefreshCw, Database, Cpu, Server } from "lucide-react";
import { useAdminHealth } from "@/features/shared/hooks";
import { cn } from "@/lib/utils";

const SERVICES = [
  { key: "db" as const, label: "Postgres database", icon: Database },
  { key: "redis" as const, label: "Redis cache", icon: Server },
  { key: "optimizer" as const, label: "OR-Tools optimizer", icon: Cpu },
];

export default function AdminHealth() {
  const healthQuery = useAdminHealth({ refetchIntervalMs: 30_000 });
  const data = healthQuery.data;

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="System Health"
        subtitle="Live status of dependent services. Auto-refreshes every 30 s."
        actions={
          <Button
            size="sm"
            variant="outline"
            onClick={() => healthQuery.refetch()}
            disabled={healthQuery.isFetching}
          >
            <RefreshCw
              className={cn("w-3.5 h-3.5 mr-1", healthQuery.isFetching && "animate-spin")}
            />
            Refresh now
          </Button>
        }
      />

      {healthQuery.isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : healthQuery.isError ? (
        <ErrorState
          message={healthQuery.error instanceof Error ? healthQuery.error.message : "Health check failed"}
          onRetry={() => healthQuery.refetch()}
        />
      ) : (
        <>
          <Card className={data?.status === "ok" ? "border-tms-success/30" : "border-tms-warning/40"}>
            <CardContent className="p-3 text-sm flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Overall status:{" "}
              <Badge
                className={
                  data?.status === "ok"
                    ? "bg-tms-success-light text-tms-success-dark"
                    : "bg-tms-warning-light text-tms-warning-dark"
                }
              >
                {data?.status === "ok" ? "OK" : "Degraded"}
              </Badge>
            </CardContent>
          </Card>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {SERVICES.map(({ key, label, icon: Icon }) => {
              const status = data?.services?.[key];
              const healthy = status === "ok";
              return (
                <Card key={key} className={healthy ? "" : "border-tms-error/40"}>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center justify-between text-sm font-display">
                      <span className="flex items-center gap-2">
                        <Icon className="w-4 h-4" />
                        {label}
                      </span>
                      <Badge
                        className={
                          healthy
                            ? "bg-tms-success-light text-tms-success-dark"
                            : "bg-tms-error-light text-tms-error-dark"
                        }
                      >
                        {healthy ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 mr-1" /> Healthy
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="w-3 h-3 mr-1" /> Down
                          </>
                        )}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-xs text-muted-foreground">
                    {healthy ? "Reachable." : "Service is not responding."}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}

      <Card className="bg-muted/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-display flex items-center gap-2">
            <Activity className="w-4 h-4" /> About this page
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-1">
          <p>
            Health is read from <code>GET /admin/health</code> — each service exposes a
            ping and reports back-end reachability + latency.
          </p>
          <p>
            If anything turns red, check the docker-compose logs for the affected
            service or the optimizer container.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
