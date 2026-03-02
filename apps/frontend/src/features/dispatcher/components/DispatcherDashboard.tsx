"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ClipboardList,
  Users,
  AlertTriangle,
  Clock,
  ArrowRight,
  TrendingUp,
  Route,
  Phone,
  Plus,
} from "lucide-react";

const stats = [
  {
    label: "Tasks Due Today",
    value: "47",
    sub: "12 Urgent • 18 High • 15 Normal • 2 Low",
    icon: ClipboardList,
    color: "text-primary",
  },
  {
    label: "Drivers Available",
    value: "12/15",
    sub: "3 on leave or sick",
    icon: Users,
    color: "text-tms-success",
  },
  {
    label: "Yesterday's Completion",
    value: "94%",
    sub: "45 of 48 tasks completed",
    icon: TrendingUp,
    color: "text-tms-info",
  },
  {
    label: "Unassigned Tasks",
    value: "5",
    sub: "From yesterday — need attention",
    icon: AlertTriangle,
    color: "text-tms-warning",
  },
];

const alerts = [
  {
    type: "urgent",
    text: "5 unassigned tasks from yesterday need resolution",
    action: "View Tasks",
  },
  {
    type: "warning",
    text: "Driver Fatima Zahra marked as sick — 3 tasks need reassignment",
    action: "Reassign",
  },
  {
    type: "info",
    text: "2 addresses failed geocoding — manual resolution required",
    action: "Resolve",
  },
  {
    type: "info",
    text: "Bulk import from yesterday: 3 tasks pending correction",
    action: "Review",
  },
];

const timeline = [
  { time: "07:00", event: "Morning preparation", status: "done" },
  { time: "08:00", event: "Task review & creation", status: "done" },
  {
    time: "09:00",
    event: "Run optimizer & review plan",
    status: "current",
  },
  {
    time: "09:30",
    event: "Publish routes & brief drivers",
    status: "pending",
  },
  {
    time: "10:00",
    event: "Begin execution monitoring",
    status: "pending",
  },
  { time: "17:00", event: "End-of-day closeout", status: "pending" },
];

const ALERT_STYLES: Record<string, string> = {
  urgent: "border-tms-error/30 bg-tms-error-light",
  warning: "border-tms-warning/30 bg-tms-warning-light",
  info: "border-tms-info/30 bg-tms-info-light",
};

export default function DispatcherDashboard() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">
            Dispatcher Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Saturday, March 1, 2026 — Good morning, Amira
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Plus className="w-4 h-4 mr-2" /> Create Task
          </Button>
          <Button size="sm">
            <Route className="w-4 h-4 mr-2" /> Run Planner
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card
            key={s.label}
            className="border-border cursor-pointer hover:shadow-md transition-shadow"
          >
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {s.label}
                  </p>
                  <p className="text-2xl font-display font-bold text-foreground mt-1">
                    {s.value}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {s.sub}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                  <s.icon className={`w-5 h-5 ${s.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Alerts */}
        <div className="lg:col-span-2 space-y-3">
          <h2 className="text-base font-display font-semibold text-foreground flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-tms-warning" /> Alerts &
            Actions
          </h2>
          {alerts.map((alert, i) => (
            <Card key={i} className={ALERT_STYLES[alert.type]}>
              <CardContent className="p-4 flex items-center justify-between">
                <p className="text-sm text-foreground">{alert.text}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 ml-4 text-xs"
                >
                  {alert.action} <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Timeline */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-display flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" /> Today&apos;s Timeline
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {timeline.map((t, i) => (
              <div key={i} className="flex items-start gap-3 py-2">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-3 h-3 rounded-full shrink-0 mt-0.5 ${
                      t.status === "done"
                        ? "bg-tms-success"
                        : t.status === "current"
                          ? "bg-primary animate-pulse-dot"
                          : "bg-border"
                    }`}
                  />
                  {i < timeline.length - 1 && (
                    <div className="w-px h-6 bg-border mt-1" />
                  )}
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">{t.time}</div>
                  <div
                    className={`text-sm ${
                      t.status === "current"
                        ? "font-semibold text-foreground"
                        : t.status === "done"
                          ? "text-muted-foreground line-through"
                          : "text-muted-foreground"
                    }`}
                  >
                    {t.event}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Call Drivers", icon: Phone },
          { label: "View Active Plan", icon: Route },
          { label: "Manage Tasks", icon: ClipboardList },
          { label: "Driver Availability", icon: Users },
        ].map((a) => (
          <Card
            key={a.label}
            className="hover:shadow-md transition-shadow cursor-pointer"
          >
            <CardContent className="p-4 flex items-center gap-3">
              <a.icon className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium">{a.label}</span>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
