"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Save, Loader } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useDriversList, useUpsertAvailability, useAvailabilityList } from "../hooks";
import type { ApiDriver, ApiAvailability } from "../types";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface DriverWithAvailability {
  driver: ApiDriver;
  availability: Record<
    string,
    { available: boolean; start: string; end: string; modified: boolean; date: string }
  >;
}

// Helper: Get day name from date
function getDayName(date: Date): string {
  const dayIndex = date.getDay();
  return DAYS[(dayIndex + 6) % 7]; // JS uses 0=Sunday, we use 0=Monday
}

// Helper: Format date as YYYY-MM-DD
function formatDateYYYYMMDD(date: Date): string {
  return date.toISOString().split("T")[0];
}

// Helper: Get this week's Monday date
function getWeekMonday(): Date {
  const today = new Date();
  const dayIndex = today.getDay();
  const diff = today.getDate() - dayIndex + (dayIndex === 0 ? -6 : 1);
  const monday = new Date(today.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

export default function DispatcherAvailability() {
  const { toast } = useToast();
  const [weekMonday] = useState(() => getWeekMonday());
  const [weekDates] = useState(() => {
    const dates: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekMonday);
      d.setDate(d.getDate() + i);
      dates.push(d);
    }
    return dates;
  });

  // Fetch drivers and availability for this week
  const { data: drivers = [], isLoading: driversLoading } = useDriversList();
  
  // Fetch availability for each day of the week
  const availabilityQueries = weekDates.map(date =>
    useAvailabilityList({ date: formatDateYYYYMMDD(date) })
  );
  
  const upsertMutation = useUpsertAvailability();

  const [pendingChanges, setPendingChanges] = useState<
    Map<string, { driverId: string; date: string; payload: any }>
  >(new Map());

  // Merge drivers with their availability data
  const driversWithAvailability: DriverWithAvailability[] = drivers.map((driver) => {
    const availability: DriverWithAvailability["availability"] = {};

    weekDates.forEach((date, dayIndex) => {
      const dateStr = formatDateYYYYMMDD(date);
      const dayName = DAYS[dayIndex];
      
      // Find availability record for this driver and date
      const availRec = availabilityQueries[dayIndex].data?.find(
        (a) => a.driverId === driver.id
      );

      // Determine if modified by checking pending changes
      const changeKey = `${driver.id}-${dateStr}`;
      const isPending = pendingChanges.has(changeKey);

      if (availRec) {
        availability[dayName] = {
          available: availRec.available,
          start: availRec.shiftStartOverride || driver.shiftStart,
          end: availRec.shiftEndOverride || driver.shiftEnd,
          modified: isPending,
          date: dateStr,
        };
      } else {
        // No override: use driver's default shift (always available unless marked off in backend)
        availability[dayName] = {
          available: true,
          start: driver.shiftStart,
          end: driver.shiftEnd,
          modified: isPending,
          date: dateStr,
        };
      }
    });

    return { driver, availability };
  });

  const availableCount = driversWithAvailability.filter((d) =>
    Object.values(d.availability).some((a) => a.available),
  ).length;

  const toggleAvailability = async (driverId: string, dayName: string) => {
    const driverAvail = driversWithAvailability.find(
      (d) => d.driver.id === driverId
    );
    if (!driverAvail) return;

    const dayAvail = driverAvail.availability[dayName];
    const dateStr = dayAvail.date;
    const changeKey = `${driverId}-${dateStr}`;

    // Mark as pending
    setPendingChanges((prev) => {
      const next = new Map(prev);
      next.set(changeKey, {
        driverId,
        date: dateStr,
        payload: {
          date: dateStr,
          available: !dayAvail.available,
          shiftStartOverride: !dayAvail.available ? driverAvail.driver.shiftStart : undefined,
          shiftEndOverride: !dayAvail.available ? driverAvail.driver.shiftEnd : undefined,
        },
      });
      return next;
    });
  };

  const handleSaveChanges = async () => {
    if (pendingChanges.size === 0) {
      toast({ title: "No changes to save" });
      return;
    }

    try {
      // Submit all pending changes
      const promises = Array.from(pendingChanges.values()).map((change) =>
        upsertMutation.mutateAsync({
          driverId: change.driverId,
          payload: change.payload,
        })
      );

      await Promise.all(promises);
      setPendingChanges(new Map());
      toast({ title: "Availability saved successfully", variant: "default" });
    } catch (error) {
      console.error("Error saving availability:", error);
      toast({
        title: "Failed to save availability",
        variant: "destructive",
      });
    }
  };

  const isLoading = driversLoading || availabilityQueries.some((q) => q.isLoading);
  const isSaving = upsertMutation.isPending;
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">
            Driver Availability
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Week of {weekMonday.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })} • {availableCount} drivers with availability
          </p>
        </div>
        <Button
          size="sm"
          onClick={handleSaveChanges}
          disabled={pendingChanges.size === 0 || isSaving}
        >
          {isSaving ? (
            <>
              <Loader className="w-4 h-4 mr-2 animate-spin" /> Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" /> Save Changes
              {pendingChanges.size > 0 && ` (${pendingChanges.size})`}
            </>
          )}
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-display font-bold text-foreground">
              {isLoading ? "—" : drivers.length}
            </div>
            <div className="text-xs text-muted-foreground">
              Total Drivers
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-display font-bold text-foreground">
              {isLoading ? "—" : availableCount}
            </div>
            <div className="text-xs text-muted-foreground">
              Available Drivers
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-display font-bold text-foreground">
              {isLoading ? "—" : pendingChanges.size}
            </div>
            <div className="text-xs text-muted-foreground">
              Pending Changes
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Calendar grid */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">
              Loading availability data...
            </div>
          ) : driversWithAvailability.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No drivers available
            </div>
          ) : (
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-3 text-sm font-medium text-muted-foreground w-48">
                    Driver
                  </th>
                  {DAYS.map((d, idx) => (
                    <th
                      key={d}
                      className="text-center p-3 text-sm font-medium text-muted-foreground w-24"
                    >
                      <div>{d}</div>
                      <div className="text-xs font-normal text-xs">
                        {weekDates[idx].toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {driversWithAvailability.map(({ driver, availability }) => (
                  <tr
                    key={driver.id}
                    className="border-b border-border last:border-0"
                  >
                    <td className="p-3">
                      <div className="font-medium text-sm">{driver.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {driver.phone}
                      </div>
                    </td>
                    {DAYS.map((day) => {
                      const a = availability[day];
                      return (
                        <td key={day} className="p-2 text-center">
                          <button
                            onClick={() => toggleAvailability(driver.id, day)}
                            className={`w-full py-2 px-1 rounded-md text-xs font-medium transition-colors ${
                              a.available
                                ? a.modified
                                  ? "bg-tms-warning-light text-tms-warning-dark border border-tms-warning/30"
                                  : "bg-tms-success-light text-tms-success-dark"
                                : a.modified
                                  ? "bg-tms-error-light text-tms-error-dark border border-tms-error/20"
                                  : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {a.available ? `${a.start}-${a.end}` : "Off"}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-tms-success-light border border-tms-success/30" />{" "}
          Available (default)
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-tms-warning-light border border-tms-warning/30" />{" "}
          Modified (pending)
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-muted" /> Unavailable
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-tms-error-light border border-tms-error/30" />{" "}
          Marked Off (pending)
        </div>
      </div>
    </div>
  );
}
