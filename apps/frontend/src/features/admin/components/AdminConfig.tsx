"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { Save, Loader2, RotateCcw } from "lucide-react";
import { useAdminConfig, useUpdateAdminConfig } from "@/features/shared/hooks";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

export default function AdminConfig() {
  const configQuery = useAdminConfig();
  const updateConfig = useUpdateAdminConfig();
  const { toast } = useToast();
  const { t: tFn } = useTranslation();

  const [maxSolveSeconds, setMaxSolveSeconds] = useState(30);
  const [speedKmh, setSpeedKmh] = useState(50);
  const [weightsJson, setWeightsJson] = useState("");
  const [weightsError, setWeightsError] = useState<string | null>(null);

  useEffect(() => {
    if (configQuery.data) {
      setMaxSolveSeconds(configQuery.data.maxSolveSeconds);
      setSpeedKmh(configQuery.data.speedKmh);
      setWeightsJson(JSON.stringify(configQuery.data.objectiveWeights, null, 2));
    }
  }, [configQuery.data]);

  function reset() {
    if (configQuery.data) {
      setMaxSolveSeconds(configQuery.data.maxSolveSeconds);
      setSpeedKmh(configQuery.data.speedKmh);
      setWeightsJson(JSON.stringify(configQuery.data.objectiveWeights, null, 2));
      setWeightsError(null);
    }
  }

  async function save() {
    let weights: Record<string, number>;
    try {
      weights = JSON.parse(weightsJson);
      if (typeof weights !== "object" || Array.isArray(weights)) throw new Error();
    } catch {
      setWeightsError(tFn("admin.config.invalidJson"));
      return;
    }
    setWeightsError(null);
    try {
      await updateConfig.mutateAsync({
        maxSolveSeconds,
        speedKmh,
        objectiveWeights: weights,
      });
      toast({ title: tFn("admin.config.saved") });
    } catch (err) {
      toast({
        title: tFn("admin.config.saveFailed"),
        description: err instanceof Error ? err.message : tFn("common.unknownError"),
        variant: "destructive",
      });
    }
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <PageHeader
        title={tFn("admin.config.title")}
        subtitle={tFn("admin.config.subtitle")}
        actions={
          <>
            <Button size="sm" variant="outline" onClick={reset}>
              <RotateCcw className="w-3.5 h-3.5 me-1" /> {tFn("admin.config.revert")}
            </Button>
            <Button size="sm" onClick={save} disabled={updateConfig.isPending}>
              {updateConfig.isPending ? (
                <Loader2 className="w-3.5 h-3.5 me-1 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5 me-1" />
              )}
              {tFn("admin.config.save")}
            </Button>
          </>
        }
      />

      {configQuery.isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : configQuery.isError ? (
        <ErrorState
          message={configQuery.error instanceof Error ? configQuery.error.message : tFn("admin.config.loadFailed")}
          onRetry={() => configQuery.refetch()}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-display">{tFn("admin.config.optimizerConstraints")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <Label>{tFn("admin.config.maxSolveSeconds")}</Label>
                <Input
                  type="number"
                  value={maxSolveSeconds}
                  onChange={(e) => setMaxSolveSeconds(Number(e.target.value))}
                />
                <p className="text-[11px] text-muted-foreground">
                  {tFn("admin.config.maxSolveSecondsHint")}
                </p>
              </div>
              <div className="space-y-1">
                <Label>{tFn("admin.config.speedKmh")}</Label>
                <Input
                  type="number"
                  value={speedKmh}
                  onChange={(e) => setSpeedKmh(Number(e.target.value))}
                />
                <p className="text-[11px] text-muted-foreground">
                  {tFn("admin.config.speedKmhHint")}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-display">{tFn("admin.config.objectiveWeights")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Label>{tFn("admin.config.priorityWeights")}</Label>
              <Textarea
                rows={8}
                value={weightsJson}
                onChange={(e) => {
                  setWeightsJson(e.target.value);
                  setWeightsError(null);
                }}
                className="font-mono text-xs"
              />
              {weightsError && (
                <p className="text-[11px] text-tms-error">{weightsError}</p>
              )}
              <p className="text-[11px] text-muted-foreground">
                {tFn("admin.config.weightsHint")}{" "}
                <code>{`{"urgent":1000,"high":500,"normal":100,"low":10}`}</code>
              </p>
            </CardContent>
          </Card>

          {configQuery.data?.updatedAt && (
            <p className="text-xs text-muted-foreground md:col-span-2">
              {tFn("admin.config.lastUpdated")}: {new Date(configQuery.data.updatedAt).toLocaleString()}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
