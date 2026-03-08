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
