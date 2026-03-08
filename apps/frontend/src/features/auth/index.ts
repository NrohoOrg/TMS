export { default as LoginPage } from "./components/LoginPage";

// Auth hooks
export {
  useLogin,
  useLogout,
  useSessionBootstrap,
  useCurrentUser,
  useRequireAuth,
  useRedirectIfAuthenticated,
  authKeys,
} from "./hooks";

// Auth store
export { useAuthStore, hasPersistentSession } from "./store";

// Auth API
export * as authApi from "./api";

// Auth schemas
export { loginSchema, passwordResetSchema, passwordResetConfirmSchema } from "./schema";
export type { LoginFormValues, PasswordResetFormValues, PasswordResetConfirmFormValues } from "./schema";

// Auth types
export type {
  AuthUser,
  UserRole,
  LoginResponse,
  RefreshResponse,
  LogoutResponse,
  LoginCredentials,
} from "./types";
