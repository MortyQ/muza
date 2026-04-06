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

  // ── Reports group ──────────────────────────────────────
  {
    path: "/reports/overview",
    name: RouteNames.REPORTS_OVERVIEW,
    component: () => import("@/pages/HomePage.vue"),
    meta: {
      title: "Reports Overview",
      showInMenu: true,
      menuTitle: "Overview",
      menuIcon: "lucide:layout-dashboard",
      menuOrder: 1,
      menuGroup: "Reports",
      menuGroupIcon: "lucide:file-bar-chart",
      menuGroupOrder: 3,
      permissions: ["read:list"],
    },
  },
  {
    path: "/reports/monthly",
    name: RouteNames.REPORTS_MONTHLY,
    component: () => import("@/pages/HomePage.vue"),
    meta: {
      title: "Monthly Reports",
      showInMenu: true,
      menuTitle: "Monthly",
      menuIcon: "lucide:calendar",
      menuOrder: 2,
      menuGroup: "Reports",
      menuGroupIcon: "lucide:file-bar-chart",
      menuGroupOrder: 3,
      permissions: ["read:list"],
    },
  },
  {
    path: "/reports/custom",
    name: RouteNames.REPORTS_CUSTOM,
    component: () => import("@/pages/HomePage.vue"),
    meta: {
      title: "Custom Reports",
      showInMenu: true,
      menuTitle: "Custom",
      menuIcon: "lucide:sliders-horizontal",
      menuOrder: 3,
      menuGroup: "Reports",
      menuGroupIcon: "lucide:file-bar-chart",
      menuGroupOrder: 3,
      permissions: ["read:list"],
    },
  },

  // ── Settings group ─────────────────────────────────────
  {
    path: "/settings/profile",
    name: RouteNames.SETTINGS_PROFILE,
    component: () => import("@/pages/HomePage.vue"),
    meta: {
      title: "Profile Settings",
      showInMenu: true,
      menuTitle: "Profile",
      menuIcon: "lucide:user",
      menuOrder: 1,
      menuGroup: "Settings",
      menuGroupIcon: "lucide:settings",
      menuGroupOrder: 4,
      permissions: ["read:list"],
    },
  },
  {
    path: "/settings/team",
    name: RouteNames.SETTINGS_TEAM,
    component: () => import("@/pages/HomePage.vue"),
    meta: {
      title: "Team Settings",
      showInMenu: true,
      menuTitle: "Team",
      menuIcon: "lucide:users",
      menuOrder: 2,
      menuGroup: "Settings",
      menuGroupIcon: "lucide:settings",
      menuGroupOrder: 4,
      permissions: ["read:list"],
    },
  },
  {
    path: "/settings/billing",
    name: RouteNames.SETTINGS_BILLING,
    component: () => import("@/pages/HomePage.vue"),
    meta: {
      title: "Billing",
      showInMenu: true,
      menuTitle: "Billing",
      menuIcon: "lucide:credit-card",
      menuOrder: 3,
      menuGroup: "Settings",
      menuGroupIcon: "lucide:settings",
      menuGroupOrder: 4,
      permissions: ["read:list"],
    },
  },

  // ── Reports/Quarterly sub-group (level 3) ─────────────
  {
    path: "/reports/quarterly/q1",
    name: RouteNames.REPORTS_QUARTERLY_Q1,
    component: () => import("@/pages/HomePage.vue"),
    meta: {
      title: "Q1 2026",
      showInMenu: true,
      menuTitle: "Q1 2026",
      menuIcon: "lucide:trending-up",
      menuOrder: 1,
      menuGroup: "Reports/Quarterly",
      menuGroupIcon: "lucide:file-bar-chart",
      menuGroupOrder: 3,
      menuGroupMeta: {
        Quarterly: { icon: "lucide:calendar-days", order: 4 },
      },
      permissions: ["read:list"],
    },
  },
  {
    path: "/reports/quarterly/q2",
    name: RouteNames.REPORTS_QUARTERLY_Q2,
    component: () => import("@/pages/HomePage.vue"),
    meta: {
      title: "Q2 2026",
      showInMenu: true,
      menuTitle: "Q2 2026",
      menuIcon: "lucide:trending-up",
      menuOrder: 2,
      menuGroup: "Reports/Quarterly",
      menuGroupIcon: "lucide:file-bar-chart",
      menuGroupOrder: 3,
      menuGroupMeta: {
        Quarterly: { icon: "lucide:calendar-days", order: 4 },
      },
      permissions: ["read:list"],
    },
  },

  // ── Settings/Account sub-group (level 3) ───────────────
  {
    path: "/settings/account/security",
    name: RouteNames.SETTINGS_ACCOUNT_SECURITY,
    component: () => import("@/pages/HomePage.vue"),
    meta: {
      title: "Security",
      showInMenu: true,
      menuTitle: "Security",
      menuIcon: "lucide:shield",
      menuOrder: 1,
      menuGroup: "Settings/Account",
      menuGroupIcon: "lucide:settings",
      menuGroupOrder: 4,
      menuGroupMeta: {
        Account: { icon: "lucide:circle-user", order: 4 },
      },
      permissions: ["read:list"],
    },
  },
  {
    path: "/settings/account/notifications",
    name: RouteNames.SETTINGS_ACCOUNT_NOTIFICATIONS,
    component: () => import("@/pages/HomePage.vue"),
    meta: {
      title: "Notifications",
      showInMenu: true,
      menuTitle: "Notifications",
      menuIcon: "lucide:bell",
      menuOrder: 2,
      menuGroup: "Settings/Account",
      menuGroupIcon: "lucide:settings",
      menuGroupOrder: 4,
      menuGroupMeta: {
        Account: { icon: "lucide:circle-user", order: 4 },
      },
      permissions: ["read:list"],
    },
  },

  // ── Root level ─────────────────────────────────────────
  {
    path: "/integrations",
    name: RouteNames.INTEGRATIONS,
    component: () => import("@/pages/HomePage.vue"),
    meta: {
      title: "Integrations",
      showInMenu: true,
      menuTitle: "Integrations",
      menuIcon: "lucide:plug",
      menuOrder: 5,
      permissions: ["read:list"],
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
