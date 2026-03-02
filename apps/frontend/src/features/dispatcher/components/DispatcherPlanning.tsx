"use client";

import { useState } from "react";
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
import { MOCK_PLAN_ROUTES, MOCK_PLAN_UNASSIGNED } from "@/lib/mock-data";

type PlanState = "config" | "running" | "review";

export default function DispatcherPlanning() {
  const [state, setState] = useState<PlanState>("config");
  const [progress, setProgress] = useState(0);

  const runOptimization = () => {
    setState("running");
    setProgress(0);
    const steps = [10, 25, 50, 75, 90, 100];
    steps.forEach((val, i) => {
      setTimeout(() => {
        setProgress(val);
        if (val === 100) setTimeout(() => setState("review"), 500);
      }, (i + 1) * 800);
    });
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
                <Input type="date" defaultValue="2026-03-01" />
              </div>
              <div className="flex items-center justify-between">
                <Label>
                  Include uncompleted tasks from previous days
                </Label>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-display">
                Driver Selection
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select defaultValue="all">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    All Available Drivers (12)
                  </SelectItem>
                  <SelectItem value="custom">Custom Selection</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-display">
                Depot &amp; Constraints
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Start Policy</Label>
                <Select defaultValue="depot">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="depot">Start at Depot</SelectItem>
                    <SelectItem value="flexible">Flexible Start</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <Label>Return to Depot</Label>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <Label>Enable Capacity Constraints</Label>
                <Switch defaultChecked />
              </div>
              <div className="space-y-2">
                <Label>Max Stops per Driver</Label>
                <Input type="number" defaultValue={15} />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-display">
                Optimization Objective
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select defaultValue="standard">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">
                    Standard: Max tasks, min time
                  </SelectItem>
                  <SelectItem value="balance">Balance Workload</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center justify-between">
                <Label>Respect Time Windows</Label>
                <Switch defaultChecked />
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
                    47
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Tasks to Assign
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-display font-bold text-foreground">
                    12
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Drivers Available
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-display font-bold text-foreground">
                    ~45s
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
              >
                <Play className="w-4 h-4 mr-2" /> Generate Plan
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  /* ── Running view ── */
  if (state === "running") {
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
                Optimizing routes for 47 tasks across 12 drivers
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
            onClick={() => setState("config")}
          >
            <Settings className="w-4 h-4 mr-2" /> Re-configure
          </Button>
          <Button
            size="sm"
            className="bg-tms-success hover:bg-tms-success-dark text-primary-foreground"
          >
            <CheckCircle2 className="w-4 h-4 mr-2" /> Publish Plan
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Assigned", value: "44", icon: ClipboardList },
          { label: "Unassigned", value: "3", icon: AlertTriangle },
          { label: "Assignment Rate", value: "94%", icon: CheckCircle2 },
          { label: "Total Travel", value: "12h 5m", icon: Clock },
          { label: "Total Distance", value: "246km", icon: Route },
          { label: "Drivers Used", value: "4", icon: Users },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-3 text-center">
              <s.icon className="w-4 h-4 text-primary mx-auto mb-1" />
              <div className="text-lg font-display font-bold">{s.value}</div>
              <div className="text-[10px] text-muted-foreground">
                {s.label}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Routes */}
      <div className="space-y-4">
        <h2 className="text-base font-display font-semibold">Driver Routes</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {MOCK_PLAN_ROUTES.map((r) => (
            <Card
              key={r.driver}
              className="hover:shadow-md transition-shadow"
            >
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-sm">{r.driver}</div>
                    <div className="text-xs text-muted-foreground font-mono">
                      {r.vehicle}
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {r.stops} stops
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Duration:</span>{" "}
                    <span className="font-medium">{r.duration}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Distance:</span>{" "}
                    <span className="font-medium">{r.distance}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Utilization:</span>{" "}
                    <span className="font-medium">{r.utilization}%</span>
                  </div>
                </div>
                <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      r.utilization >= 80
                        ? "bg-tms-success"
                        : r.utilization >= 60
                          ? "bg-tms-warning"
                          : "bg-tms-info"
                    }`}
                    style={{ width: `${r.utilization}%` }}
                  />
                </div>
                <div className="flex flex-wrap gap-1">
                  {r.tasks.map((t) => (
                    <Badge
                      key={t}
                      variant="outline"
                      className="text-[10px] font-mono"
                    >
                      {t}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Unassigned */}
      {MOCK_PLAN_UNASSIGNED.length > 0 && (
        <Card className="border-tms-warning/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-display flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-tms-warning" /> Unassigned
              Tasks ({MOCK_PLAN_UNASSIGNED.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {MOCK_PLAN_UNASSIGNED.map((u) => (
              <div
                key={u.id}
                className="flex items-center justify-between py-2 border-b border-border last:border-0"
              >
                <div>
                  <span className="font-mono text-sm font-medium">{u.id}</span>
                  <p className="text-xs text-muted-foreground">{u.reason}</p>
                </div>
                <Button variant="outline" size="sm" className="text-xs">
                  Assign Manually
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
