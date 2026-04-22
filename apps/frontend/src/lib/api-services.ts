import { get, post, patch, del } from "@/lib/api-client";
import type {
  AdminConfig,
  AdminHealth,
  AdminUser,
  AvailabilityRow,
  Driver,
  GeocodeResult,
  JobStatusResponse,
  LoginResponse,
  MonitorResponse,
  PaginatedTasks,
  PlanDetails,
  PlanListItem,
  ReportsResponse,
  Task,
  AuthUser,
  PlanStop,
} from "@/types/api";

/* ── helpers ── */

function qs(params?: Record<string, unknown>): string {
  if (!params) return "";
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null && v !== "",
  );
  if (!entries.length) return "";
  return `?${new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString()}`;
}

/* ── auth ── */

export const authLogin = (email: string, password: string) =>
  post<LoginResponse>("/auth/login", { email, password });

export const authMe = () => get<AuthUser>("/auth/me");

export const authLogout = () => post<void>("/auth/logout");

export const authRefresh = (refreshToken: string) =>
  post<{ token: string; refreshToken: string }>("/auth/refresh", { refreshToken });

/* ── admin ── */

export const getAdminHealth = () => get<AdminHealth>("/admin/health");
export const getAdminConfig = () => get<AdminConfig>("/admin/config");
export const patchAdminConfig = (data: Partial<AdminConfig>) =>
  patch<AdminConfig>("/admin/config", data);
export const getAdminUsers = () => get<AdminUser[]>("/admin/users");
export const createAdminUser = (data: {
  email: string;
  name?: string;
  phone?: string;
  password: string;
  role: "ADMIN" | "DISPATCHER";
}) => post<AdminUser>("/admin/users", data);
export const patchAdminUser = (id: string, data: Partial<AdminUser>) =>
  patch<AdminUser>(`/admin/users/${id}`, data);
export const deleteAdminUser = (id: string) =>
  del<{ deleted: boolean }>(`/admin/users/${id}`);

/* ── drivers (mounted at /dispatcher/drivers) ── */

export const getDrivers = () => get<Driver[]>("/dispatcher/drivers");
export const createDriver = (data: Partial<Driver>) =>
  post<Driver>("/dispatcher/drivers", data);
export const patchDriver = (id: string, data: Partial<Driver>) =>
  patch<Driver>(`/dispatcher/drivers/${id}`, data);
export const deleteDriver = (id: string) =>
  del<{ deleted: boolean }>(`/dispatcher/drivers/${id}`);

/* ── tasks (mounted at /dispatcher/tasks) ── */

export interface TaskListParams {
  page?: number;
  limit?: number;
  status?: string;
  priority?: string;
}

export const getTasks = (params?: TaskListParams) =>
  get<PaginatedTasks>(`/dispatcher/tasks${qs(params as Record<string, unknown>)}`);
export const getTask = (id: string) => get<Task>(`/dispatcher/tasks/${id}`);
export const createTask = (data: Partial<Task>) =>
  post<Task>("/dispatcher/tasks", data);
export const patchTask = (id: string, data: Partial<Task>) =>
  patch<Task>(`/dispatcher/tasks/${id}`, data);
export const deleteTask = (id: string) =>
  del<{ deleted: boolean }>(`/dispatcher/tasks/${id}`);
export const importTasks = (file: File) => {
  const form = new FormData();
  form.append("file", file);
  return post<{ created: number; errors: { row: number; message: string }[] }>(
    "/dispatcher/tasks/import",
    form,
  );
};

/* ── availability (mounted at /dispatcher/availability) ── */

export const getAvailability = (params?: { date?: string }) =>
  get<AvailabilityRow[]>(`/dispatcher/availability${qs(params)}`);

export const patchAvailability = (
  driverId: string,
  data: {
    date: string;
    available?: boolean;
    shiftStartOverride?: string | null;
    shiftEndOverride?: string | null;
  },
) => patch<AvailabilityRow>(`/dispatcher/availability/${driverId}`, data);

/* ── planning (optimizer-driven, mounted at /dispatcher/planning) ── */

