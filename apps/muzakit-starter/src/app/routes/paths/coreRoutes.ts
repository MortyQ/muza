import { RouteNames } from "@/app/routes/types/names";

export default [
  {
    path: "/home",
    name: RouteNames.HOME,
    component: () => import("@/pages/HomePage.vue"),
    meta: {
      title: "Home",
      showInMenu: true,
      menuTitle: "Home",
      menuOrder: 1,
      permissions: ["read:all-lists"],
    },
  },
  {
    path: "/list",
    name: RouteNames.LIST,
    component: () => import("@/pages/ListPage.vue"),
    meta: {
      title: "List",
      showInMenu: true,
      menuTitle: "List",

    },
  },
];
