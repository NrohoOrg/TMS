/**
 * Shared TypeScript types for API responses.
 * Mirrors NestJS controllers in apps/api/src/.
 */

export type Role = "ADMIN" | "DISPATCHER" | "DRIVER" | "CADRE";

export type Priority = "normal" | "urgent";
export type TaskStatus = "pending" | "assigned" | "cancelled";
export type TaskApprovalStatus = "pending_approval" | "approved" | "rejected";
export type CadreDisplayStatus =
  | "created"
  | "approved"
  | "rejected"
  | "assigned"
  | "started"
  | "completed";
export type StopType = "pickup" | "dropoff";
export type StopStatus = "pending" | "arrived" | "done" | "skipped";
export type PlanStatus = "draft" | "published";
export type JobStatus = "queued" | "running" | "completed" | "failed";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  phone: string | null;
  avatar: string | null;
  expiresIn: number;
}

export interface LoginResponse {
  token: string;
  refreshToken: string;
  user: AuthUser;
}

/* ── Drivers ── */
export interface Driver {
  id: string;
  name: string;
  phone: string;
  shiftStart: string;
  shiftEnd: string;
  depotLat: number;
  depotLng: number;
  capacityUnits: number | null;
  vehicleName: string | null;
  vehiclePlate: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

/* ── Tasks ── */
export interface Task {
  id: string;
  title: string;
  pickupAddress: string;
  pickupLat: number;
  pickupLng: number;
  pickupWindowStart: string;
  pickupWindowEnd: string;
  pickupServiceMinutes: number;
  dropoffAddress: string;
  dropoffLat: number;
  dropoffLng: number;
  priority: Priority;
  status: TaskStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  approvalStatus?: TaskApprovalStatus;
  createdById?: string | null;
  createdBy?: { id: string; name: string | null; email: string } | null;
}

export interface CadreTaskView extends Task {
  displayStatus: CadreDisplayStatus;
  assignedDriverName: string | null;
}

export interface PaginatedTasks {
  total: number;
  data: Task[];
}

/* ── Plans ── */
export interface PlanStop {
  stopId: string;
  sequence: number;
  taskId: string;
  type: StopType;
  etaSeconds: number;
  departureSeconds: number;
  status: StopStatus;
  locked?: boolean;
  manuallyAssigned?: boolean;
  task: {
    title: string;
    pickupAddress: string;
    dropoffAddress: string;
    priority: Priority;
    pickupLat?: number;
    pickupLng?: number;
    dropoffLat?: number;
    dropoffLng?: number;
  };
}

export interface PlanRoute {
  driverId: string;
  driverName: string;
  routeId?: string;
  totalDistanceKm: number;
  totalTimeMinutes: number;
  stops: PlanStop[];
}

export interface UnassignedTaskInPlan {
  taskId: string;
  title: string;
  pickupAddress: string;
  dropoffAddress: string;
  priority: Priority;
  reason: string;
}

export interface PlanDetails {
  planId: string;
  date: string;
  status: PlanStatus;
  notes?: string | null;
  routes: PlanRoute[];
  unassigned: UnassignedTaskInPlan[];
}

export interface PlanListItem {
  planId: string;
  date: string;
  status: PlanStatus;
  createdAt: string;
  publishedAt?: string | null;
  notes?: string | null;
  lastEditedAt?: string | null;
  routeCount: number;
  taskCount: number;
  createdBy?: { id: string; name: string | null; email: string };
}

/* ── Optimization job ── */
export interface JobStatusResponse {
  jobId: string;
  status: JobStatus;
  progressPercent: number;
  planId: string | null;
  error: string | null;
  startedAt: string | null;
  finishedAt: string | null;
}

/* ── Monitor ── */
export interface MonitorOverview {
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
  delays: number;
}

export interface MonitorDriver {
  id: string;
  name: string;
  phone: string;
  vehicle: null;
  status: "on_route" | "at_stop" | "completed";
  /** false when the dispatcher has marked the driver unavailable today. */
  available: boolean;
  /** HH:MM when the driver became unavailable. Null if still available. */
  unavailableFromTime: string | null;
  currentStop: {
    stopId: string;
    sequence: number;
    taskId: string;
    address: string;
    scheduledArrival: string;
    etaSeconds: number;
  } | null;
  progress: { completed: number; total: number };
}

export interface MonitorEvent {
  time: string;
  driverId: string;
  driverName: string;
  event: string;
  type: "success" | "warning" | "info";
}

export interface MonitorResponse {
  date: string;
  planId: string | null;
  overview: MonitorOverview;
  drivers: MonitorDriver[];
  recentEvents: MonitorEvent[];
}

/* ── Reports ── */
export interface ReportsResponse {
  period: string;
  startDate: string;
  endDate: string;
  kpis: {
    avgPlanTime: number;
    avgDailyCompletionRate: number;
    totalTasks: number;
    completedTasks: number;
    completionRate: number;
    totalPlans: number;
    publishedPlans: number;
  };
  dailySummary: Array<{
    date: string;
    tasks: number;
    completed: number;
    completionRate: number;
    plans: number;
    publishedPlans: number;
  }>;
  driverPerformance: Array<{
    driverId: string;
    driverName: string;
    assignedTasks: number;
    completedStops: number;
    completionRate: number;
  }>;
  unassignedAnalysis: {
    totalUnassigned: number;
    jobsAnalyzed: number;
    byReason: Array<{ reason: string; count: number; percentage: number }>;
  };
}

/* ── Availability ── */
export interface AvailabilityRow {
  driverId: string;
  date: string;
  available: boolean;
  shiftStartOverride: string | null;
  shiftEndOverride: string | null;
  id?: string;
}

/* ── Geocode ── */
export interface GeocodeResult {
  placeId: string;
  displayName: string;
  lat: number;
  lng: number;
  type?: string;
  importance?: number;
}

/* ── Admin ── */
export interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  role: Role;
  lastLogin: string | null;
  createdAt: string;
}

export interface AdminConfig {
  maxSolveSeconds: number;
  speedKmh: number;
  objectiveWeights: Record<string, number>;
  smsEnabled: boolean;
  updatedAt: string;
}

export type ServiceStatus = "ok" | "error";

export interface AdminHealth {
  status: "ok" | "degraded";
  services: {
    db: ServiceStatus;
    redis: ServiceStatus;
    optimizer: ServiceStatus;
  };
}
