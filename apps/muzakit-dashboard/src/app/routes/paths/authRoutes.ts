import { RouteNames } from "@/app/routes/types/names";
import { guestGuard } from "@/app/routes/utils/guards";

export default [
  {
    path: "/auth",
    name: RouteNames.AUTH,
    component: () => import("@/pages/AuthPage.vue"),
    meta: {
      title: "Login",
      layout: "auth",
      requiresAuth: false,
      showInMenu: false,
    },
    beforeEnter: guestGuard,
  },
];
