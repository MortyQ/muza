import { RouteNames } from "@/app/routes/types/names";
import type { ExtendedFilterKey } from "@/shared/config/global-filter/filterRegistry";

export default [
  {
    path: "/home",
    name: RouteNames.HOME,
    component: () => import("@/pages/HomePage.vue"),
    meta: {
      title: "Dashboard",
      showInMenu: true,
      menuTitle: "Home",
      menuOrder: 1,
      permissions: ["read:list"],
      filters: {
        show: ["dateRange", "granularity"] as ExtendedFilterKey[],
      },
    },
  },
  {
    path: "/analytics",
    name: RouteNames.ANALYTICS,
    component: () => import("@/pages/AnalyticsPage.vue"),
    meta: {
      title: "Analytics",
      showInMenu: true,
      menuTitle: "Analytics",
      permissions: ["read:analytics"],
    },
  },
];
