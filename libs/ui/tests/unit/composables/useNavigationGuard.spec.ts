import { defineComponent, ref } from "vue";

import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { createMemoryHistory, createRouter, type Router } from "vue-router";

import { useNavigationGuard } from "../../../src/composables/useNavigationGuard";

/**
 * `onBeforeRouteLeave` is a no-op unless the component is rendered inside a
 * `<router-view>`, so every case here mounts a real router and a real view.
 */
async function setup(when = ref(true)) {
  let api!: ReturnType<typeof useNavigationGuard>;

  const Guarded = defineComponent({
    setup() {
      api = useNavigationGuard({ when: () => when.value });
      return () => "guarded";
    },
  });

  const Plain = defineComponent({ setup: () => () => "plain" });

  const router: Router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/", name: "guarded", component: Guarded },
      { path: "/away", name: "away", component: Plain },
      { path: "/skip", name: "skip", component: Plain, meta: { skipNavigationGuard: true } },
    ],
  });

  await router.push("/");
  await router.isReady();

  const wrapper = mount(defineComponent({
    template: "<RouterView />",
  }), { global: { plugins: [router] } });
  await flushPromises();

  return { api, router, wrapper, when };
}

describe("useNavigationGuard", () => {
  it("starts idle", async () => {
    const { api } = await setup();
    expect(api.isPending.value).toBe(false);
    expect(api.pendingTo.value).toBeNull();
    expect(api.isEnabled.value).toBe(true);
  });

  it("blocks a navigation and holds on to the target", async () => {
    const { api, router } = await setup();
    router.push("/away");
    await flushPromises();

    expect(api.isPending.value).toBe(true);
    expect(api.pendingTo.value?.path).toBe("/away");
    expect(router.currentRoute.value.path).toBe("/");
  });

  it("lets navigation through when the condition is false", async () => {
    const { router } = await setup(ref(false));
    router.push("/away");
    await flushPromises();
    expect(router.currentRoute.value.path).toBe("/away");
  });

  it("honours a route that opts out through meta", async () => {
    const { api, router } = await setup();
    router.push("/skip");
    await flushPromises();

    expect(api.isPending.value).toBe(false);
    expect(router.currentRoute.value.path).toBe("/skip");
  });

  describe("confirm", () => {
    it("completes the navigation it was holding", async () => {
      const { api, router } = await setup();
      router.push("/away");
      await flushPromises();

      api.confirm();
      await flushPromises();

      expect(router.currentRoute.value.path).toBe("/away");
      expect(api.isPending.value).toBe(false);
      expect(api.pendingTo.value).toBeNull();
    });

    it("re-enables itself afterwards, rather than staying off", async () => {
      // It disables itself first so the guard cannot intercept its own push;
      // forgetting to switch it back would silently unguard the whole page.
      const { api, router } = await setup();
      router.push("/away");
      await flushPromises();

      api.confirm();
      await flushPromises();

      expect(api.isEnabled.value).toBe(true);
    });

    it("does nothing when there is nothing pending", async () => {
      const { api, router } = await setup();
      api.confirm();
      await flushPromises();
      expect(router.currentRoute.value.path).toBe("/");
    });
  });

  describe("cancel", () => {
    it("drops the pending navigation and stays put", async () => {
      const { api, router } = await setup();
      router.push("/away");
      await flushPromises();

      api.cancel();
      expect(api.isPending.value).toBe(false);
      expect(api.pendingTo.value).toBeNull();
      expect(router.currentRoute.value.path).toBe("/");
    });

    it("leaves the guard armed for the next attempt", async () => {
      const { api, router } = await setup();
      router.push("/away");
      await flushPromises();
      api.cancel();

      router.push("/away");
      await flushPromises();
      expect(api.isPending.value).toBe(true);
    });
  });

  describe("enable and disable", () => {
    it("disable lets navigation through", async () => {
      const { api, router } = await setup();
      api.disable();

      router.push("/away");
      await flushPromises();
      expect(router.currentRoute.value.path).toBe("/away");
    });

    it("enable arms it again", async () => {
      const { api, router } = await setup();
      api.disable();
      api.enable();

      router.push("/away");
      await flushPromises();
      expect(api.isPending.value).toBe(true);
    });
  });

  it("closes the prompt if the condition stops holding while it is open", async () => {
    // Otherwise a form that auto-saves mid-prompt leaves a dialog on screen
    // asking about changes that no longer exist.
    const when = ref(true);
    const { api, router } = await setup(when);
    router.push("/away");
    await flushPromises();
    expect(api.isPending.value).toBe(true);

    when.value = false;
    await flushPromises();
    expect(api.isPending.value).toBe(false);
  });

  it("closes the prompt when the guard is disabled while it is open", async () => {
    const { api, router } = await setup();
    router.push("/away");
    await flushPromises();

    api.disable();
    await flushPromises();
    expect(api.isPending.value).toBe(false);
  });
});
