import { PermissionGroups, Permissions } from "@/features/auth/config/permissions";
import { useUserStore } from "@/shared/store/useUserStore";

interface UsePermissionsReturn {
  hasPermission: (permission: Permissions) => boolean
  Permissions: typeof Permissions
  PermissionGroups: typeof PermissionGroups
}

export const usePermissions = (): UsePermissionsReturn => {
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
