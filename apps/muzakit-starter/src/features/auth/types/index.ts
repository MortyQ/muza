import type { PermissionType } from "@/features/auth/config/permissions";

export const UserRole = {
  ADMIN: "admin",
  USER: "user",
  MODERATOR: "moderator",
} as const;

export type UserRoleType = typeof UserRole[keyof typeof UserRole];

export interface User {
  _id: string
  id?: string
  email: string
  name: string
  avatar?: string
  isAdmin: boolean
  role: UserRoleType
  permissions: PermissionType[]
  refreshTokenExpiresAt?: string
  createdAt: string
  updatedAt: string
}
