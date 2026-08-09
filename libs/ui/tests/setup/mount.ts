import { defineComponent, type Component } from "vue";

import { mount, type MountingOptions, type VueWrapper } from "@vue/test-utils";
import { createMemoryHistory, createRouter, type Router } from "vue-router";

/**
 * A router for components that render `RouterLink` (VButton's `to` branch,
 * NavigationGuardModal). A stub would assert nothing about the resolved href,
 * and vue-router works standalone with memory history.
 */
export function createTestRouter(): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/", name: "home", component: defineComponent({ template: "<div />" }) },
      { path: "/target", name: "target", component: defineComponent({ template: "<div />" }) },
      { path: "/:pathMatch(.*)*", name: "not-found", component: defineComponent({ template: "<div />" }) },
    ],
  });
}

/** `mount` with a real router already installed and awaited. */
export async function mountWithRouter<C extends Component>(
  component: C,
  options: MountingOptions<Record<string, unknown>> = {},
): Promise<VueWrapper> {
  const router = createTestRouter();
  await router.push("/");
  await router.isReady();

  return mount(component, {
    ...options,
    global: {
      ...options.global,
      plugins: [...(options.global?.plugins ?? []), router],
    },
  }) as VueWrapper;
}
