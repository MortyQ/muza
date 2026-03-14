import { createRouter, createWebHistory, type RouteRecordRaw } from "vue-router";

const routes: RouteRecordRaw[] = [
  {
    path: "/",
    name: "home",
    component: () => import("@/pages/HomePage.vue"),
  },
  {
    path: "/auth",
    name: "auth",
    component: () => import("@/pages/AuthPage.vue"),
  },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});
