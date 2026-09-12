import { defineComponent, inject } from "vue";

import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { createMemoryHistory, createRouter } from "vue-router";

import SidebarFooter from "../../../src/components/navigation-sidebar/components/SidebarFooter.vue";
import SidebarHeader from "../../../src/components/navigation-sidebar/components/SidebarHeader.vue";
import SidebarNav from "../../../src/components/navigation-sidebar/components/SidebarNav.vue";
import SidebarNavItem from "../../../src/components/navigation-sidebar/components/SidebarNavItem.vue";
import { SIDEBAR_STATE_KEY } from "../../../src/components/navigation-sidebar/composables/injectionKeys";
import type { SidebarStateProvided } from "../../../src/components/navigation-sidebar/composables/useSidebarState";
import { createSidebar } from "../../../src/components/navigation-sidebar/createSidebar";
import NavigationSidebar from "../../../src/components/navigation-sidebar/NavigationSidebar.vue";
import type { SidebarInstance } from "../../../src/components/navigation-sidebar/types";
import { makeNavItems, NAV_ROUTES } from "../../setup/sidebar";

/**
 * The root. Unlike every other spec in this folder it provides nothing itself —
 * the component under test is the thing that calls `buildSidebarState` and
 * `useNavigation` and hands the result down, so this is where that wiring is
 * asserted end to end against a real route.
 *
 * The mobile half is `defineAsyncComponent`'d. Reaching it takes two steps, and
 * the first is not obvious: under Vitest's module runner the loader's dynamic
 * import does not settle on its own, however many ticks a spec waits — the
 * chunk has to be imported by the test first. `warmMobileChunk()` does that, and
 * then one `flushPromises` is enough. Without the warm-up the drawer stays a
 * comment node forever and every assertion about it fails for the wrong reason.
 */

/** @see the note above — the async chunk will not resolve until this has run. */
const warmMobileChunk = () =>
  import("../../../src/components/navigation-sidebar/NavigationSidebarMobile.vue");

async function render(
  { instance = createSidebar({ items: makeNavItems() }), slots = {}, route = "/" } = {},
) {
  await warmMobileChunk();
  const router = createRouter({ history: createMemoryHistory(), routes: NAV_ROUTES });
  await router.push(route);
  await router.isReady();

  const wrapper = mount(NavigationSidebar, {
    props: { sidebar: instance },
    slots,
    global: { plugins: [router] },
  });
  await flushPromises();

  return { wrapper, instance, router };
}

/** Reads the provide out of a child, which is the only way to see it. */
async function provided(instance?: SidebarInstance): Promise<SidebarStateProvided> {
  let state!: SidebarStateProvided;
  const Probe = defineComponent({
    setup() {
      state = inject(SIDEBAR_STATE_KEY)!;
      return () => null;
    },
  });

  const router = createRouter({ history: createMemoryHistory(), routes: NAV_ROUTES });
  await router.push("/catalog/products");
  await router.isReady();

  mount(NavigationSidebar, {
    props: { sidebar: instance ?? createSidebar({ items: makeNavItems() }) },
    slots: { "header-end": () => null },
    global: { plugins: [router], stubs: { SidebarHeader: Probe } },
  });
  await flushPromises();

  return state;
}

