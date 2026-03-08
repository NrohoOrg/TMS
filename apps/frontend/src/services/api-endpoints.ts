/**
 * Centralised API endpoint registry.
 * All backend paths live here so nothing is hard-coded in feature code.
 */

export const API_ENDPOINTS = {
  // ── Auth ──────────────────────────────────────────────────
  AUTH: {
    LOGIN: "/auth/login",
    REFRESH: "/auth/refresh",
    LOGOUT: "/auth/logout",
    ME: "/auth/me",
    PASSWORD_RESET: "/auth/password-reset",
    PASSWORD_RESET_CONFIRM: "/auth/password-reset/confirm",
  },

  // ── Tasks ─────────────────────────────────────────────────
  TASKS: {
    LIST: "/dispatcher/tasks",
    DETAIL: (id: string) => `/dispatcher/tasks/${id}`,
    CREATE: "/dispatcher/tasks",
    UPDATE: (id: string) => `/dispatcher/tasks/${id}`,
    DELETE: (id: string) => `/dispatcher/tasks/${id}`,
    IMPORT: "/dispatcher/tasks/import",
  },

  // ── Drivers ───────────────────────────────────────────────
  DRIVERS: {
    LIST: "/dispatcher/drivers",
    CREATE: "/dispatcher/drivers",
    UPDATE: (id: string) => `/dispatcher/drivers/${id}`,
    DELETE: (id: string) => `/dispatcher/drivers/${id}`,
  },

  // ── Availability ──────────────────────────────────────────
  AVAILABILITY: {
    LIST: "/dispatcher/availability",
    UPDATE: (driverId: string) => `/dispatcher/availability/${driverId}`,
  },

  // ── Planning / Optimization ───────────────────────────────
  PLANNING: {
    OPTIMIZE: "/dispatcher/planning/optimize",
    STATUS: (jobId: string) => `/dispatcher/planning/status/${jobId}`,
    PLANS: "/dispatcher/planning/plans",
    PLAN_DETAIL: (planId: string) => `/dispatcher/planning/plans/${planId}`,
    PUBLISH: (planId: string) =>
      `/dispatcher/planning/plans/${planId}/publish`,
  },

  // ── Geocoding ─────────────────────────────────────────────
  GEOCODE: {
    SEARCH: "/geocode/search",
  },
} as const;
