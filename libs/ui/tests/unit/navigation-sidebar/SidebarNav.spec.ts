import { ref } from "vue";

import { describe, expect, it } from "vitest";

import SidebarNav from "../../../src/components/navigation-sidebar/components/SidebarNav.vue";
import SidebarNavItem from "../../../src/components/navigation-sidebar/components/SidebarNavItem.vue";
import type { SidebarNavItem as NavItem } from "../../../src/components/navigation-sidebar/types";
import { makeNavItems, makeSidebarState, mountInSidebar } from "../../setup/sidebar";

/**
 * A `<nav>` and a `v-for`. What is worth pinning is the part that is not
 * obvious: the `v-memo` key list, which decides when a row is allowed to skip a
 * re-render. Every value in it is a primitive on purpose — an array or a Set in
 * a `v-memo` compares by identity and defeats the memo entirely.
 */

async function render(items?: NavItem[]) {
  const harness = makeSidebarState(items ? { items } : {});
  return mountInSidebar(SidebarNav, { harness });
}

describe("SidebarNav", () => {
  it("renders a nav landmark", async () => {
    const { wrapper } = await render();
    expect(wrapper.element.tagName).toBe("NAV");
    expect(wrapper.classes()).toContain("sidebar-nav");
  });

  it("renders one row per top-level item", async () => {
    const { wrapper } = await render();
    const rows = wrapper.findAllComponents(SidebarNavItem)
      .filter(c => c.props("level") === 0);
    expect(rows.map(c => (c.props("item") as NavItem).id))
      .toEqual(["home", "catalog", "reports", "action"]);
  });

  it("starts every top-level row at depth zero", async () => {
    const { wrapper } = await render([
      { id: "a", label: "A", children: [{ id: "b", label: "B", to: "/catalog" }] },
    ]);
    const roots = wrapper.findAllComponents(SidebarNavItem)
      .filter(c => (c.props("item") as NavItem).id === "a");
    expect(roots[0].props("level")).toBe(0);
  });

  it("renders nothing for an empty menu", async () => {
    const { wrapper } = await render([]);
    expect(wrapper.findAllComponents(SidebarNavItem)).toHaveLength(0);
    expect(wrapper.find(".sidebar-nav__list").exists()).toBe(true);
  });

  it("follows the items as they change", async () => {
    // The menu is typically a computed over an auth store, so rows appear and
    // disappear as permissions resolve.
    const items = ref(makeNavItems());
    const harness = makeSidebarState({ items });
    const { wrapper } = await mountInSidebar(SidebarNav, { harness });
    expect(wrapper.findAllComponents(SidebarNavItem).length).toBeGreaterThan(0);

    items.value = [{ id: "solo", label: "Solo", to: "/catalog" }];
    await wrapper.vm.$nextTick();
    const rows = wrapper.findAllComponents(SidebarNavItem);
    expect(rows).toHaveLength(1);
    expect((rows[0].props("item") as NavItem).id).toBe("solo");
  });

  it("marks itself collapsed with the rail", async () => {
    const harness = makeSidebarState();
    const { wrapper } = await mountInSidebar(SidebarNav, { harness });
    expect(wrapper.classes()).not.toContain("sidebar-nav--collapsed");

    harness.state.isCollapsed.value = true;
    await wrapper.vm.$nextTick();
    expect(wrapper.classes()).toContain("sidebar-nav--collapsed");
  });

  describe("what the v-memo lets through", () => {
    it("re-renders when the active route moves", async () => {
      const harness = makeSidebarState();
      const { wrapper } = await mountInSidebar(SidebarNav, { harness });
      const row = () => wrapper.findAllComponents(SidebarNavItem)
        .find(c => (c.props("item") as NavItem).id === "home")!;
      expect(row().find(".sidebar-item").classes()).not.toContain("sidebar-item--active");

      harness.activePath.value = ["home"];
      await wrapper.vm.$nextTick();
      expect(row().find(".sidebar-item").classes()).toContain("sidebar-item--active");
    });

    it("re-renders when a branch is expanded", async () => {
      // The memo watches `expandedItems.size`, not the Set — which is why every
      // writer in `buildSidebarState` replaces the Set *and* why a toggle that
      // swapped one id for another would be invisible here. Expanding changes
      // the size, and that is the case the sidebar actually produces.
      const harness = makeSidebarState();
      const { wrapper } = await mountInSidebar(SidebarNav, { harness });
      const branch = () => wrapper.findAllComponents(SidebarNavItem)
        .find(c => (c.props("item") as NavItem).id === "catalog")!;
      expect(branch().find(".sidebar-item").attributes("aria-expanded")).toBe("false");

      harness.state.toggleExpanded("catalog");
      await wrapper.vm.$nextTick();
      expect(branch().find(".sidebar-item").attributes("aria-expanded")).toBe("true");
    });

    it("re-renders when the rail collapses", async () => {
      const harness = makeSidebarState();
      const { wrapper } = await mountInSidebar(SidebarNav, { harness });
      expect(wrapper.find(".sidebar-item__label").exists()).toBe(true);

      harness.state.isCollapsed.value = true;
      await wrapper.vm.$nextTick();
      expect(wrapper.find(".sidebar-item__label").exists()).toBe(false);
    });
  });
});
