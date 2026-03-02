"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users,
  Truck,
  Activity,
  FileText,
  AlertTriangle,
  CheckCircle2,
  UserPlus,
  Settings,
  ArrowRight,
  Clock,
} from "lucide-react";
import {
  ADMIN_STATS,
  ADMIN_SERVICES,
  ADMIN_RECENT_ACTIVITY,
} from "@/lib/mock-data";

const ICON_MAP = { Users, Truck, Activity, FileText } as Record<
  string,
  React.ElementType
>;

export default function AdminDashboard() {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">
            Admin Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            System overview and management
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Settings className="w-4 h-4 mr-2" /> Configuration
          </Button>
          <Button size="sm">
            <UserPlus className="w-4 h-4 mr-2" /> Add User
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {ADMIN_STATS.map((stat) => {
          const Icon = ICON_MAP[stat.iconName] ?? Activity;
          return (
            <Card key={stat.label} className="border-border">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {stat.label}
                    </p>
                    <p className="text-2xl font-display font-bold text-foreground mt-1">
                      {stat.value}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {stat.change}
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                    <Icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* System Health */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-display flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              System Health
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {ADMIN_SERVICES.map((svc) => (
              <div
                key={svc.name}
                className="flex items-center justify-between py-2 border-b border-border last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      svc.status === "healthy"
                        ? "bg-tms-success"
                        : "bg-tms-warning animate-pulse-dot"
                    }`}
                  />
                  <span className="text-sm font-medium text-foreground">
                    {svc.name}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {svc.response}
                  </span>
                  <Badge
                    variant={
                      svc.status === "healthy" ? "secondary" : "destructive"
                    }
                    className="text-[10px] px-1.5 py-0"
                  >
                    {svc.status}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-display flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                Recent Activity
              </CardTitle>
              <Button variant="ghost" size="sm" className="text-xs">
                View All <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {ADMIN_RECENT_ACTIVITY.map((event, i) => (
              <div
                key={i}
                className="flex items-start gap-3 py-2 border-b border-border last:border-0"
              >
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                  {event.type === "alert" || event.type === "warning" ? (
                    <AlertTriangle className="w-4 h-4 text-tms-warning" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-tms-success" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground">
                    <span className="font-medium">{event.user}</span>{" "}
                    <span className="text-muted-foreground">
                      {event.action}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {event.time}
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
