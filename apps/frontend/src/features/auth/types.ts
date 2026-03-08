export type UserRole = "ADMIN" | "DISPATCHER";

export interface AuthUser {
  id: string;
  name: string | null;
  email: string;
  role: UserRole;
  phone: string | null;
  avatar: string | null;
  lastLogin?: string | null;
}

export interface LoginResponse {
  token: string;
  refreshToken: string;
  user: AuthUser & { expiresIn: number };
}

export interface RefreshResponse {
  token: string;
  refreshToken: string;
}

export interface LogoutResponse {
  message: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RefreshPayload {
  refreshToken: string;
}

export interface PasswordResetPayload {
  email: string;
}

export interface PasswordResetConfirmPayload {
  token: string;
  newPassword: string;
}
