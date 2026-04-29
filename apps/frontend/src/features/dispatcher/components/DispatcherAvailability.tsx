"use client";

import { useMemo, useState } from "react";
import { addDays, format, isSameDay, startOfWeek } from "date-fns";
import * as Popover from "@radix-ui/react-popover";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useAvailability,
  useDrivers,
  useUpdateAvailability,
} from "@/features/shared/hooks";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Settings2,
} from "lucide-react";
import type { AvailabilityRow, Driver } from "@/types/api";

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function DriverDayCell({
  driver,
  date,
  row,
  onUpdate,
}: {
  driver: Driver;
  date: Date;
  row: AvailabilityRow | undefined;
  onUpdate: (data: {
    available?: boolean;
    shiftStartOverride?: string | null;
    shiftEndOverride?: string | null;
  }) => void;
}) {
  const { t } = useTranslation();
  const available = row?.available ?? true;
  const shiftStart = row?.shiftStartOverride ?? driver.shiftStart;
  const shiftEnd = row?.shiftEndOverride ?? driver.shiftEnd;
  const hasOverride = !!(row?.shiftStartOverride || row?.shiftEndOverride);
  const isToday = isSameDay(date, new Date());

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          className={`group w-full text-left rounded-md border transition-colors p-2 hover:border-primary/40 ${
            available
              ? "border-tms-success/30 bg-tms-success-light/30"
              : "border-tms-error/30 bg-tms-error-light/20"
          } ${isToday ? "ring-2 ring-primary/40" : ""}`}
        >
          <div className="flex items-center justify-between mb-1">
            <span
              className={`inline-block h-2 w-2 rounded-full ${
                available ? "bg-tms-success" : "bg-tms-error"
              }`}
            />
            {hasOverride && (
              <Badge variant="outline" className="text-[9px] px-1 py-0">
                {t("dispatcher.availability.shiftOverride")}
              </Badge>
            )}
          </div>
          <div className="text-[10px] text-foreground font-mono">
            {available ? `${shiftStart}–${shiftEnd}` : t("dispatcher.availability.off")}
          </div>
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="z-50 w-64 rounded-md border border-border bg-popover p-4 shadow-lg"
          sideOffset={6}
        >
          <div className="space-y-3">
            <div>
              <p className="text-xs font-display font-semibold text-foreground">
                {driver.name}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {format(date, "EEE dd MMM yyyy")}
              </p>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor={`avail-${driver.id}-${isoDate(date)}`}>{t("dispatcher.availability.available")}</Label>
              <Switch
                id={`avail-${driver.id}-${isoDate(date)}`}
                checked={available}
                onCheckedChange={(checked) => onUpdate({ available: checked })}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[10px]">{t("dispatcher.availability.shiftStart")}</Label>
                <Input
                  type="time"
                  defaultValue={shiftStart}
                  className="h-8 text-xs"
                  onBlur={(e) => {
                    if (e.target.value !== shiftStart) {
                      onUpdate({ shiftStartOverride: e.target.value || null });
                    }
                  }}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px]">{t("dispatcher.availability.shiftEnd")}</Label>
                <Input
                  type="time"
                  defaultValue={shiftEnd}
                  className="h-8 text-xs"
                  onBlur={(e) => {
                    if (e.target.value !== shiftEnd) {
                      onUpdate({ shiftEndOverride: e.target.value || null });
                    }
                  }}
                />
              </div>
            </div>
            {hasOverride && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs"
                onClick={() =>
                  onUpdate({
                    shiftStartOverride: null,
                    shiftEndOverride: null,
                  })
                }
              >
                {t("dispatcher.availability.clearOverride")}
              </Button>
            )}
          </div>
          <Popover.Arrow className="fill-popover" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

