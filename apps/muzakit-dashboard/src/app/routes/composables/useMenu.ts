import { computed } from "vue";

import { useRouter } from "vue-router";

import { useAuthStore } from "@/features/auth/store/useAuthStore";

import { type RouteMeta, type MenuItem } from "../types/types";
import { hasPermissions } from "../utils/guards";

export function useMenu() {
  const router = useRouter();
  const authStore = useAuthStore();

  const menuItems = computed<MenuItem[]>(() => {
    const routes = router.getRoutes();

    return routes
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
          id: String(route.name),
          label: meta.menuTitle || meta.title || String(route.name),
          icon: meta.menuIcon,
          badge: meta.menuBadge,
          order: meta.menuOrder ?? 999,
          to: { name: String(route.name) },
          disabled: false,
        };
      })
      .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
  });

  return { menuItems };
}
