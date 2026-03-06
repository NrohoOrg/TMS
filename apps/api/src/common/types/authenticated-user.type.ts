import { Role } from '@prisma/client';

export type AuthenticatedUser = {
  id: string;
  name?: string | null;
  email: string;
  role: Role;
  phone?: string | null;
  avatar?: string | null;
  lastLogin?: Date | null;
};