export default function DispatcherAvailability() {
  const { toast } = useToast();
  const { t: tFn } = useTranslation();
  const [weekStart, setWeekStart] = useState<Date>(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 }),
  );

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );

  const driversQuery = useDrivers();
  const drivers = (driversQuery.data ?? []).filter((d) => d.active);

  // Hooks must be called in a stable order — call 7 fixed hooks.
  const day0 = useAvailability(isoDate(days[0]));
  const day1 = useAvailability(isoDate(days[1]));
  const day2 = useAvailability(isoDate(days[2]));
  const day3 = useAvailability(isoDate(days[3]));
  const day4 = useAvailability(isoDate(days[4]));
  const day5 = useAvailability(isoDate(days[5]));
  const day6 = useAvailability(isoDate(days[6]));
  const dayQueries = [day0, day1, day2, day3, day4, day5, day6];

  const updateAvailability = useUpdateAvailability();

  const isLoading = driversQuery.isLoading || dayQueries.some((q) => q.isLoading);
  const isError = driversQuery.isError || dayQueries.some((q) => q.isError);

  function findRow(driverId: string, dayIndex: number): AvailabilityRow | undefined {
    return dayQueries[dayIndex].data?.find((r) => r.driverId === driverId);
  }

  async function handleUpdate(
    driverId: string,
    date: string,
    data: {
      available?: boolean;
      shiftStartOverride?: string | null;
      shiftEndOverride?: string | null;
    },
  ) {
    try {
      await updateAvailability.mutateAsync({
        driverId,
        data: { date, ...data },
      });
    } catch (err) {
      toast({
        title: tFn("common.updateFailed"),
        description: err instanceof Error ? err.message : tFn("common.unknownError"),
        variant: "destructive",
      });
    }
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <PageHeader
        title={tFn("dispatcher.availability.title")}
        subtitle={tFn("dispatcher.availability.subtitle")}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setWeekStart(addDays(weekStart, -7))}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm font-display font-semibold whitespace-nowrap">
              {format(weekStart, "dd MMM")} –{" "}
              {format(addDays(weekStart, 6), "dd MMM yyyy")}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setWeekStart(addDays(weekStart, 7))}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))
              }
            >
              {tFn("common.today")}
            </Button>
          </div>
        }
      />

      <Card>
        <CardContent className="p-4">
          {isError ? (
            <ErrorState
              message={tFn("dispatcher.availability.noActiveDriversHint")}
              onRetry={() => driversQuery.refetch()}
            />
          ) : isLoading && drivers.length === 0 ? (
            <Skeleton className="h-64 w-full" />
          ) : drivers.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title={tFn("dispatcher.availability.noActiveDrivers")}
              description={tFn("dispatcher.availability.noActiveDriversHint")}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-separate border-spacing-1">
                <thead>
                  <tr>
                    <th className="text-left text-xs font-display text-muted-foreground ps-1 sticky start-0 bg-background z-10">
                      {tFn("admin.dashboard.drivers")}
                    </th>
                    {days.map((d) => (
                      <th
                        key={isoDate(d)}
                        className="text-center text-xs font-display text-muted-foreground"
                      >
                        <div>{format(d, "EEE")}</div>
                        <div className="font-mono text-[10px] text-muted-foreground/70">
                          {format(d, "dd/MM")}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {drivers.map((driver) => (
                    <tr key={driver.id}>
                      <td className="pe-2 py-1 sticky start-0 bg-background z-10">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-[10px] font-semibold text-primary">
                              {driver.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .slice(0, 2)
                                .toUpperCase()}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-medium text-foreground truncate max-w-[140px]">
                              {driver.name}
                            </div>
                            <div className="text-[10px] text-muted-foreground font-mono">
                              {driver.shiftStart}–{driver.shiftEnd}
                            </div>
                          </div>
                        </div>
                      </td>
                      {days.map((d, idx) => {
                        const date = isoDate(d);
                        const row = findRow(driver.id, idx);
                        return (
                          <td key={date} className="min-w-[100px] align-top">
                            <DriverDayCell
                              driver={driver}
                              date={d}
                              row={row}
                              onUpdate={(data) => handleUpdate(driver.id, date, data)}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {updateAvailability.isPending && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-3">
              <Loader2 className="w-3 h-3 animate-spin" />
              {tFn("common.loading")}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <Settings2 className="w-3 h-3" />
        Click a cell to set availability or override the day&apos;s shift hours.
      </div>
    </div>
  );
}
