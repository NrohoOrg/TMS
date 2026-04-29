"use client";

import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { useReports } from "@/features/shared/hooks";
import { exportReportsUrl } from "@/lib/api-services";
import { Download, BarChart3 } from "lucide-react";
import { useTranslation } from "react-i18next";

const PIE_COLORS = ["#2265c3", "#dc2626", "#0d9488", "#7c3aed", "#f59e0b", "#16a34a"];

export default function DispatcherReports() {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<"1d" | "7d" | "30d">("7d");
  const reportsQuery = useReports({ period });
  const r = reportsQuery.data;

  function handleExport() {
    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://172.20.10.2:3001/api";
    const path = exportReportsUrl({ period });
    window.open(`${apiBase}${path}`, "_blank");
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <PageHeader
        title={t("dispatcher.reports.title")}
        subtitle={t("dispatcher.reports.subtitle")}
        actions={
          <div className="flex items-center gap-2">
            <Select value={period} onValueChange={(v) => setPeriod(v as "1d" | "7d" | "30d")}>
              <SelectTrigger className="h-9 w-32 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1d">{t("common.today")}</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" onClick={handleExport}>
              <Download className="w-3.5 h-3.5 me-1" /> Export CSV
            </Button>
          </div>
        }
      />

      {reportsQuery.isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : reportsQuery.isError ? (
        <ErrorState
          message={reportsQuery.error instanceof Error ? reportsQuery.error.message : "Failed to load reports"}
          onRetry={() => reportsQuery.refetch()}
        />
      ) : !r ? (
        <EmptyState icon={BarChart3} title="No reports data" />
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <KpiTile label={t("admin.dashboard.tasks")} value={r.kpis.totalTasks} />
            <KpiTile label={t("common.completed")} value={r.kpis.completedTasks} tone="success" />
            <KpiTile label="Completion Rate" value={`${r.kpis.completionRate}%`} />
            <KpiTile label="Plans Published" value={r.kpis.publishedPlans} />
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-display">Daily completion rate</CardTitle>
            </CardHeader>
            <CardContent>
              {r.dailySummary.length === 0 ? (
                <EmptyState icon={BarChart3} title="No daily data for this range" />
              ) : (
                <div style={{ width: "100%", height: 260 }}>
                  <ResponsiveContainer>
                    <LineChart data={r.dailySummary}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="completionRate"
                        name="Completion %"
                        stroke="#2265c3"
                        strokeWidth={2}
                      />
                      <Line
                        type="monotone"
                        dataKey="tasks"
                        name="Tasks"
                        stroke="#0d9488"
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-display">Driver performance</CardTitle>
            </CardHeader>
            <CardContent>
              {r.driverPerformance.length === 0 ? (
                <EmptyState icon={BarChart3} title="No driver data yet" />
              ) : (
                <div style={{ width: "100%", height: 260 }}>
                  <ResponsiveContainer>
                    <BarChart data={r.driverPerformance}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis
                        dataKey="driverName"
                        tick={{ fontSize: 11 }}
                        angle={-15}
                        textAnchor="end"
                        height={50}
                      />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="completedStops" name="Completed stops" fill="#10b981" />
                      <Bar dataKey="assignedTasks" name="Assigned tasks" fill="#2265c3" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {r.unassignedAnalysis.byReason.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-display">
                  Unassigned tasks ({r.unassignedAnalysis.totalUnassigned})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div style={{ width: "100%", height: 260 }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={r.unassignedAnalysis.byReason}
                        dataKey="count"
                        nameKey="reason"
                        cx="50%"
                        cy="50%"
                        outerRadius={90}
                        label={(entry) => `${(entry as unknown as { reason: string }).reason}`}
                      >
                        {r.unassignedAnalysis.byReason.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function KpiTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | string;
  tone?: "success";
}) {
  return (
    <Card>
      <CardContent className="p-3 text-center">
        <div
          className={`text-2xl font-display font-bold ${
            tone === "success" ? "text-tms-success-dark" : "text-foreground"
          }`}
        >
          {value}
        </div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      </CardContent>
    </Card>
  );
}
