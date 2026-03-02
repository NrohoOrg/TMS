"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  MapPin,
  Clock,
  Navigation,
  Phone,
  CheckCircle2,
  Circle,
  ArrowRight,
} from "lucide-react";
import { MOCK_DRIVER_ROUTE, MOCK_DRIVER_STOPS } from "@/lib/mock-data";

const STOP_STATUS_MAP: Record<
  string,
  { color: string; icon: typeof CheckCircle2 }
> = {
  done: { color: "text-tms-success", icon: CheckCircle2 },
  current: { color: "text-primary", icon: Navigation },
  pending: { color: "text-muted-foreground", icon: Circle },
};

export default function DriverDashboard() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">
            My Route
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {MOCK_DRIVER_ROUTE.shift} • {MOCK_DRIVER_ROUTE.vehicle}
          </p>
        </div>
        <Badge
          variant="secondary"
          className="bg-tms-success-light text-tms-success"
        >
          On Route
        </Badge>
      </div>

      {/* Route Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <MapPin className="w-5 h-5 text-primary mx-auto mb-1" />
            <div className="text-lg font-display font-bold">
              {MOCK_DRIVER_ROUTE.totalStops}
            </div>
            <div className="text-xs text-muted-foreground">Total Stops</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle2 className="w-5 h-5 text-tms-success mx-auto mb-1" />
            <div className="text-lg font-display font-bold">
              {MOCK_DRIVER_ROUTE.completedStops}
            </div>
            <div className="text-xs text-muted-foreground">Completed</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="w-5 h-5 text-tms-info mx-auto mb-1" />
            <div className="text-lg font-display font-bold">
              {MOCK_DRIVER_ROUTE.eta}
            </div>
            <div className="text-xs text-muted-foreground">ETA</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Navigation className="w-5 h-5 text-tms-warning mx-auto mb-1" />
            <div className="text-lg font-display font-bold">
              {MOCK_DRIVER_ROUTE.totalDistance}
            </div>
            <div className="text-xs text-muted-foreground">Km Remaining</div>
          </CardContent>
        </Card>
      </div>

      {/* Stop Timeline */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-display">Stop Timeline</CardTitle>
        </CardHeader>
        <CardContent className="space-y-0">
          {MOCK_DRIVER_STOPS.map((stop, i) => {
            const meta = STOP_STATUS_MAP[stop.status] ?? STOP_STATUS_MAP.pending;
            const Icon = meta.icon;
            const isLast = i === MOCK_DRIVER_STOPS.length - 1;

            return (
              <div key={stop.num} className="relative flex gap-4">
                {/* Timeline line */}
                {!isLast && (
                  <div className="absolute left-[11px] top-7 bottom-0 w-px bg-border" />
                )}

                {/* Icon */}
                <div className="pt-1 shrink-0">
                  <Icon className={`w-6 h-6 ${meta.color}`} />
                </div>

                {/* Content */}
                <div className="flex-1 pb-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">
                          Stop {stop.num}
                        </span>
                        {stop.status === "current" && (
                          <Badge
                            variant="default"
                            className="text-[10px] h-5 animate-pulse"
                          >
                            Current
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {stop.address}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span>
                          <Clock className="w-3 h-3 inline mr-1" />
                          {stop.scheduled}
                        </span>
                        <span>{stop.contact}</span>
                      </div>
                    </div>
                    {stop.status === "current" && (
                      <div className="flex gap-1.5">
                        <Button size="sm" variant="outline" className="h-8">
                          <Phone className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="sm" className="h-8">
                          <ArrowRight className="w-3.5 h-3.5 mr-1" /> Navigate
                        </Button>
                      </div>
                    )}
                    {stop.status === "done" && (
                      <span className="text-xs text-tms-success font-medium">
                        {stop.actual}
                      </span>
                    )}
                  </div>
                  {stop.status === "current" && (
                    <>
                      <Separator className="my-3" />
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-muted-foreground">
                            Service Time:
                          </span>{" "}
                          <span className="font-medium">{stop.service}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">
                            Contact:
                          </span>{" "}
                          <span className="font-medium">{stop.contact}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-muted-foreground">Instructions:</span>{" "}
                          <span className="font-medium">{stop.instructions}</span>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <Button
                          size="sm"
                          className="bg-tms-success hover:bg-tms-success-dark text-primary-foreground"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Mark
                          Complete
                        </Button>
                        <Button size="sm" variant="outline">
                          Report Issue
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
