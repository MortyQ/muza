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
      menuIcon: "lucide:home",
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
      menuIcon: "lucide:bar-chart-2",
      showInMenu: true,
      menuTitle: "Analytics",
      menuOrder: 2,
      permissions: ["read:analytics"],
    },
  },

  {
    path: "/table-demo",
    name: RouteNames.TABLE_DEMO,
    component: () => import("@/pages/TableDemoPage.vue"),
    meta: {
      title: "Table Demo",
      showInMenu: true,
      menuTitle: "Table Demo",
      menuIcon: "lucide:table",
      menuOrder: 6,
      permissions: ["read:list"],
    },
  },
];
