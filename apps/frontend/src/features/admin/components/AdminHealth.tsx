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
import { useTranslation } from "react-i18next";

const SERVICES = [
  { key: "db" as const, labelKey: "admin.health.postgresDb", icon: Database },
  { key: "redis" as const, labelKey: "admin.health.redisCache", icon: Server },
  { key: "optimizer" as const, labelKey: "admin.health.ortoolsOptimizer", icon: Cpu },
];

export default function AdminHealth() {
  const healthQuery = useAdminHealth({ refetchIntervalMs: 30_000 });
  const data = healthQuery.data;
  const { t: tFn } = useTranslation();

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <PageHeader
        title={tFn("admin.health.title")}
        subtitle={tFn("admin.health.subtitle")}
        actions={
          <Button
            size="sm"
            variant="outline"
            onClick={() => healthQuery.refetch()}
            disabled={healthQuery.isFetching}
          >
            <RefreshCw
              className={cn("w-3.5 h-3.5 me-1", healthQuery.isFetching && "animate-spin")}
            />
            {tFn("admin.health.refresh")}
          </Button>
        }
      />

      {healthQuery.isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : healthQuery.isError ? (
        <ErrorState
          message={healthQuery.error instanceof Error ? healthQuery.error.message : tFn("admin.health.checkFailed")}
          onRetry={() => healthQuery.refetch()}
        />
      ) : (
        <>
          <Card className={data?.status === "ok" ? "border-tms-success/30" : "border-tms-warning/40"}>
            <CardContent className="p-3 text-sm flex items-center gap-2">
              <Activity className="w-4 h-4" />
              {tFn("admin.health.overallStatus")}:{" "}
              <Badge
                className={
                  data?.status === "ok"
                    ? "bg-tms-success-light text-tms-success-dark"
                    : "bg-tms-warning-light text-tms-warning-dark"
                }
              >
                {data?.status === "ok" ? tFn("common.ok") : tFn("common.degraded")}
              </Badge>
            </CardContent>
          </Card>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {SERVICES.map(({ key, labelKey, icon: Icon }) => {
              const status = data?.services?.[key];
              const healthy = status === "ok";
              return (
                <Card key={key} className={healthy ? "" : "border-tms-error/40"}>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center justify-between text-sm font-display">
                      <span className="flex items-center gap-2">
                        <Icon className="w-4 h-4" />
                        {tFn(labelKey)}
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
                            <CheckCircle2 className="w-3 h-3 me-1" /> {tFn("admin.health.healthy")}
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="w-3 h-3 me-1" /> {tFn("admin.health.down")}
                          </>
                        )}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-xs text-muted-foreground">
                    {healthy ? tFn("admin.health.reachable") : tFn("admin.health.notResponding")}
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
            <Activity className="w-4 h-4" /> {tFn("admin.health.aboutPage")}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-1">
          <p>{tFn("admin.health.aboutBody1")}</p>
          <p>{tFn("admin.health.aboutBody2")}</p>
        </CardContent>
      </Card>
    </div>
  );
}
