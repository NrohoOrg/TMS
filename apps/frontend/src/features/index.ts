/**
 * Domain-specific feature modules barrel export.
 *
 * Each feature module is self-contained with:
 *   components/ - Feature-specific UI
 *   hooks/      - Feature-specific hooks
 *   api/        - Feature-specific API calls
 *   schema/     - Feature-specific Zod schemas
 *   store/      - Feature-specific Zustand stores
 */
export * from "./admin";
export * from "./dispatcher";
export * from "./driver";
export * from "./auth";
export * from "./shared";
