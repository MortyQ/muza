import { PermissionValues } from "@/features/auth/config/permissions";
import { useUserStore } from "@/shared/store/useUserStore";

enum Permissions {
  CREATE_LIST = "create:list",
  READ_LIST = "read:list",
  UPDATE_LIST = "update:list",
  DELETE_LIST = "delete:list",
  READ_ALL_LISTS = "read:all-lists",
  CREATE_TASK = "create:task",
  READ_TASK = "read:task",
  UPDATE_TASK = "update:task",
  DELETE_TASK = "delete:task",
  READ_ALL_TASKS = "read:all-tasks",
  READ_USERS = "read:users",
  UPDATE_USER = "update:user",
  DELETE_USER = "delete:user",
  MANAGE_ROLES = "manage:roles",
  MANAGE_PERMISSIONS = "manage:permissions",
  READ_DASHBOARD = "read:dashboard",
  READ_ANALYTICS = "read:analytics",
}

const PermissionGroups = {
  LISTS: [
    Permissions.CREATE_LIST, Permissions.READ_LIST,
    Permissions.UPDATE_LIST, Permissions.DELETE_LIST, Permissions.READ_ALL_LISTS,
  ],
  TASKS: [
    Permissions.CREATE_TASK, Permissions.READ_TASK,
    Permissions.UPDATE_TASK, Permissions.DELETE_TASK, Permissions.READ_ALL_TASKS,
  ],
  USERS: [Permissions.READ_USERS, Permissions.UPDATE_USER, Permissions.DELETE_USER],
  ADMIN: [Permissions.MANAGE_ROLES, Permissions.MANAGE_PERMISSIONS],
  ALL_READ: PermissionValues.filter(p => p.startsWith("read:")),
  ALL_CREATE: PermissionValues.filter(p => p.startsWith("create:")),
  ALL_UPDATE: PermissionValues.filter(p => p.startsWith("update:")),
  ALL_DELETE: PermissionValues.filter(p => p.startsWith("delete:")),
  ALL_MANAGE: PermissionValues.filter(p => p.startsWith("manage:")),
} as const;

export const usePermissions = () => {
  const userStore = useUserStore();

  const hasPermission = (permission: Permissions): boolean => {
    return userStore.user?.permissions.includes(permission) ?? false;
  };

  return {
    hasPermission,
    Permissions,
    PermissionGroups,
  };
};
