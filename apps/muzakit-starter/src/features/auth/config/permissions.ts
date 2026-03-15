export enum Permissions {
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

export type PermissionType = `${Permissions}`;
export const PermissionValues = Object.values(Permissions) as PermissionType[];

export const PermissionGroups = {
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

export const PermissionToRoute: Record<Permissions, string> = {
  [Permissions.CREATE_LIST]: "/lists/create",
  [Permissions.READ_LIST]: "/lists",
  [Permissions.UPDATE_LIST]: "/lists",
  [Permissions.DELETE_LIST]: "/lists",
  [Permissions.READ_ALL_LISTS]: "/lists",
  [Permissions.CREATE_TASK]: "/tasks/create",
  [Permissions.READ_TASK]: "/tasks",
  [Permissions.UPDATE_TASK]: "/tasks",
  [Permissions.DELETE_TASK]: "/tasks",
  [Permissions.READ_ALL_TASKS]: "/tasks",
  [Permissions.READ_USERS]: "/users",
  [Permissions.UPDATE_USER]: "/users",
  [Permissions.DELETE_USER]: "/users",
  [Permissions.MANAGE_ROLES]: "/admin/roles",
  [Permissions.MANAGE_PERMISSIONS]: "/admin/permissions",
  [Permissions.READ_DASHBOARD]: "/dashboard",
  [Permissions.READ_ANALYTICS]: "/analytics",
};

export function getPermissionDisplayName(permission: Permissions): string {
  const names: Record<Permissions, string> = {
    [Permissions.CREATE_LIST]: "Create List",
    [Permissions.READ_LIST]: "Read List",
    [Permissions.UPDATE_LIST]: "Update List",
    [Permissions.DELETE_LIST]: "Delete List",
    [Permissions.READ_ALL_LISTS]: "Read All Lists",
    [Permissions.CREATE_TASK]: "Create Task",
    [Permissions.READ_TASK]: "Read Task",
    [Permissions.UPDATE_TASK]: "Update Task",
    [Permissions.DELETE_TASK]: "Delete Task",
    [Permissions.READ_ALL_TASKS]: "Read All Tasks",
    [Permissions.READ_USERS]: "Read Users",
    [Permissions.UPDATE_USER]: "Update User",
    [Permissions.DELETE_USER]: "Delete User",
    [Permissions.MANAGE_ROLES]: "Manage Roles",
    [Permissions.MANAGE_PERMISSIONS]: "Manage Permissions",
    [Permissions.READ_DASHBOARD]: "Read Dashboard",
    [Permissions.READ_ANALYTICS]: "Read Analytics",
  };
  return names[permission] || permission;
}
