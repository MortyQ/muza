import { defineComponent } from "vue";

import { createRouter, createWebHistory } from "vue-router";

import { progress } from "@muzakit/config";

import modules from "@/app/routes/modules";

import { RouteNames } from "./types/names";
import { authGuard, setRouterForGuards } from "./utils/guards";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL || "/"),
  routes: [
    {
      path: "/",
      name: "Root",
      component: defineComponent({ render: () => null }),
      meta: {
        title: "Home",
        showInMenu: false,
        isRootRedirect: true,
      },
    },
    ...modules,
    {
      path: "/403",
      name: RouteNames.FORBIDDEN,
      component: () => import("@/pages/NotFoundPage.vue"),
      meta: {
        title: "403 Forbidden",
        showInMenu: false,
      },
    },
    {
      path: "/:pathMatch(.*)*",
      name: RouteNames.NOT_FOUND,
      component: () => import("@/pages/NotFoundPage.vue"),
      meta: {
        title: "404 Not Found",
        showInMenu: false,
      },
    },
  ],
});

setRouterForGuards(router);

router.beforeEach(async (to) => {
  progress.start();

  const title = to.meta?.title as string | undefined;
  document.title = title ? `${title} | App` : "App";
  return authGuard(to);
});

router.afterEach(() => {
  progress.done();
});

router.onError(() => {
  progress.done();
});

export { router };
