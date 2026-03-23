import { computed } from "vue";

import { useRouter } from "vue-router";

import { buildMenuTree, type SidebarNavItem } from "@muzakit/ui";

import { useAuthStore } from "@/features/auth/store/useAuthStore";

import type { RouteMeta } from "../types/types";
import { hasPermissions } from "../utils/guards";

export function useMenu() {
  const router = useRouter();
  const authStore = useAuthStore();

  const menuItems = computed<SidebarNavItem[]>(() =>
    buildMenuTree(
      router
        .getRoutes()
        .filter((route) => {
          const meta = route.meta as RouteMeta;
          return (
            meta.showInMenu !== false
            && meta.requiresAuth !== false
            && !meta.isRootRedirect
            && !route.redirect
            && !route.path.includes("*")
            && route.name
            && hasPermissions(meta.permissions, authStore)
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
    ),
  );

  return { menuItems };
}
