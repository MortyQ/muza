import { defineComponent, ref } from "vue";

import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { createMemoryHistory, createRouter, type Router } from "vue-router";

import NavigationGuardModal from "../../../src/components/overlay/NavigationGuardModal.vue";

const stubs = { Icon: true };

/**
 * The guard hangs off `onBeforeRouteLeave`, which only runs for a component
 * rendered inside a `<router-view>` — so the modal has to be mounted inside a
 * real route, with a real router.
 */
async function guarded(props: Record<string, unknown> = {}) {
  const when = ref(true);

  const Editor = defineComponent({
    components: { NavigationGuardModal },
    setup: () => ({ when, extra: props }),
    template: "<div><NavigationGuardModal :when v-bind=\"extra\" /></div>",
  });

  const router: Router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/", component: Editor },
      { path: "/away", component: defineComponent({ template: "<div>away</div>" }) },
    ],
  });

  await router.push("/");
  await router.isReady();

  const w = mount(defineComponent({ template: "<RouterView />" }), {
    global: { plugins: [router], stubs },
  });
  await flushPromises();

  return { w, router, when };
}

const dialog = (w: Awaited<ReturnType<typeof guarded>>["w"]) => w.find(".v-nav-guard__backdrop");

describe("NavigationGuardModal", () => {
  it("stays out of the way until navigation is attempted", async () => {
    const { w } = await guarded();
    expect(dialog(w).exists()).toBe(false);
  });

  it("appears when a guarded navigation is blocked", async () => {
    const { w, router } = await guarded();
    router.push("/away");
    await flushPromises();
    expect(dialog(w).exists()).toBe(true);
  });

  it("does not appear when the condition is false", async () => {
    const { w, router, when } = await guarded();
    when.value = false;
    await flushPromises();

    router.push("/away");
    await flushPromises();
    expect(dialog(w).exists()).toBe(false);
    expect(router.currentRoute.value.path).toBe("/away");
  });

  describe("content", () => {
    it("uses its default copy", async () => {
      const { w, router } = await guarded();
      router.push("/away");
      await flushPromises();

      expect(w.text()).toContain("Unsaved changes");
      expect(w.text()).toContain("Keep editing");
      expect(w.text()).toContain("Discard & leave");
    });

    it("takes overrides", async () => {
      const { w, router } = await guarded({
        title: "Hold on",
        description: "The draft is not saved.",
        confirmLabel: "Stay",
        leaveLabel: "Leave anyway",
      });
      router.push("/away");
      await flushPromises();

      expect(w.text()).toContain("Hold on");
      expect(w.text()).toContain("The draft is not saved.");
      expect(w.text()).toContain("Stay");
      expect(w.text()).toContain("Leave anyway");
    });
  });

  describe("accessibility", () => {
    it("announces itself as a modal dialog labelled by its title", async () => {
      const { w, router } = await guarded({ title: "Hold on" });
      router.push("/away");
      await flushPromises();

      expect(dialog(w).attributes("role")).toBe("dialog");
      expect(dialog(w).attributes("aria-modal")).toBe("true");
      expect(dialog(w).attributes("aria-label")).toBe("Hold on");
    });

    it("is focusable, so focus can be moved into it", async () => {
      const { w, router } = await guarded();
      router.push("/away");
      await flushPromises();
      expect(dialog(w).attributes("tabindex")).toBe("-1");
    });
  });

  describe("resolving", () => {
    it("cancels on Escape and stays put", async () => {
      const { w, router } = await guarded();
      router.push("/away");
      await flushPromises();

      await dialog(w).trigger("keydown.esc");
      await flushPromises();

      expect(dialog(w).exists()).toBe(false);
      expect(router.currentRoute.value.path).toBe("/");
    });

    it("cancels on a backdrop click", async () => {
      const { w, router } = await guarded();
      router.push("/away");
      await flushPromises();

      await dialog(w).trigger("click");
      await flushPromises();
      expect(dialog(w).exists()).toBe(false);
    });

    it("stays open when the click was inside the card", async () => {
      const { w, router } = await guarded();
      router.push("/away");
      await flushPromises();

      await w.find(".v-nav-guard__card").trigger("click");
      await flushPromises();
      expect(dialog(w).exists()).toBe(true);
    });

    it("closes itself when the condition stops holding", async () => {
      const { w, router, when } = await guarded();
      router.push("/away");
      await flushPromises();
      expect(dialog(w).exists()).toBe(true);

      when.value = false;
      await flushPromises();
      expect(dialog(w).exists()).toBe(false);
    });
  });
});
