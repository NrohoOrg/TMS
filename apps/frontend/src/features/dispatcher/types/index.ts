// ── API response types ──────────────────────────────────────────────────

/** Task status values from the backend Prisma schema */
export type ApiTaskStatus = "pending" | "assigned" | "cancelled";

/** Priority values shared between frontend and backend */
export type ApiTaskPriority = "low" | "normal" | "high" | "urgent";

/** Full Task object returned by the API */
export interface ApiTask {
  id: string;
  title: string;
  pickupAddress: string;
  pickupLat: number;
  pickupLng: number;
  pickupWindowStart: string; // ISO date string
  pickupWindowEnd: string;   // ISO date string
  pickupServiceMinutes: number;
  dropoffAddress: string;
  dropoffLat: number;
  dropoffLng: number;
  dropoffDeadline: string;   // ISO date string
  dropoffServiceMinutes: number;
  priority: ApiTaskPriority;
  status: ApiTaskStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Paginated tasks list response */
export interface ApiTaskListResult {
  items: ApiTask[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ── Request param types ─────────────────────────────────────────────────

export interface ListTasksParams {
  page?: number;
  limit?: number;
  status?: ApiTaskStatus;
  dateFrom?: string; // YYYY-MM-DD
  dateTo?: string;   // YYYY-MM-DD
  search?: string;
}

export interface CreateTaskPayload {
  title: string;
  pickupAddress: string;
  pickupLat: number;
  pickupLng: number;
  pickupWindowStart: string; // ISO date string
  pickupWindowEnd: string;   // ISO date string
  pickupServiceMinutes?: number;
  dropoffAddress: string;
  dropoffLat: number;
  dropoffLng: number;
  dropoffDeadline: string;   // ISO date string
  dropoffServiceMinutes?: number;
  priority?: ApiTaskPriority;
  notes?: string;
}

export interface ImportTasksResult {
  imported: number;
  failed: number;
  errors: Array<{ row: number; reason: string }>;
}

// ── DRIVERS ─────────────────────────────────────────────────────────────

export interface ApiDriver {
  id: string;
  name: string;
  phone: string;
  shiftStart: string;        // HH:MM format
  shiftEnd: string;          // HH:MM format
  depotLat: number;
  depotLng: number;
  capacityUnits: number | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDriverPayload {
  name: string;
  phone: string;
  shiftStart: string;        // HH:MM format
  shiftEnd: string;          // HH:MM format
  depotLat: number;
  depotLng: number;
  capacityUnits?: number;
}

export type UpdateDriverPayload = Partial<CreateDriverPayload>;

// ── AVAILABILITY ────────────────────────────────────────────────────────

export interface ApiAvailability {
  id: string;
  driverId: string;
  date: string;              // ISO date string (stored as UTC midnight)
  available: boolean;
  shiftStartOverride: string | null;  // HH:MM format or null
  shiftEndOverride: string | null;    // HH:MM format or null
}

export interface ListAvailabilityParams {
  date?: string;             // YYYY-MM-DD, defaults to today
}

export interface UpsertAvailabilityPayload {
  date: string;              // YYYY-MM-DD
  available: boolean;
  shiftStartOverride?: string;  // HH:MM
  shiftEndOverride?: string;    // HH:MM
}

// ── PLANNING / OPTIMIZATION ────────────────────────────────────────────

export type JobStatus = "queued" | "running" | "completed" | "failed";
export type PlanStatus = "draft" | "published";
export type StopType = "pickup" | "dropoff";
export type StopStatus = "pending" | "arrived" | "done" | "skipped";

export interface ApiOptimizationJob {
  jobId: string;
  status: JobStatus;
  progressPercent: number;
  startedAt: string | null;
  finishedAt: string | null;
  planId: string | null;
  error: string | null;
}

export interface StartOptimizationPayload {
  date: string;              // YYYY-MM-DD
  returnToDepot?: boolean;
}

export interface ApiPlan {
  planId: string;
  date: string;              // ISO date string
  status: PlanStatus;
  publishedAt: string | null;
  createdAt: string;
  createdBy: {
    id: string;
    email: string;
  };
  routes: ApiRoute[];
  unassignedTasks?: ApiTask[];
}

export interface ApiRoute {
  id: string;
  planId: string;
  driverId: string;
  driver?: {
    id: string;
    name: string;
  };
  totalDistanceM: number;
  totalTimeS: number;
  stops: ApiStop[];
}

export interface ApiStop {
  id: string;
  routeId: string;
  taskId: string;
  task?: ApiTask;
  sequence: number;
  type: StopType;
  etaS: number;              // ETA in seconds from route start
  departureS: number;        // Actual departure in seconds
  actualArrivalS: number | null;
  completedAt: string | null;
  notes: string | null;
  status: StopStatus;
}

export interface UpdateStopStatusPayload {
  status: "arrived" | "done" | "skipped";
  notes?: string;
  actualArrivalTime?: string;  // HH:MM format
}

// ── GEOCODING ───────────────────────────────────────────────────────────

export interface GeocodeSearchParams {
  q: string;                 // required — search query
  limit?: number;            // optional, 1-10, default 5
}

export interface GeocodeResult {
  lat: number;
  lng: number;
  displayName: string;
  address?: {
    city?: string;
    country?: string;
    postcode?: string;
  };
}

