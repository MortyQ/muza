import { RouteNames } from "@/app/routes/types/names";

// Placeholder routes that exist to exercise the sidebar's nesting: "Reports"
// and "Settings" each go two levels deep and carry a third-level group. They
// all render the same stub page.
const MockPage = () => import("@/pages/MockPage.vue");

const REPORTS = {
  menuGroupIcon: "lucide:file-bar-chart",
  menuGroupOrder: 3,
  menuGroupMeta: { Quarterly: { icon: "lucide:calendar-range", order: 4 } },
};

const SETTINGS = {
  menuGroupIcon: "lucide:settings",
  menuGroupOrder: 7,
  menuGroupMeta: { Account: { icon: "lucide:circle-user", order: 4 } },
};

export default [
  // ── Reports (level 2) ──────────────────────────────────
  {
    path: "/reports/overview",
    name: RouteNames.REPORTS_OVERVIEW,
    component: MockPage,
    meta: {
      title: "Reports Overview",
      showInMenu: true,
      menuTitle: "Overview",
      menuIcon: "lucide:layout-dashboard",
      menuOrder: 1,
      menuGroup: "Reports",
      ...REPORTS,
      permissions: ["read:list"],
    },
  },
  {
    path: "/reports/monthly",
    name: RouteNames.REPORTS_MONTHLY,
    component: MockPage,
    meta: {
      title: "Monthly Reports",
      showInMenu: true,
      menuTitle: "Monthly",
      menuIcon: "lucide:calendar",
      menuBadge: "New",
      menuOrder: 2,
      menuGroup: "Reports",
      ...REPORTS,
      permissions: ["read:list"],
    },
  },
  {
    path: "/reports/custom",
    name: RouteNames.REPORTS_CUSTOM,
    component: MockPage,
    meta: {
      title: "Custom Reports",
      showInMenu: true,
      menuTitle: "Custom",
      menuIcon: "lucide:sliders-horizontal",
      menuOrder: 3,
      menuGroup: "Reports",
      ...REPORTS,
      permissions: ["read:list"],
    },
  },

  // ── Reports / Quarterly (level 3) ──────────────────────
  {
    path: "/reports/quarterly/q1",
    name: RouteNames.REPORTS_QUARTERLY_Q1,
    component: MockPage,
    meta: {
      title: "Q1 2026",
      showInMenu: true,
      menuTitle: "Q1 2026",
      menuOrder: 1,
      menuGroup: "Reports/Quarterly",
      ...REPORTS,
      permissions: ["read:list"],
    },
  },
  {
    path: "/reports/quarterly/q2",
    name: RouteNames.REPORTS_QUARTERLY_Q2,
    component: MockPage,
    meta: {
      title: "Q2 2026",
      showInMenu: true,
      menuTitle: "Q2 2026",
      menuOrder: 2,
      menuGroup: "Reports/Quarterly",
      ...REPORTS,
      permissions: ["read:list"],
    },
  },

  // ── Settings (level 2) ─────────────────────────────────
  {
    path: "/settings/profile",
    name: RouteNames.SETTINGS_PROFILE,
    component: MockPage,
    meta: {
      title: "Profile Settings",
      showInMenu: true,
      menuTitle: "Profile",
      menuIcon: "lucide:user",
      menuOrder: 1,
      menuGroup: "Settings",
      ...SETTINGS,
      permissions: ["read:list"],
    },
  },
  {
    path: "/settings/team",
    name: RouteNames.SETTINGS_TEAM,
    component: MockPage,
    meta: {
      title: "Team Settings",
      showInMenu: true,
      menuTitle: "Team",
      menuIcon: "lucide:users",
      menuBadge: "12",
      menuOrder: 2,
      menuGroup: "Settings",
      ...SETTINGS,
      permissions: ["read:list"],
    },
  },
  {
    path: "/settings/billing",
    name: RouteNames.SETTINGS_BILLING,
    component: MockPage,
    meta: {
      title: "Billing",
      showInMenu: true,
      menuTitle: "Billing",
      menuIcon: "lucide:credit-card",
      menuOrder: 3,
      menuGroup: "Settings",
      ...SETTINGS,
      permissions: ["read:list"],
    },
  },

  // ── Settings / Account (level 3) ───────────────────────
  {
    path: "/settings/account/security",
    name: RouteNames.SETTINGS_ACCOUNT_SECURITY,
    component: MockPage,
    meta: {
      title: "Security",
      showInMenu: true,
      menuTitle: "Security",
      menuOrder: 1,
      menuGroup: "Settings/Account",
      ...SETTINGS,
      permissions: ["read:list"],
    },
  },
  {
    path: "/settings/account/notifications",
    name: RouteNames.SETTINGS_ACCOUNT_NOTIFICATIONS,
    component: MockPage,
    meta: {
      title: "Notifications",
      showInMenu: true,
      menuTitle: "Notifications",
      menuOrder: 2,
      menuGroup: "Settings/Account",
      ...SETTINGS,
      permissions: ["read:list"],
    },
  },
];
