"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart3,
  Download,
  TrendingUp,
  Clock,
  AlertTriangle,
} from "lucide-react";

export default function DispatcherReports() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">
            Reports &amp; Analysis
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Operational insights and historical data
          </p>
        </div>
        <div className="flex gap-2">
          <Select defaultValue="7d">
            <SelectTrigger className="w-32 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1d">Today</SelectItem>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" /> Export
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Avg Daily Tasks",
            value: "45",
            trend: "+8%",
            icon: BarChart3,
            color: "text-primary",
          },
          {
            label: "Avg Completion Rate",
            value: "93%",
            trend: "+2%",
            icon: TrendingUp,
            color: "text-tms-success",
          },
          {
            label: "Avg Plan Time",
            value: "42s",
            trend: "-12%",
            icon: Clock,
            color: "text-tms-info",
          },
          {
            label: "Exception Rate",
            value: "6%",
            trend: "-3%",
            icon: AlertTriangle,
            color: "text-tms-warning",
          },
        ].map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">
                    {kpi.label}
                  </p>
                  <p className="text-2xl font-display font-bold mt-1">
                    {kpi.value}
                  </p>
                  <p className="text-xs text-tms-success mt-1">
                    {kpi.trend} vs prior period
                  </p>
                </div>
                <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-display">
              Daily Summary (Last 7 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                {
                  day: "Mar 1 (Today)",
                  tasks: 47,
                  completed: 28,
                  rate: "60%",
                  status: "In Progress",
                },
                {
                  day: "Feb 28",
                  tasks: 48,
                  completed: 45,
                  rate: "94%",
                  status: "Closed",
                },
                {
                  day: "Feb 27",
                  tasks: 42,
                  completed: 40,
                  rate: "95%",
                  status: "Closed",
                },
                {
                  day: "Feb 26",
                  tasks: 51,
                  completed: 47,
                  rate: "92%",
                  status: "Closed",
                },
                {
                  day: "Feb 25",
                  tasks: 38,
                  completed: 36,
                  rate: "95%",
                  status: "Closed",
                },
                {
                  day: "Feb 24",
                  tasks: 44,
                  completed: 41,
                  rate: "93%",
                  status: "Closed",
                },
                {
                  day: "Feb 23",
                  tasks: 39,
                  completed: 37,
                  rate: "95%",
                  status: "Closed",
                },
              ].map((d) => (
                <div
                  key={d.day}
                  className="flex items-center justify-between py-2 border-b border-border last:border-0"
                >
                  <div>
                    <div className="text-sm font-medium">{d.day}</div>
                    <div className="text-xs text-muted-foreground">
                      {d.completed}/{d.tasks} tasks • {d.rate}
                    </div>
                  </div>
                  <span
                    className={`text-xs font-medium ${
                      d.status === "Closed"
                        ? "text-tms-success"
                        : "text-tms-info"
                    }`}
                  >
                    {d.status}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-display">
              Driver Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                {
                  name: "Youcef Merah",
                  stops: 6.2,
                  onTime: 96,
                  incidents: 1,
                },
                {
                  name: "Salim Tounsi",
                  stops: 5.8,
                  onTime: 94,
                  incidents: 0,
                },
                {
                  name: "Rachid Bouzid",
                  stops: 5.5,
                  onTime: 91,
                  incidents: 2,
                },
                {
                  name: "Mohamed Ait",
                  stops: 6.5,
                  onTime: 88,
                  incidents: 3,
                },
                {
                  name: "Omar Khaldi",
                  stops: 4.8,
                  onTime: 85,
                  incidents: 2,
                },
              ].map((d) => (
                <div
                  key={d.name}
                  className="flex items-center justify-between py-2 border-b border-border last:border-0"
                >
                  <div>
                    <div className="text-sm font-medium">{d.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {d.stops} stops/day avg • {d.incidents} incidents
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          d.onTime >= 90
                            ? "bg-tms-success"
                            : d.onTime >= 80
                              ? "bg-tms-warning"
                              : "bg-tms-error"
                        }`}
                        style={{ width: `${d.onTime}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium w-8 text-right">
                      {d.onTime}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-display">
              Unassigned Task Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                {
                  reason: "Time Window Conflict",
                  count: 12,
                  pct: "40%",
                },
                { reason: "Capacity Exceeded", count: 8, pct: "27%" },
                { reason: "Geocoding Failure", count: 6, pct: "20%" },
                { reason: "Shift Too Short", count: 4, pct: "13%" },
              ].map((r) => (
                <div
                  key={r.reason}
                  className="text-center p-4 bg-muted/50 rounded-lg"
                >
                  <div className="text-2xl font-display font-bold text-foreground">
                    {r.count}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {r.reason}
                  </div>
                  <div className="text-xs text-primary font-medium mt-0.5">
                    {r.pct}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
