import { describe, expect, it, vi } from "vitest";
import { RouterLink } from "vue-router";

import VIcon from "../../../src/components/base/VIcon.vue";
import SidebarMobileNavItem from "../../../src/components/navigation-sidebar/components/mobile/SidebarMobileNavItem.vue";
import { makeSidebarState, mountInSidebar } from "../../setup/sidebar";

/**
 * The desktop row's sibling, with the collapsed axis removed: a drawer is never
 * a rail, so there is no flyout, no tooltip and no hidden label — one template
 * instead of three.
 *
 * What it keeps is the important half: a branch is a disclosure and a leaf is a
 * link, and clicking a leaf closes the drawer it was tapped in.
 */

const LEAF = { id: "products", label: "Products", to: "/catalog/products" };
const BRANCH = {
  id: "catalog",
  label: "Catalog",
  to: "/catalog",
  children: [{ id: "products", label: "Products", to: "/catalog/products" }],
};

async function render(
  item: Record<string, unknown> = LEAF,
  { harness = makeSidebarState(), level = 0, route = "/" } = {},
) {
  return mountInSidebar(SidebarMobileNavItem, { props: { item, level }, harness, route });
}

describe("SidebarMobileNavItem", () => {
  describe("a leaf", () => {
    it("renders as a router-link", async () => {
      const { wrapper } = await render();
      expect(wrapper.findComponent(RouterLink).exists()).toBe(true);
    });

    it("resolves its destination through useNavItemTo", async () => {
      const harness = makeSidebarState({ persistentQueryParams: ["brand"] });
      const { wrapper } = await render(LEAF, { harness, route: "/?brand=acme" });
      expect(wrapper.findComponent(RouterLink).props("to"))
        .toEqual({ path: "/catalog/products", query: { brand: "acme" } });
    });

    it("always shows its label — a drawer has the room", async () => {
      const { wrapper } = await render();
      expect(wrapper.find(".sidebar-item__label").text()).toBe("Products");
    });

    it("always shows its badge for the same reason", async () => {
      const { wrapper } = await render({ ...LEAF, badge: 5 });
      expect(wrapper.find(".sidebar-item__badge").text()).toBe("5");
    });

    it("closes the drawer when tapped", async () => {
      const harness = makeSidebarState();
      harness.state.isMobileOpen.value = true;
      const { wrapper } = await render(LEAF, { harness });

      await wrapper.find("a").trigger("click");
      expect(harness.state.isMobileOpen.value).toBe(false);
    });

    it("draws no chevron", async () => {
      const { wrapper } = await render();
      expect(wrapper.find(".sidebar-item__chevron").exists()).toBe(false);
    });
  });

  describe("an item with no destination", () => {
    it("renders as a button and runs its handler", async () => {
      const onClick = vi.fn();
      const harness = makeSidebarState();
      harness.state.isMobileOpen.value = true;
      const { wrapper } = await render({ id: "action", label: "Run", onClick }, { harness });

      expect(wrapper.find("button").exists()).toBe(true);
      await wrapper.find("button").trigger("click");
      expect(onClick).toHaveBeenCalledOnce();
      expect(harness.state.isMobileOpen.value).toBe(false);
    });
  });

  describe("a branch", () => {
    it("is a button even with a `to` of its own", async () => {
      const { wrapper } = await render(BRANCH);
      expect(wrapper.find(".sidebar-item").element.tagName).toBe("BUTTON");
    });

    it("expands instead of navigating, and leaves the drawer open", async () => {
      const harness = makeSidebarState();
      harness.state.isMobileOpen.value = true;
      const { wrapper } = await render(BRANCH, { harness });

      await wrapper.find("button").trigger("click");
      expect(harness.state.isExpanded("catalog")).toBe(true);
      expect(harness.state.isMobileOpen.value).toBe(true);
    });

    it("reports its disclosure state", async () => {
      const harness = makeSidebarState();
      const { wrapper } = await render(BRANCH, { harness });
      expect(wrapper.find(".sidebar-item").attributes("aria-expanded")).toBe("false");

      harness.state.toggleExpanded("catalog");
      await wrapper.vm.$nextTick();
      expect(wrapper.find(".sidebar-item").attributes("aria-expanded")).toBe("true");
    });

    it("turns the chevron over when open", async () => {
      const harness = makeSidebarState();
      const { wrapper } = await render(BRANCH, { harness });
      const chevron = () => wrapper.findAllComponents(VIcon)
        .find(c => c.classes().includes("sidebar-item__chevron"))?.props("icon");

      expect(chevron()).toBe("mdi:chevron-down");
      harness.state.toggleExpanded("catalog");
      await wrapper.vm.$nextTick();
      expect(chevron()).toBe("mdi:chevron-up");
    });

    it("nests its children one level deeper", async () => {
      const { wrapper } = await render(BRANCH);
      const children = wrapper.findAllComponents(SidebarMobileNavItem);
      expect(children).toHaveLength(1);
      expect(children[0].props("level")).toBe(1);
    });

    it("treats an empty children array as a leaf", async () => {
      const { wrapper } = await render({ id: "reports", label: "Reports", children: [] });
      expect(wrapper.find(".sidebar-item-children").exists()).toBe(false);
    });
  });

  describe("active state", () => {
    it("marks the current route", async () => {
      const harness = makeSidebarState();
      harness.activePath.value = ["catalog", "products"];
      const { wrapper } = await render(LEAF, { harness });
      expect(wrapper.find(".sidebar-item").classes()).toContain("sidebar-item--active");
      expect(wrapper.find(".sidebar-item").attributes("aria-current")).toBe("page");
    });

    it("marks a section holding it differently", async () => {
      const harness = makeSidebarState();
      harness.activePath.value = ["catalog", "products"];
      const { wrapper } = await render(BRANCH, { harness });
      const classes = wrapper.find(".sidebar-item").classes();
      expect(classes).toContain("sidebar-item--has-active-child");
      expect(classes).not.toContain("sidebar-item--active");
    });
  });

  describe("disabled", () => {
    it("does nothing on tap", async () => {
      const onClick = vi.fn();
      const harness = makeSidebarState();
      harness.state.isMobileOpen.value = true;
      const { wrapper } = await render(
        { id: "action", label: "Run", onClick, disabled: true },
        { harness },
      );
      await wrapper.find("button").trigger("click");
      expect(onClick).not.toHaveBeenCalled();
      expect(harness.state.isMobileOpen.value).toBe(true);
    });

    it("carries the modifier", async () => {
      const { wrapper } = await render({ id: "x", label: "X", disabled: true });
      expect(wrapper.find(".sidebar-item").classes()).toContain("sidebar-item--disabled");
    });
  });

  describe("prefetch", () => {
    it("announces a leaf's destination", async () => {
      // Kept on the mobile row too: a tap is preceded by a touchstart that
      // browsers surface as a mouseenter, so the warm-up still lands.
      const { wrapper, prefetch } = await render();
      await wrapper.find("a").trigger("mouseenter");
      expect(prefetch).toHaveBeenCalledWith("/catalog/products");
    });

    it("stays quiet for a branch and for a disabled row", async () => {
      const branch = await render(BRANCH);
      await branch.wrapper.find("button").trigger("mouseenter");
      expect(branch.prefetch).not.toHaveBeenCalled();

      const off = await render({ ...LEAF, disabled: true });
      await off.wrapper.find(".sidebar-item").trigger("mouseenter");
      expect(off.prefetch).not.toHaveBeenCalled();
    });
  });

  it("publishes its depth", async () => {
    const { wrapper } = await render(LEAF, { level: 3 });
    expect(wrapper.attributes("style")).toContain("--depth: 3");
  });
});