export const triggerOptimize = (data: { date: string; returnToDepot?: boolean }) =>
  post<{ jobId: string; status: string; estimatedTimeSeconds: number }>(
    "/dispatcher/planning/optimize",
    data,
  );

export const getJobStatus = (jobId: string) =>
  get<JobStatusResponse>(`/dispatcher/planning/status/${jobId}`);

export const getPlans = () => get<PlanListItem[]>("/dispatcher/planning/plans");

export const getPlan = (planId: string) =>
  get<PlanDetails>(`/dispatcher/planning/plans/${planId}`);

export const publishPlan = (planId: string) =>
  post<{ planId: string; status: string; publishedAt: string; notifiedDrivers: number }>(
    `/dispatcher/planning/plans/${planId}/publish`,
  );

/* ── manual planning (the new endpoints) ── */

export const listPlansFiltered = (params?: { date?: string; status?: "draft" | "published" }) =>
  get<PlanListItem[]>(`/dispatcher/planning/plans-extended${qs(params)}`);

export const createDraftPlan = (data: { date: string; notes?: string }) =>
  post<{ planId: string; date: string; status: string; notes: string | null }>(
    "/dispatcher/planning/plans",
    data,
  );

export const updatePlanMeta = (planId: string, data: { notes?: string }) =>
  patch<{ id: string; notes: string | null; lastEditedAt: string }>(
    `/dispatcher/planning/plans/${planId}/meta`,
    data,
  );

export const deletePlan = (planId: string) =>
  del<{ planId: string; deleted: boolean }>(`/dispatcher/planning/plans/${planId}`);

export const recalculatePlan = (planId: string) =>
  post<PlanDetails>(`/dispatcher/planning/plans/${planId}/recalculate`);

export const getUnassignedTasksForDate = (planId: string, date: string) =>
  get<Task[]>(`/dispatcher/planning/plans/${planId}/unassigned${qs({ date })}`);

export const addRouteToPlan = (planId: string, data: { driverId: string }) =>
  post<{ id: string; planId: string; driverId: string }>(
    `/dispatcher/planning/plans/${planId}/routes`,
    data,
  );

export const removeRoute = (routeId: string) =>
  del<{ routeId: string; deleted: boolean }>(`/dispatcher/planning/routes/${routeId}`);

export const addTaskToRoute = (
  routeId: string,
  data: { taskId: string; insertAtSequence?: number },
) => post<PlanDetails>(`/dispatcher/planning/routes/${routeId}/stops`, data);

export const moveStop = (
  stopId: string,
  data: { targetRouteId?: string; targetSequence: number },
) => patch<PlanDetails>(`/dispatcher/planning/stops/${stopId}/move`, data);

export const updateStopMeta = (
  stopId: string,
  data: { locked?: boolean; notes?: string; etaSecondsOverride?: number },
) => patch<PlanStop>(`/dispatcher/planning/stops/${stopId}/meta`, data);

export const removeStopFromRoute = (stopId: string) =>
  del<PlanDetails>(`/dispatcher/planning/stops/${stopId}`);

/* ── monitor + reports (mounted at /dispatcher/monitor and /dispatcher/reports) ── */

export const getMonitor = (date?: string) =>
  get<MonitorResponse>(`/dispatcher/monitor${qs({ date })}`);

export const getReports = (params?: {
  period?: "1d" | "7d" | "30d";
  startDate?: string;
  endDate?: string;
}) => get<ReportsResponse>(`/dispatcher/reports${qs(params)}`);

export const exportReportsUrl = (params?: {
  period?: "1d" | "7d" | "30d";
  startDate?: string;
  endDate?: string;
}) => `/dispatcher/reports/export${qs({ ...params, format: "csv" })}`;

/* ── stops (status update mounted at /dispatcher/stops) ── */

export const updateStopStatus = (
  stopId: string,
  data: { status: "arrived" | "done" | "skipped"; actualArrivalTime?: string; notes?: string },
) =>
  patch<{
    stopId: string;
    status: string;
    nextStop: PlanStop | null;
  }>(`/dispatcher/stops/${stopId}/status`, data);

/* ── geocode ── */

export const geocodeSearch = (query: string, limit = 5) =>
  get<GeocodeResult[]>(`/geocode/search${qs({ q: query, limit })}`);
