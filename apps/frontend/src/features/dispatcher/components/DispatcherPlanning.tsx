"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Route,
  Play,
  Settings,
  CheckCircle2,
  Clock,
  Users,
  ClipboardList,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import apiClient from "@/services/api-client";
import {
  useStartOptimization,
  useOptimizationStatus,
  usePlanDetail,
  usePublishPlan,
} from "../hooks";

type PlanState = "config" | "running" | "review";

export default function DispatcherPlanning() {
  const { toast } = useToast();
  const [state, setState] = useState<PlanState>("config");
  const [planningDate, setPlanningDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [returnToDepot, setReturnToDepot] = useState(true);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);

  // API hooks
  const startOptimizationMutation = useStartOptimization();
  const optimizationStatusQuery = useOptimizationStatus(currentJobId || "");
  // Only fetch plans list when on config screen
  const plansListQuery = useQuery({
    queryKey: ["planning", "plans"],
    queryFn: async () => {
      try {
        const response = await apiClient.get("/dispatcher/planning/plans");
        return response.data;
      } catch (error) {
        console.error("Failed to fetch plans:", error);
        return [];
      }
    },
    enabled: state === "config", // Only fetch when on config screen
  });
  const planDetailQuery = usePlanDetail(currentPlanId || "");
  const publishPlanMutation = usePublishPlan();

  // Auto-poll optimization status
  useEffect(() => {
    if (state === "running" && optimizationStatusQuery.data) {
      const jobData = optimizationStatusQuery.data;

      if (jobData.status === "completed" && jobData.planId) {
        setCurrentPlanId(jobData.planId);
        setState("review");
        toast({ title: "Optimization completed successfully!" });
      } else if (jobData.status === "failed") {
        setState("config");
        toast({
          title: "Optimization failed",
          description: jobData.error || "Unknown error",
          variant: "destructive",
        });
      }
    }
  }, [optimizationStatusQuery.data, state, toast]);

  const runOptimization = async () => {
    try {
      setState("running");
      setCurrentJobId(null);
      setCurrentPlanId(null);

      const payload = {
        date: planningDate,
        returnToDepot,
      };
      console.log("Sending optimization request with payload:", payload);

      const result = await startOptimizationMutation.mutateAsync(payload);

      setCurrentJobId(result.jobId);
      toast({ title: "Optimization job started" });
    } catch (error: any) {
      console.error("Failed to start optimization:", error);
      console.error("Error response:", error?.response?.data);
      console.error("Error config:", error?.config);
      setState("config");
      
      // Try multiple error paths to extract meaningful message
      let errorMessage = "Unknown error occurred";
      
      // Check for validation errors
      if (error?.response?.data?.error?.details?.errors?.[0]?.message) {
        errorMessage = error.response.data.error.details.errors[0].message;
      } else if (error?.response?.data?.error?.message) {
        errorMessage = error.response.data.error.message;
      } else if (error?.response?.data?.errors?.[0]?.message) {
        errorMessage = error.response.data.errors[0].message;
      } else if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (typeof error?.response?.data === "string") {
        errorMessage = error.response.data;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Failed to start optimization",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handlePublishPlan = async () => {
    if (!currentPlanId) return;

    try {
      await publishPlanMutation.mutateAsync(currentPlanId);
      toast({ title: "Plan published successfully!" });
      setState("config");
      setCurrentPlanId(null);
      setCurrentJobId(null);
      setPlanningDate(new Date().toISOString().split("T")[0]);
    } catch (error: any) {
      console.error("Failed to publish plan:", error);
      console.error("Error response:", error?.response?.data);
      
      // Try multiple error paths to extract meaningful message
      let errorMessage = "Unknown error occurred";
      
      // Check for validation errors
      if (error?.response?.data?.error?.details?.errors?.[0]?.message) {
        errorMessage = error.response.data.error.details.errors[0].message;
      } else if (error?.response?.data?.error?.message) {
        errorMessage = error.response.data.error.message;
      } else if (error?.response?.data?.errors?.[0]?.message) {
        errorMessage = error.response.data.errors[0].message;
      } else if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (typeof error?.response?.data === "string") {
        errorMessage = error.response.data;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Failed to publish plan",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  /* ── Config view ── */
  if (state === "config") {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">
              Planning Configuration
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Configure optimization parameters before running
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-display">
                Planning Horizon
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Planning Date</Label>
                <Input
                  type="date"
                  value={planningDate}
                  onChange={(e) => setPlanningDate(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-display">
                Depot &amp; Constraints
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Return to Depot After Last Stop</Label>
                <Switch
                  checked={returnToDepot}
                  onCheckedChange={setReturnToDepot}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pre-run summary */}
        <Card className="border-primary/20 bg-tms-success-light/30">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex gap-8">
                <div className="text-center">
                  <div className="text-xl font-display font-bold text-foreground">
                    {plansListQuery.data?.length || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Previous Plans
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-display font-bold text-foreground">
                    ~30-60s
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Est. Computation
                  </div>
                </div>
              </div>
              <Button
                onClick={runOptimization}
                size="lg"
                className="font-semibold"
                disabled={
                  startOptimizationMutation.isPending ||
                  !planningDate
                }
              >
                {startOptimizationMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Starting...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" /> Generate Plan
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  /* ── Running view ── */
  if (state === "running") {
    const progress =
      optimizationStatusQuery.data?.progressPercent || 0;

    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center space-y-6">
            <Loader2 className="w-12 h-12 text-primary mx-auto animate-spin" />
            <div>
              <h2 className="text-xl font-display font-bold text-foreground">
                Generating Plan
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Status:{" "}
                {optimizationStatusQuery.data?.status.toUpperCase() || "QUEUED"}
              </p>
            </div>
            <Progress value={progress} className="h-2" />
            <div className="space-y-2 text-left text-sm">
              {[
                { label: "Preparing Data", threshold: 10 },
                { label: "Building Distance Matrix", threshold: 25 },
                { label: "Running Optimization", threshold: 50 },
                { label: "Building Routes", threshold: 90 },
              ].map((step) => (
                <div key={step.label} className="flex items-center gap-2">
                  {progress >= step.threshold ? (
                    <CheckCircle2 className="w-4 h-4 text-tms-success" />
                  ) : progress > step.threshold - 15 ? (
                    <Loader2 className="w-4 h-4 text-primary animate-spin" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-border" />
                  )}
                  <span
                    className={
                      progress >= step.threshold
                        ? "text-foreground"
                        : "text-muted-foreground"
                    }
                  >
                    {step.label}
                  </span>
                </div>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setState("config")}
            >
              Cancel
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  /* ── Review view ── */
  const planData = planDetailQuery.data;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">
            Plan Review
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Plan generated — review and publish when ready
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setState("config");
              setCurrentPlanId(null);
              setCurrentJobId(null);
            }}
          >
            <Settings className="w-4 h-4 mr-2" /> Re-configure
          </Button>
          <Button
            size="sm"
            className="bg-tms-success hover:bg-tms-success-dark text-primary-foreground"
            onClick={handlePublishPlan}
            disabled={
              publishPlanMutation.isPending || !currentPlanId || !planData
            }
          >
            {publishPlanMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Publishing...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" /> Publish Plan
              </>
            )}
          </Button>
        </div>
      </div>

      {planDetailQuery.isLoading ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Loader2 className="w-6 h-6 text-primary mx-auto mb-3 animate-spin" />
            <p className="text-muted-foreground">Loading plan details...</p>
          </CardContent>
        </Card>
      ) : !planData ? (
        <Card>
          <CardContent className="p-8 text-center">
            <AlertTriangle className="w-6 h-6 text-tms-warning mx-auto mb-3" />
            <p className="text-muted-foreground">Plan data not available</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              {
                label: "Total Routes",
                value: planData.routes?.length || "0",
                icon: Route,
              },
              {
                label: "Total Tasks",
                value: planData.routes?.reduce((sum, r) => sum + r.stops.length, 0) || "0",
                icon: ClipboardList,
              },
              {
                label: "Unassigned",
                value: planData.unassignedTasks?.length || "0",
                icon: AlertTriangle,
              },
              {
                label: "Drivers Used",
                value: planData.routes?.length || "0",
                icon: Users,
              },
              {
                label: "Total Distance",
                value: planData.routes
                  ? `${(planData.routes.reduce((sum, r) => sum + r.totalDistanceM, 0) / 1000).toFixed(1)}km`
                  : "0km",
                icon: Route,
              },
              {
                label: "Total Time",
                value: planData.routes
                  ? `${Math.round(planData.routes.reduce((sum, r) => sum + r.totalTimeS, 0) / 60)}m`
                  : "0m",
                icon: Clock,
              },
            ].map((s) => (
              <Card key={s.label}>
                <CardContent className="p-3 text-center">
                  <s.icon className="w-4 h-4 text-primary mx-auto mb-1" />
                  <div className="text-lg font-display font-bold">
                    {s.value}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {s.label}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Routes */}
          <div className="space-y-4">
            <h2 className="text-base font-display font-semibold">
              Driver Routes
            </h2>
            {planData.routes && planData.routes.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {planData.routes.map((route) => (
                  <Card
                    key={route.id}
                    className="hover:shadow-md transition-shadow"
                  >
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-sm">
                            {route.driver?.name || "Driver"}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            ID: {route.driverId.substring(0, 8)}...
                          </div>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {route.stops.length} stops
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <span className="text-muted-foreground">
                            Duration:
                          </span>{" "}
                          <span className="font-medium">
                            {Math.round(route.totalTimeS / 60)}m
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">
                            Distance:
                          </span>{" "}
                          <span className="font-medium">
                            {(route.totalDistanceM / 1000).toFixed(1)}km
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Stops:</span>{" "}
                          <span className="font-medium">
                            {route.stops.length}
                          </span>
                        </div>
                      </div>
                      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-tms-success"
                          style={{
                            width: `${Math.min(100, (route.stops.length / 15) * 100)}%`,
                          }}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                  No routes in this plan
                </CardContent>
              </Card>
            )}
          </div>

          {/* Unassigned */}
          {planData.unassignedTasks && planData.unassignedTasks.length > 0 && (
            <Card className="border-tms-warning/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-display flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-tms-warning" />{" "}
                  Unassigned Tasks ({planData.unassignedTasks.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {planData.unassignedTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between py-2 border-b border-border last:border-0"
                  >
                    <div>
                      <span className="font-mono text-sm font-medium">
                        {task.title}
                      </span>
                      <p className="text-xs text-muted-foreground">
                        {task.pickupAddress} → {task.dropoffAddress}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {task.priority}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
