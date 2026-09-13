import { ref } from "vue";

import { describe, expect, it } from "vitest";

import SidebarMobileNav from "../../../src/components/navigation-sidebar/components/mobile/SidebarMobileNav.vue";
import SidebarMobileNavItem from "../../../src/components/navigation-sidebar/components/mobile/SidebarMobileNavItem.vue";
import type { SidebarNavItem as NavItem } from "../../../src/components/navigation-sidebar/types";
import { makeNavItems, makeSidebarState, mountInSidebar } from "../../setup/sidebar";

/**
 * The drawer's list. Same `v-for` as `SidebarNav`, one key shorter in its
 * `v-memo` — a drawer has no collapsed state to react to.
 */

async function render(items?: NavItem[]) {
  const harness = makeSidebarState(items ? { items } : {});
  return mountInSidebar(SidebarMobileNav, { harness });
}

describe("SidebarMobileNav", () => {
  it("renders a nav landmark with a name of its own", async () => {
    // It coexists with the desktop `<nav>` in the same document — two landmarks
    // both called "Main navigation" are indistinguishable in a rotor.
    const { wrapper } = await render();
    expect(wrapper.element.tagName).toBe("NAV");
    expect(wrapper.attributes("aria-label")).toBe("Mobile navigation");
  });

  it("renders one row per top-level item", async () => {
    const { wrapper } = await render();
    const rows = wrapper.findAllComponents(SidebarMobileNavItem)
      .filter(c => c.props("level") === 0);
    expect(rows.map(c => (c.props("item") as NavItem).id))
      .toEqual(["home", "catalog", "reports", "action"]);
  });

  it("renders nothing for an empty menu", async () => {
    const { wrapper } = await render([]);
    expect(wrapper.findAllComponents(SidebarMobileNavItem)).toHaveLength(0);
  });

  it("follows the items as they change", async () => {
    const items = ref(makeNavItems());
    const harness = makeSidebarState({ items });
    const { wrapper } = await mountInSidebar(SidebarMobileNav, { harness });

    items.value = [{ id: "solo", label: "Solo", to: "/catalog" }];
    await wrapper.vm.$nextTick();
    expect(wrapper.findAllComponents(SidebarMobileNavItem)).toHaveLength(1);
  });

  describe("what the v-memo lets through", () => {
    it("re-renders when the active route moves", async () => {
      const harness = makeSidebarState();
      const { wrapper } = await mountInSidebar(SidebarMobileNav, { harness });
      const row = () => wrapper.findAllComponents(SidebarMobileNavItem)
        .find(c => (c.props("item") as NavItem).id === "home")!;
      expect(row().find(".sidebar-item").classes()).not.toContain("sidebar-item--active");

      harness.activePath.value = ["home"];
      await wrapper.vm.$nextTick();
      expect(row().find(".sidebar-item").classes()).toContain("sidebar-item--active");
    });

    it("re-renders when a branch is expanded", async () => {
      const harness = makeSidebarState();
      const { wrapper } = await mountInSidebar(SidebarMobileNav, { harness });
      const branch = () => wrapper.findAllComponents(SidebarMobileNavItem)
        .find(c => (c.props("item") as NavItem).id === "catalog")!;
      expect(branch().find(".sidebar-item").attributes("aria-expanded")).toBe("false");

      harness.state.toggleExpanded("catalog");
      await wrapper.vm.$nextTick();
      expect(branch().find(".sidebar-item").attributes("aria-expanded")).toBe("true");
    });

    it("ignores the collapsed axis, which the drawer does not have", async () => {
      // `isCollapsed` is deliberately absent from the memo keys here. Asserting
      // it is what stops someone "fixing" the asymmetry with the desktop nav by
      // pasting the fourth key in.
      const harness = makeSidebarState();
      const { wrapper } = await mountInSidebar(SidebarMobileNav, { harness });
      expect(wrapper.find(".sidebar-item__label").exists()).toBe(true);

      harness.state.isCollapsed.value = true;
      await wrapper.vm.$nextTick();
      expect(wrapper.find(".sidebar-item__label").exists()).toBe(true);
    });
  });
});
