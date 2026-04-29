"use client";

import { Card, CardContent } from "@/components/ui/card";
import { useImpact } from "@/features/shared/hooks";
import {
  CheckCircle2,
  Fuel,
  Leaf,
  Route as RouteIcon,
  Scissors,
  Users,
  Wallet,
} from "lucide-react";
import { useTranslation } from "react-i18next";

interface Props {
  /** Optional YYYY-MM-DD; defaults to today on the server. */
  date?: string;
}

/**
 * Compact strip showing today's impact KPIs. Intended to live above the
 * filters on the Tasks page so the dispatcher sees the daily benefits at
 * every login.
 *
 * Honest framing: "km saved" is computed against a naive single-trip-per-task
 * baseline. CO2 + fuel + cost are derived from km saved using configurable
 * constants (defaults = EEA / typical Algerian fleet figures).
 */
export function ImpactStrip({ date }: Props) {
  const { data, isLoading } = useImpact(date);
  const { t, i18n } = useTranslation();

  if (isLoading) {
    return (
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-3 text-xs text-muted-foreground">
          {t("dispatcher.impact.computing")}
        </CardContent>
      </Card>
    );
  }

  if (!data || !data.hasPlan) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-3 text-xs text-muted-foreground">
          {t("dispatcher.impact.noPlan")}
        </CardContent>
      </Card>
    );
  }

  const dateLabel = new Date(data.date).toLocaleDateString(i18n.language, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <Card className="border-primary/30 bg-gradient-to-r from-primary/5 to-tms-success/5">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-baseline justify-between gap-2 flex-wrap">
          <h3 className="text-sm font-display font-semibold">
            {t("dispatcher.impact.title")}{" "}
            <span className="text-muted-foreground font-normal">· {dateLabel}</span>
          </h3>
          {data.savingsPercent > 0 && (
            <span className="text-[11px] text-muted-foreground">
              {t("dispatcher.impact.savingsHint", {
                percent: data.savingsPercent.toFixed(1),
              })}
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
          <Tile
            icon={CheckCircle2}
            label={t("dispatcher.impact.tasksDone")}
            value={`${data.tasksCompleted} / ${data.tasksAssigned}`}
            tone="success"
          />
          <Tile
            icon={Users}
            label={t("dispatcher.impact.drivers")}
            value={String(data.driversActive)}
          />
          <Tile
            icon={RouteIcon}
            label={t("dispatcher.impact.distance")}
            value={`${data.optimizedDistanceKm.toFixed(1)} ${t("dispatcher.impact.unitKm")}`}
          />
          <Tile
            icon={Scissors}
            label={t("dispatcher.impact.saved")}
            value={`${data.kmSaved.toFixed(1)} ${t("dispatcher.impact.unitKm")}`}
            tone="primary"
            emphasis
          />
          <Tile
            icon={Leaf}
            label={t("dispatcher.impact.co2Avoided")}
            value={`${data.co2KgSaved.toFixed(1)} ${t("dispatcher.impact.unitKg")}`}
            tone="success"
          />
          <Tile
            icon={Fuel}
            label={t("dispatcher.impact.fuelSaved")}
            value={`${data.fuelLitersSaved.toFixed(1)} ${t("dispatcher.impact.unitL")}`}
          />
          <Tile
            icon={Wallet}
            label={t("dispatcher.impact.costSaved")}
            value={`${data.dieselCostSavedDZD.toLocaleString(i18n.language)} ${t("dispatcher.impact.unitDzd")}`}
            tone="success"
          />
        </div>
      </CardContent>
    </Card>
  );
}

function Tile({
  icon: Icon,
  label,
  value,
  tone,
  emphasis,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  tone?: "success" | "primary";
  emphasis?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <Icon
        className={`w-4 h-4 flex-shrink-0 ${
          tone === "success"
            ? "text-tms-success"
            : tone === "primary"
              ? "text-primary"
              : "text-muted-foreground"
        }`}
      />
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground truncate">
          {label}
        </div>
        <div
          className={`text-sm font-display tabular-nums ${
            emphasis ? "font-bold text-foreground" : "font-semibold text-foreground"
          }`}
        >
          {value}
        </div>
      </div>
    </div>
  );
}
