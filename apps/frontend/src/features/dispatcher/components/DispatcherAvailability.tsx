"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface DriverAvail {
  id: string;
  name: string;
  defaultShift: string;
  depot: string;
  vehicle: string;
  availability: Record<
    string,
    { available: boolean; start: string; end: string; modified: boolean }
  >;
}

const INITIAL_DRIVERS: DriverAvail[] = [
  {
    id: "1",
    name: "Youcef Merah",
    defaultShift: "08:00-17:00",
    depot: "Algiers Central",
    vehicle: "16-A-4521",
    availability: {
      Mon: { available: true, start: "08:00", end: "17:00", modified: false },
      Tue: { available: true, start: "08:00", end: "17:00", modified: false },
      Wed: { available: true, start: "08:00", end: "17:00", modified: false },
      Thu: { available: true, start: "08:00", end: "17:00", modified: false },
      Fri: { available: true, start: "08:00", end: "17:00", modified: false },
      Sat: { available: true, start: "08:00", end: "13:00", modified: true },
      Sun: { available: false, start: "", end: "", modified: false },
    },
  },
  {
    id: "2",
    name: "Rachid Bouzid",
    defaultShift: "07:00-16:00",
    depot: "Blida Depot",
    vehicle: "09-C-1245",
    availability: {
      Mon: { available: true, start: "07:00", end: "16:00", modified: false },
      Tue: { available: true, start: "07:00", end: "16:00", modified: false },
      Wed: { available: true, start: "07:00", end: "16:00", modified: false },
      Thu: { available: true, start: "07:00", end: "16:00", modified: false },
      Fri: { available: true, start: "07:00", end: "16:00", modified: false },
      Sat: { available: false, start: "", end: "", modified: false },
      Sun: { available: false, start: "", end: "", modified: false },
    },
  },
  {
    id: "3",
    name: "Fatima Zahra",
    defaultShift: "08:00-17:00",
    depot: "Algiers Central",
    vehicle: "—",
    availability: {
      Mon: { available: false, start: "", end: "", modified: true },
      Tue: { available: false, start: "", end: "", modified: true },
      Wed: { available: false, start: "", end: "", modified: true },
      Thu: { available: false, start: "", end: "", modified: true },
      Fri: { available: false, start: "", end: "", modified: true },
      Sat: { available: false, start: "", end: "", modified: false },
      Sun: { available: false, start: "", end: "", modified: false },
    },
  },
  {
    id: "4",
    name: "Mohamed Ait",
    defaultShift: "06:00-15:00",
    depot: "Oran Depot",
    vehicle: "16-E-3344",
    availability: {
      Mon: { available: true, start: "06:00", end: "15:00", modified: false },
      Tue: { available: true, start: "06:00", end: "15:00", modified: false },
      Wed: { available: true, start: "06:00", end: "15:00", modified: false },
      Thu: { available: true, start: "06:00", end: "15:00", modified: false },
      Fri: { available: true, start: "06:00", end: "15:00", modified: false },
      Sat: { available: true, start: "06:00", end: "12:00", modified: true },
      Sun: { available: false, start: "", end: "", modified: false },
    },
  },
  {
    id: "5",
    name: "Salim Tounsi",
    defaultShift: "08:00-17:00",
    depot: "Algiers Central",
    vehicle: "16-B-7832",
    availability: {
      Mon: { available: true, start: "08:00", end: "17:00", modified: false },
      Tue: { available: true, start: "08:00", end: "17:00", modified: false },
      Wed: { available: true, start: "09:00", end: "17:00", modified: true },
      Thu: { available: true, start: "08:00", end: "17:00", modified: false },
      Fri: { available: true, start: "08:00", end: "17:00", modified: false },
      Sat: { available: false, start: "", end: "", modified: false },
      Sun: { available: false, start: "", end: "", modified: false },
    },
  },
];

export default function DispatcherAvailability() {
  const [drivers, setDrivers] = useState(INITIAL_DRIVERS);
  const availableCount = drivers.filter((d) =>
    Object.values(d.availability).some((a) => a.available),
  ).length;

  const toggleAvailability = (driverId: string, day: string) => {
    setDrivers((prev) =>
      prev.map((d) => {
        if (d.id !== driverId) return d;
        const dayAvail = d.availability[day];
        return {
          ...d,
          availability: {
            ...d.availability,
            [day]: {
              ...dayAvail,
              available: !dayAvail.available,
              modified: true,
              start: !dayAvail.available
                ? d.defaultShift.split("-")[0]
                : "",
              end: !dayAvail.available ? d.defaultShift.split("-")[1] : "",
            },
          },
        };
      }),
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">
            Driver Availability
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Week of March 1, 2026 • {availableCount} drivers with availability
          </p>
        </div>
        <Button size="sm">
          <Save className="w-4 h-4 mr-2" /> Save Changes
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-display font-bold text-foreground">
              {availableCount}
            </div>
            <div className="text-xs text-muted-foreground">
              Available Drivers
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-display font-bold text-foreground">
              96h
            </div>
            <div className="text-xs text-muted-foreground">
              Total Shift Hours
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-display font-bold text-foreground">
              4
            </div>
            <div className="text-xs text-muted-foreground">Vehicle Types</div>
          </CardContent>
        </Card>
      </div>

      {/* Calendar grid */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-3 text-sm font-medium text-muted-foreground w-48">
                  Driver
                </th>
                {DAYS.map((d) => (
                  <th
                    key={d}
                    className="text-center p-3 text-sm font-medium text-muted-foreground w-20"
                  >
                    {d}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {drivers.map((driver) => (
                <tr
                  key={driver.id}
                  className="border-b border-border last:border-0"
                >
                  <td className="p-3">
                    <div className="font-medium text-sm">{driver.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {driver.depot} • {driver.vehicle}
                    </div>
                  </td>
                  {DAYS.map((day) => {
                    const a = driver.availability[day];
                    return (
                      <td key={day} className="p-2 text-center">
                        <button
                          onClick={() =>
                            toggleAvailability(driver.id, day)
                          }
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
        </CardContent>
      </Card>

      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-tms-success-light border border-tms-success/30" />{" "}
          Available (default)
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-tms-warning-light border border-tms-warning/30" />{" "}
          Modified
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-muted" /> Unavailable
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-tms-error-light border border-tms-error/30" />{" "}
          Marked Off
        </div>
      </div>
    </div>
  );
}
