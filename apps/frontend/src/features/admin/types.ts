// ── ADMIN USERS ─────────────────────────────────────────────────────────

export type UserRole = "ADMIN" | "DISPATCHER";

export interface ApiUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone: string | null;
  lastLogin: string | null;
  createdAt: string;
}

export interface CreateUserPayload {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

export type UpdateUserPayload = Partial<Omit<CreateUserPayload, "password">>;

// ── ADMIN CONFIG ────────────────────────────────────────────────────────

export interface AdminConfig {
  id: number;
  maxSolveSeconds: number;
  speedKmh: number;
  objectiveWeights: {
    urgent: number;
    high: number;
    normal: number;
    low: number;
  };
  updatedAt: string;
}

export type UpdateConfigPayload = Partial<
  Omit<AdminConfig, "id" | "updatedAt">
>;

// ── ADMIN HEALTH ────────────────────────────────────────────────────────

export interface AdminHealthStatus {
  status: "ok" | "degraded";
  database: {
    status: "ok" | "error";
    message: string;
  };
  redis: {
    status: "ok" | "error";
    message: string;
  };
  optimizer: {
    status: "ok" | "error";
    message: string;
  };
}
