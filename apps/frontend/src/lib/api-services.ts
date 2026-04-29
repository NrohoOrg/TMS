import { get, post, patch, del } from "@/lib/api-client";
import type {
  AdminConfig,
  AdminHealth,
  AdminUser,
  AvailabilityRow,
  CadreTaskView,
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
  role: "ADMIN" | "DISPATCHER" | "CADRE";
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
export const approveTask = (id: string) =>
  post<Task>(`/dispatcher/tasks/${id}/approve`);
export const rejectTask = (id: string) =>
  post<Task>(`/dispatcher/tasks/${id}/reject`);

/* ── cadre tasks (mounted at /cadre/tasks) ── */
export const getMyCadreTasks = () => get<CadreTaskView[]>(`/cadre/tasks/mine`);
export const createCadreTask = (data: Partial<Task>) =>
  post<Task>(`/cadre/tasks`, data);
export const patchCadreTask = (id: string, data: Partial<Task>) =>
  patch<Task>(`/cadre/tasks/${id}`, data);
export const deleteCadreTask = (id: string) =>
  del<void>(`/cadre/tasks/${id}`);

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

/* ── incidents (mounted at /dispatcher/incidents) ── v1.1 R1.3+ */

export interface DriverUnavailablePreview {
  driverId: string;
  driverName: string;
  date: string;
  publishedPlanId: string | null;
  affectedTasks: Array<{
    taskId: string;
    title: string;
    pickupAddress: string;
    dropoffAddress: string;
    priority: string;
    pickupSequence: number;
  }>;
  frozenStopsCount: number;
}

export interface DriverUnavailableResult {
  driverId: string;
  date: string;
  shiftEndOverride: string;
  releasedTaskIds: string[];
  frozenStopsCount: number;
}

export const previewDriverUnavailable = (driverId: string, date?: string) =>
  get<DriverUnavailablePreview>(
    `/dispatcher/incidents/driver-unavailable/preview${qs({ driverId, date })}`,
  );

export const markDriverUnavailable = (data: {
  driverId: string;
  date: string;
  fromTime: string;
  toTime?: string;
}) =>
  post<DriverUnavailableResult>("/dispatcher/incidents/driver-unavailable", data);

export interface MidDayAssignmentSummary {
  taskId: string;
  taskTitle: string;
  driverId: string;
  driverName: string;
  /** Title of the existing stop the new pickup got inserted right after.
   *  Null = added at the start of the driver's route. */
  insertedAfterTaskTitle: string | null;
  /** 1-based sequence the new pickup landed at. */
  pickupSequence: number;
}

export interface MidDayResult {
  date: string;
  publishedPlanId: string | null;
  assignedCount: number;
  unassigned: Array<{ taskId: string; reason: string }>;
  affectedDriverIds: string[];
  assignments: MidDayAssignmentSummary[];
  /** True when the API ran in preview mode and DID NOT persist anything. */
  dryRun: boolean;
}

export const runMidDayReoptimization = (date?: string, dryRun?: boolean) =>
  post<MidDayResult>("/dispatcher/incidents/run-midday", { date, dryRun });

export interface UrgentInterruptViolation {
  stopId: string;
  taskId: string;
  type: "pickup" | "dropoff" | "shift";
  taskTitle: string | null;
  newEtaS: number;
  latestAllowedS: number;
  delaySeconds: number;
}

export interface UrgentInterruptResult {
  taskId: string;
  driverId: string;
  driverName: string;
  insertedAtSequence: number;
  fromDepot: boolean;
  distanceM: number;
  violations: UrgentInterruptViolation[];
}

export const runUrgentInterrupt = (taskId: string, date?: string) =>
  post<UrgentInterruptResult>("/dispatcher/incidents/urgent-interrupt", {
    taskId,
    date,
  });

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

export const sendTestSms = () =>
  post<{
    success: boolean;
    code: string | null;
    messageId: string | null;
    providerResponse: string;
    destination: string;
  }>("/dispatcher/planning/sms/test");

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

export interface ImpactSummary {
  date: string;
  hasPlan: boolean;
  tasksCompleted: number;
  tasksAssigned: number;
  driversActive: number;
  unassignedCount: number;
  optimizedDistanceKm: number;
  naiveBaselineKm: number;
  kmSaved: number;
  savingsPercent: number;
  co2KgSaved: number;
  fuelLitersSaved: number;
  dieselCostSavedDZD: number;
}

export const getImpact = (date?: string) =>
  get<ImpactSummary>(`/dispatcher/impact${qs({ date })}`);

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

export const geocodeResolve = (placeId: string) =>
  get<{ lat: number; lng: number } | null>(`/geocode/resolve${qs({ placeId })}`);
