import { computed } from "vue";

import { type RouteLocationRaw, type RouteRecordNormalized, useRouter } from "vue-router";

import { buildMenuTree, type SidebarNavItem } from "@muzakit/ui";

import { useAuthStore } from "@/features/auth/store/useAuthStore";

import type { RouteMeta } from "../types/types";
import { hasPermissions } from "../utils/guards";

/**
 * The menu, built from the router. Exported on its own because the root
 * redirect needs the same tree outside a component, where `useRouter()` is not
 * available: `/` lands on the menu's first item, so the two cannot disagree.
 */
export function buildRouteMenu(
  routes: RouteRecordNormalized[],
  canSee: (meta: RouteMeta) => boolean,
): SidebarNavItem[] {
  return buildMenuTree(
    routes
      .filter((route) => {
        const meta = route.meta as RouteMeta;
        return (
          meta.showInMenu !== false
          && meta.requiresAuth !== false
          && !meta.isRootRedirect
          && !route.redirect
          && !route.path.includes("*")
          && !!route.name
          && canSee(meta)
        );
      })
      .map((route) => {
        const meta = route.meta as RouteMeta;
        return {
          item: {
            id: String(route.name),
            label: meta.menuTitle || meta.title || String(route.name),
            icon: meta.menuIcon,
            badge: meta.menuBadge,
            order: meta.menuOrder ?? 999,
            to: { name: String(route.name) },
          } satisfies SidebarNavItem,
          meta,
        };
      }),
  );
}

/** The first item a reader could navigate to, top to bottom as the sidebar shows it. */
export function firstMenuTarget(items: readonly SidebarNavItem[]): RouteLocationRaw | null {
  for (const item of items) {
    if (item.to) return item.to;
    const nested = item.children ? firstMenuTarget(item.children) : null;
    if (nested) return nested;
  }
  return null;
}

export function useMenu() {
  const router = useRouter();
  const authStore = useAuthStore();

  const menuItems = computed<SidebarNavItem[]>(() =>
    buildRouteMenu(router.getRoutes(), meta => hasPermissions(meta.permissions, authStore)),
  );

  return { menuItems };
}
