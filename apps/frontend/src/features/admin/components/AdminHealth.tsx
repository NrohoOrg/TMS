"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Activity,
  Database,
  MapPin,
  Cpu,
  Cloud,
  HardDrive,
  RefreshCw,
} from "lucide-react";
import { MOCK_HEALTH_SERVICES } from "@/lib/mock-data";

const ICON_MAP: Record<string, React.ElementType> = {
  Database,
  MapPin,
  Cpu,
  Cloud,
  HardDrive,
};

const STATUS_COLORS: Record<string, string> = {
  healthy: "bg-tms-success",
  degraded: "bg-tms-warning animate-pulse-dot",
  down: "bg-tms-error animate-pulse-dot",
};

export default function AdminHealth() {
  const healthyCount = MOCK_HEALTH_SERVICES.filter(
    (s) => s.status === "healthy",
  ).length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">
            System Health
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {healthyCount}/{MOCK_HEALTH_SERVICES.length} services healthy •
            Auto-refresh every 5 min
          </p>
        </div>
        <Button variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" /> Refresh Now
        </Button>
      </div>

      {/* Overall status */}
      <Card
        className={
          healthyCount === MOCK_HEALTH_SERVICES.length
            ? "border-tms-success/30"
            : "border-tms-warning/30"
        }
      >
        <CardContent className="p-4 flex items-center gap-4">
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center ${
              healthyCount === MOCK_HEALTH_SERVICES.length
                ? "bg-tms-success-light"
                : "bg-tms-warning-light"
            }`}
          >
            <Activity
              className={`w-6 h-6 ${
                healthyCount === MOCK_HEALTH_SERVICES.length
                  ? "text-tms-success-dark"
                  : "text-tms-warning-dark"
              }`}
            />
          </div>
          <div>
            <p className="font-display font-bold text-foreground">
              {healthyCount === MOCK_HEALTH_SERVICES.length
                ? "All Systems Operational"
                : "Partial Degradation"}
            </p>
            <p className="text-sm text-muted-foreground">
              {healthyCount} of {MOCK_HEALTH_SERVICES.length} services are
              running normally
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Services grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {MOCK_HEALTH_SERVICES.map((svc) => {
          const Icon = ICON_MAP[svc.iconName] ?? Activity;
          return (
            <Card
              key={svc.name}
              className={svc.status !== "healthy" ? "border-tms-warning/30" : ""}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-primary" />
                    <CardTitle className="text-sm font-display">
                      {svc.name}
                    </CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2 h-2 rounded-full ${STATUS_COLORS[svc.status]}`}
                    />
                    <Badge
                      variant={
                        svc.status === "healthy" ? "secondary" : "destructive"
                      }
                      className="text-[10px]"
                    >
                      {svc.status}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-muted-foreground">Response:</span>{" "}
                    <span className="font-medium">{svc.response}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Uptime:</span>{" "}
                    <span className="font-medium">{svc.uptime}</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">{svc.details}</p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">CPU</span>
                    <span className="font-medium">{svc.metrics.cpu}%</span>
                  </div>
                  <Progress value={svc.metrics.cpu} className="h-1" />
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Memory</span>
                    <span className="font-medium">{svc.metrics.memory}%</span>
                  </div>
                  <Progress value={svc.metrics.memory} className="h-1" />
                </div>
                {svc.status !== "healthy" && (
                  <Button variant="outline" size="sm" className="w-full text-xs">
                    <RefreshCw className="w-3 h-3 mr-1" /> Restart Service
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
