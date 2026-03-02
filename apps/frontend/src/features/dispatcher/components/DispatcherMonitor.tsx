"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Monitor,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Phone,
  RefreshCw,
  TrendingUp,
} from "lucide-react";
import {
  MOCK_MONITOR_OVERVIEW,
  MOCK_DRIVER_STATUS,
  MOCK_RECENT_EVENTS,
} from "@/lib/mock-data";

const STATUS_BADGE: Record<
  string,
  { label: string; variant: "secondary" | "default" | "destructive" | "outline" }
> = {
  on_route: { label: "On Route", variant: "secondary" },
  at_stop: { label: "At Stop", variant: "default" },
  delayed: { label: "Delayed", variant: "destructive" },
  completed: { label: "Completed", variant: "outline" },
};

export default function DispatcherMonitor() {
  const completionPct = Math.round(
    (MOCK_MONITOR_OVERVIEW.completed / MOCK_MONITOR_OVERVIEW.total) * 100,
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">
            Execution Monitor
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time route monitoring • Auto-refresh 30s
          </p>
        </div>
        <Button variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" /> Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">Completion</span>
              <span className="text-xs font-medium">{completionPct}%</span>
            </div>
            <Progress value={completionPct} className="h-2 mb-2" />
            <div className="text-xs text-muted-foreground">
              {MOCK_MONITOR_OVERVIEW.completed}/{MOCK_MONITOR_OVERVIEW.total}{" "}
              tasks done
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="w-5 h-5 text-tms-success mx-auto mb-1" />
            <div className="text-xl font-display font-bold">
              {MOCK_MONITOR_OVERVIEW.onTimeRate}%
            </div>
            <div className="text-xs text-muted-foreground">On-Time Rate</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="w-5 h-5 text-tms-info mx-auto mb-1" />
            <div className="text-xl font-display font-bold">
              {MOCK_MONITOR_OVERVIEW.inProgress}
            </div>
            <div className="text-xs text-muted-foreground">In Progress</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <AlertTriangle className="w-5 h-5 text-tms-warning mx-auto mb-1" />
            <div className="text-xl font-display font-bold">
              {MOCK_MONITOR_OVERVIEW.delays}
            </div>
            <div className="text-xs text-muted-foreground">
              Delay Incidents
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Driver Status Board */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-display flex items-center gap-2">
                <Monitor className="w-4 h-4 text-primary" /> Driver Status
                Board
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Driver</TableHead>
                    <TableHead>Current Stop</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Next ETA</TableHead>
                    <TableHead className="w-20">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MOCK_DRIVER_STATUS.map((d) => {
                    const badge = STATUS_BADGE[d.status] ?? STATUS_BADGE.on_route;
                    return (
                      <TableRow
                        key={d.name}
                        className={
                          d.status === "delayed"
                            ? "bg-tms-warning-light/30"
                            : ""
                        }
                      >
                        <TableCell>
                          <div className="font-medium text-sm">{d.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {d.phone}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {d.currentStop}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full"
                                style={{
                                  width: `${(d.stopNum / d.totalStops) * 100}%`,
                                }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {d.stopNum}/{d.totalStops}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={badge.variant} className="text-xs">
                            {badge.label}
                          </Badge>
                        </TableCell>
                        <TableCell
                          className={`text-sm ${
                            d.status === "delayed"
                              ? "text-tms-warning font-medium"
                              : ""
                          }`}
                        >
                          {d.nextEta}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                            >
                              <Phone className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Recent Events */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-display flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" /> Live Feed
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {MOCK_RECENT_EVENTS.map((e, i) => (
              <div
                key={i}
                className="flex items-start gap-2 py-2 border-b border-border last:border-0"
              >
                <div
                  className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                    e.type === "success"
                      ? "bg-tms-success"
                      : e.type === "warning"
                        ? "bg-tms-warning animate-pulse-dot"
                        : "bg-tms-info"
                  }`}
                />
                <div>
                  <p className="text-xs">
                    <span className="font-medium text-foreground">
                      {e.driver}
                    </span>{" "}
                    <span className="text-muted-foreground">{e.event}</span>
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {e.time}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
