import { tokenManager } from "@ametie/vue-muza-use";
import type {
  RouteLocationNormalized,
  RouteLocationRaw,
  RouteRecordNormalized,
  Router,
} from "vue-router";

import type { PermissionType } from "@/features/auth/config/permissions";
import { useAuthStore } from "@/features/auth/store/useAuthStore";
import { UserRole } from "@/features/auth/types";

import type { RouteMeta } from "../types/types";

let routerInstance: Router | null = null;

export function setRouterForGuards(router: Router): void {
  routerInstance = router;
}

// ─── Permission Helpers ───────────────────────────────────────────────────────

export function hasPermissions(
  required: readonly string[] | string[] | undefined,
  authStore?: ReturnType<typeof useAuthStore>,
): boolean {
  const store = authStore ?? useAuthStore();
  if (!required || required.length === 0) return true;
  if (!store.isAuthenticated || !store.user) return false;
  if (store.user.role === UserRole.ADMIN || store.user.isAdmin) return true;
  const userPermissions = store.user.permissions ?? [];
  return required.every(p => userPermissions.includes(p as PermissionType));
}

export function hasAnyPermission(
  required: readonly string[] | string[] | undefined,
  authStore?: ReturnType<typeof useAuthStore>,
): boolean {
  const store = authStore ?? useAuthStore();
  if (!required || required.length === 0) return true;
  if (!store.isAuthenticated || !store.user) return false;
  if (store.user.role === UserRole.ADMIN || store.user.isAdmin) return true;
  const userPermissions = store.user.permissions ?? [];
  return required.some(p => userPermissions.includes(p as PermissionType));
}

// ─── URL Validation ───────────────────────────────────────────────────────────

function isValidRedirectUrl(url: string): boolean {
  if (!url || typeof url !== "string") return false;
  if (!url.startsWith("/") || url.startsWith("//")) return false;
  return !url.toLowerCase().includes("javascript:");
}

function sanitizeRedirectUrl(url: unknown): string {
  const urlString = String(url ?? "/");
  return isValidRedirectUrl(urlString) ? urlString : "/";
}

// ─── Auth Initialization ──────────────────────────────────────────────────────

async function ensureAuthInitialized(
  authStore: ReturnType<typeof useAuthStore>,
): Promise<boolean> {
  if (authStore.isAuthenticated) return true;

  const accessToken = tokenManager.getAccessToken();
  const refreshToken = tokenManager.getRefreshToken();
  if (!accessToken && !refreshToken) return false;

  try {
    await authStore.initialize();
    return authStore.isAuthenticated;
  }
  catch (_error) {
    tokenManager.clearTokens();
    return false;
  }
}

// ─── Smart Route Finder ───────────────────────────────────────────────────────

function findFirstAccessibleRoute(
  routes: RouteRecordNormalized[],
): RouteLocationRaw | null {
  const candidates = [];

  for (const route of routes) {
    const meta = route.meta as RouteMeta;
    const skipped
      = meta.requiresAuth === false
        || !route.name
        || meta.showInMenu === false
        || meta.isRootRedirect
        || !!route.redirect
        || route.path.includes("*");

    if (skipped) continue;

    if (hasPermissions(meta.permissions)) {
      candidates.push({ route, meta });
    }
  }

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => (a.meta.menuOrder ?? 999) - (b.meta.menuOrder ?? 999));
  return { name: candidates[0].route.name as string };
}

// ─── Main Auth Guard ──────────────────────────────────────────────────────────

export async function authGuard(
  to: RouteLocationNormalized,
): Promise<RouteLocationRaw | boolean | void> {
  const meta = to.meta as RouteMeta;
  const authStore = useAuthStore();
  const requiresAuth = meta.requiresAuth !== false;

  await ensureAuthInitialized(authStore);

  if (!requiresAuth) return true;

  if (!authStore.isAuthenticated) {
    const loginPath = meta.authRedirect || "/auth";
    if (to.path === loginPath) return true;
    return { path: loginPath, replace: true };
  }

  if (meta.isRootRedirect && routerInstance) {
    const firstAccessible = findFirstAccessibleRoute(routerInstance.getRoutes());
    if (firstAccessible) return Object.assign({}, firstAccessible, { replace: true });
    return { path: "/403", replace: true };
  }

  if (!hasPermissions(meta.permissions)) {
    return { path: "/403", replace: true };
  }

  return true;
}

// ─── Guest Guard ──────────────────────────────────────────────────────────────

export async function guestGuard(
  to: RouteLocationNormalized,
): Promise<RouteLocationRaw | boolean | void> {
  const authStore = useAuthStore();
  await ensureAuthInitialized(authStore);

  if (authStore.isAuthenticated) {
    const redirectTo = sanitizeRedirectUrl(to.query.redirect);
    return { path: redirectTo, replace: true };
  }

  return true;
}