describe("NavigationSidebar", () => {
  describe("structure", () => {
    it("renders the three desktop parts", async () => {
      const { wrapper } = await render();
      expect(wrapper.findComponent(SidebarHeader).exists()).toBe(true);
      expect(wrapper.findComponent(SidebarNav).exists()).toBe(true);
      expect(wrapper.findComponent(SidebarFooter).exists()).toBe(true);
    });

    it("names the rail for assistive tech", async () => {
      const { wrapper } = await render();
      expect(wrapper.find("aside").attributes("aria-label")).toBe("Main navigation");
    });

    it("marks itself collapsed from the instance", async () => {
      const instance = createSidebar({ items: makeNavItems(), persistCollapse: false });
      const { wrapper } = await render({ instance });
      expect(wrapper.find("aside").classes()).not.toContain("sidebar--collapsed");

      instance.toggleCollapse();
      await wrapper.vm.$nextTick();
      expect(wrapper.find("aside").classes()).toContain("sidebar--collapsed");
    });

    it("renders the menu it was given", async () => {
      const { wrapper } = await render();
      const rows = wrapper.findAllComponents(SidebarNavItem)
        .filter(c => c.props("level") === 0);
      expect(rows.map(c => (c.props("item") as { id: string }).id))
        .toEqual(["home", "catalog", "reports", "action"]);
    });

    it("loads the mobile drawer lazily", async () => {
      // Desktop users never download it. The assertion is that it is absent on
      // the synchronous first render and present once the import resolves.
      await warmMobileChunk();
      const router = createRouter({ history: createMemoryHistory(), routes: NAV_ROUTES });
      await router.push("/");
      await router.isReady();

      const wrapper = mount(NavigationSidebar, {
        props: { sidebar: createSidebar({ items: makeNavItems() }) },
        global: { plugins: [router] },
      });
      expect(wrapper.find(".sidebar-mobile").exists()).toBe(false);

      await flushPromises();
      expect(wrapper.find(".sidebar-mobile").exists()).toBe(true);
    });
  });

  describe("what it provides", () => {
    it("gives children the instance's own state", async () => {
      const instance = createSidebar({ items: makeNavItems(), persistCollapse: false });
      const state = await provided(instance);

      expect(state.isCollapsed).toBe(instance.isCollapsed);
      expect(state.isMobileOpen).toBe(instance.isMobileOpen);
      expect(state.expandedItems).toBe(instance.expandedItems);
      expect(state.options).toBe(instance.options);
    });

    it("resolves the navigation against the real route", async () => {
      // The seam this whole component exists for: `useNavigation` over the
      // resolved items, with the answer handed to every row below.
      const state = await provided();
      expect(state.activeItemId.value).toBe("products");
      expect(state.isActive("products")).toBe(true);
      expect(state.isOnActivePath("catalog")).toBe(true);
      expect([...state.activePathIds.value]).toEqual(["catalog", "products"]);
    });

    it("provides working toggles", async () => {
      const instance = createSidebar({ items: makeNavItems(), persistCollapse: false });
      const state = await provided(instance);

      state.toggleCollapse();
      expect(instance.isCollapsed.value).toBe(true);
      state.toggleExpanded("catalog");
      expect(instance.expandedItems.value.has("catalog")).toBe(true);
    });
  });

  describe("emits", () => {
    it("re-emits a row's prefetch upward", async () => {
      // The sidebar does not import `prefetchRoute` — it says what was hovered
      // and lets the app decide what warming a route means.
      const { wrapper } = await render();
      const row = wrapper.findAllComponents(SidebarNavItem)
        .find(c => (c.props("item") as { id: string }).id === "home")!;

      await row.find(".sidebar-item").trigger("mouseenter");
      expect(wrapper.emitted("prefetch")?.[0]).toEqual(["/"]);
    });

    it("stays silent until something is hovered", async () => {
      const { wrapper } = await render();
      expect(wrapper.emitted("prefetch")).toBeUndefined();
    });
  });

  describe("slots", () => {
    it("forwards #header-end to the header", async () => {
      const { wrapper } = await render({
        slots: { "header-end": "<span class=\"extra\">x</span>" },
      });
      expect(wrapper.findComponent(SidebarHeader).find(".extra").exists()).toBe(true);
    });

    it("forwards #footer-start and #footer-end to the footer", async () => {
      const { wrapper } = await render({
        slots: {
          "footer-start": "<div class=\"user-menu\">U</div>",
          "footer-end": "<div class=\"theme\">T</div>",
        },
      });
      const footer = wrapper.findComponent(SidebarFooter);
      expect(footer.find(".user-menu").exists()).toBe(true);
      expect(footer.find(".theme").exists()).toBe(true);
    });

    it("gives the same footer slots to the mobile drawer", async () => {
      // One `#footer-start` from the app has to reach both shells; the drawer
      // and the rail are never visible at once, so there is no duplication.
      const { wrapper } = await render({
        slots: { "footer-start": "<div class=\"user-menu\">U</div>" },
      });
      expect(wrapper.findAll(".user-menu").length).toBe(2);
    });

    it("passes no slot the caller did not give", async () => {
      const { wrapper } = await render();
      expect(wrapper.findComponent(SidebarFooter).find(".v-sidebar-footer__slot").exists())
        .toBe(false);
    });
  });

  it("keeps two sidebars on one page independent", async () => {
    // `buildSidebarState` and `useNavigation` are both per-instance, and the
    // provide is scoped to each component's own subtree.
    const a = createSidebar({ items: makeNavItems(), persistCollapse: false });
    const b = createSidebar({ items: [{ id: "solo", label: "Solo" }], persistCollapse: false });

    const first = await render({ instance: a });
    await render({ instance: b });

    a.toggleCollapse();
    await first.wrapper.vm.$nextTick();
    expect(first.wrapper.find("aside").classes()).toContain("sidebar--collapsed");
    expect(b.isCollapsed.value).toBe(false);
  });
});
