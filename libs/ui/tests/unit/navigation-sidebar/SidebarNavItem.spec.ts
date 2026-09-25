import { describe, expect, it, vi } from "vitest";
import { RouterLink } from "vue-router";

import VIcon from "../../../src/components/base/VIcon.vue";
import SidebarMenuFlyout from "../../../src/components/navigation-sidebar/components/SidebarMenuFlyout.vue";
import SidebarNavItem from "../../../src/components/navigation-sidebar/components/SidebarNavItem.vue";
import VTooltip from "../../../src/components/overlay/VTooltip.vue";
import { makeSidebarState, mountInSidebar } from "../../setup/sidebar";

/**
 * The sidebar's workhorse, and the only component in the library that picks
 * between three whole templates. Which one renders is a function of two
 * booleans — collapsed, and has children — and most of what can go wrong here is
 * a branch rendering the wrong element:
 *
 *   collapsed + children  → flyout wrapping a button
 *   collapsed + leaf      → tooltip wrapping a link (or a button)
 *   expanded              → link if it is a navigable leaf, button otherwise
 *
 * The rule underneath all three: a row with children is a disclosure control and
 * must never be a link, even when it carries a `to` of its own.
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
  { collapsed = false, harness = makeSidebarState(), level = 0, route = "/" } = {},
) {
  if (collapsed) harness.state.isCollapsed.value = true;
  return mountInSidebar(SidebarNavItem, { props: { item, level }, harness, route });
}

describe("SidebarNavItem", () => {
  describe("expanded — a navigable leaf", () => {
    it("renders as a router-link", async () => {
      const { wrapper } = await render();
      expect(wrapper.findComponent(RouterLink).exists()).toBe(true);
      expect(wrapper.find("a").exists()).toBe(true);
    });

    it("resolves its destination through useNavItemTo", async () => {
      const harness = makeSidebarState({ persistentQueryParams: ["brand"] });
      const { wrapper } = await render(LEAF, { harness, route: "/?brand=acme" });
      expect(wrapper.findComponent(RouterLink).props("to"))
        .toEqual({ path: "/catalog/products", query: { brand: "acme" } });
    });

    it("shows the label", async () => {
      expect((await render()).wrapper.find(".sidebar-item__label").text()).toBe("Products");
    });

    it("renders its icon at the rail size", async () => {
      const { wrapper } = await render({ ...LEAF, icon: "lucide:package" });
      const icon = wrapper.findComponent(VIcon);
      expect(icon.props("icon")).toBe("lucide:package");
      expect(icon.props("size")).toBe(15);
    });

    it("shows a badge", async () => {
      const { wrapper } = await render({ ...LEAF, badge: 4 });
      expect(wrapper.find(".sidebar-item__badge").text()).toBe("4");
    });

    it("draws no chevron", async () => {
      // Nothing to disclose. The chevron is the affordance for children.
      const { wrapper } = await render();
      expect(wrapper.find(".sidebar-item__chevron").exists()).toBe(false);
      expect(wrapper.find(".sidebar-item").attributes("aria-expanded")).toBeUndefined();
    });

    it("publishes its depth", async () => {
      const { wrapper } = await render(LEAF, { level: 2 });
      expect(wrapper.attributes("style")).toContain("--depth: 2");
    });
  });

  describe("expanded — an item with no destination", () => {
    it("renders as a button", async () => {
      const { wrapper } = await render({ id: "action", label: "Run import" });
      expect(wrapper.find("button").exists()).toBe(true);
      expect(wrapper.find("button").attributes("type")).toBe("button");
      expect(wrapper.findComponent(RouterLink).exists()).toBe(false);
    });

    it("runs its onClick and closes the mobile drawer", async () => {
      const onClick = vi.fn();
      const harness = makeSidebarState();
      harness.state.isMobileOpen.value = true;
      const { wrapper } = await render({ id: "action", label: "Run", onClick }, { harness });

      await wrapper.find("button").trigger("click");
      expect(onClick).toHaveBeenCalledOnce();
      expect(harness.state.isMobileOpen.value).toBe(false);
    });

    it("closes the drawer on a plain leaf click too", async () => {
      // Tapping a link on mobile navigates; leaving the drawer over the
      // destination would hide the page the user just asked for.
      const harness = makeSidebarState();
      harness.state.isMobileOpen.value = true;
      const { wrapper } = await render(LEAF, { harness });

      await wrapper.find("a").trigger("click");
      expect(harness.state.isMobileOpen.value).toBe(false);
    });
  });

  describe("expanded — a branch", () => {
    it("renders as a button even though it has a `to`", async () => {
      // The whole reason the element is computed rather than fixed. A branch is
      // a disclosure control; making it a link would navigate away instead of
      // revealing the children the user aimed at.
      // Scoped to the row: the branch's own children render links of their own
      // further down the subtree, so a tree-wide query would find one either way.
      const { wrapper } = await render(BRANCH);
      expect(wrapper.find(".sidebar-item").element.tagName).toBe("BUTTON");
    });

    it("toggles expansion on click rather than navigating", async () => {
      const harness = makeSidebarState();
      const { wrapper } = await render(BRANCH, { harness });

      await wrapper.find("button").trigger("click");
      expect(harness.state.isExpanded("catalog")).toBe(true);
      await wrapper.find("button").trigger("click");
      expect(harness.state.isExpanded("catalog")).toBe(false);
    });

    it("leaves the mobile drawer open while disclosing", async () => {
      // Expanding is not navigating — closing here would dismiss the menu
      // exactly as the user opened a section of it.
      const harness = makeSidebarState();
      harness.state.isMobileOpen.value = true;
      const { wrapper } = await render(BRANCH, { harness });

      await wrapper.find("button").trigger("click");
      expect(harness.state.isMobileOpen.value).toBe(true);
    });

    it("reports its disclosure state to assistive tech", async () => {
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
        .find(c => c.classes().includes("sidebar-item__chevron"));

      // One glyph, rotated by a class, so the turn can be animated
      expect(chevron()?.props("icon")).toBe("lucide:chevron-right");
      expect(chevron()?.classes()).not.toContain("sidebar-item__chevron--open");
      harness.state.toggleExpanded("catalog");
      await wrapper.vm.$nextTick();
      expect(chevron()?.classes()).toContain("sidebar-item__chevron--open");
    });

    it("renders its children as nested items one level deeper", async () => {
      const { wrapper } = await render(BRANCH);
      const children = wrapper.findAllComponents(SidebarNavItem);
      expect(children).toHaveLength(1);
      expect(children[0].props("level")).toBe(1);
      expect(children[0].props("item")).toMatchObject({ id: "products" });
    });

    it("marks the children container open only when it is", async () => {
      // The children are in the DOM either way — the accordion animates a
      // height, so unmounting them would leave nothing to animate.
      const harness = makeSidebarState();
      const { wrapper } = await render(BRANCH, { harness });
      const container = () => wrapper.find(".sidebar-item-children");

      expect(container().classes()).not.toContain("sidebar-item-children--expanded");
      harness.state.toggleExpanded("catalog");
      await wrapper.vm.$nextTick();
      expect(container().classes()).toContain("sidebar-item-children--expanded");
    });

    it("treats an empty children array as a leaf", async () => {
      // `children?.length`, not `children` — a section that filtered down to
      // nothing must not render as an empty disclosure.
      const { wrapper } = await render({ id: "reports", label: "Reports", children: [] });
      expect(wrapper.find(".sidebar-item__chevron").exists()).toBe(false);
      expect(wrapper.find(".sidebar-item-children").exists()).toBe(false);
    });
  });

  describe("active state", () => {
    it("marks itself when it is the current route", async () => {
      const harness = makeSidebarState();
      harness.activePath.value = ["catalog", "products"];
      const { wrapper } = await render(LEAF, { harness });

      expect(wrapper.find(".sidebar-item").classes()).toContain("sidebar-item--active");
      expect(wrapper.find(".sidebar-item").attributes("aria-current")).toBe("page");
    });

    it("marks a branch that merely holds the active route differently", async () => {
      // Two different states with two different classes: the row the user is on,
      // and the section it lives in. Collapsing them would make a closed section
      // look like the current page.
      const harness = makeSidebarState();
      harness.activePath.value = ["catalog", "products"];
      const { wrapper } = await render(BRANCH, { harness });

      const classes = wrapper.find(".sidebar-item").classes();
      expect(classes).toContain("sidebar-item--has-active-child");
      expect(classes).not.toContain("sidebar-item--active");
    });

    it("never claims both at once", async () => {
      const harness = makeSidebarState();
      harness.activePath.value = ["catalog"];
      const { wrapper } = await render(BRANCH, { harness });

      const classes = wrapper.find(".sidebar-item").classes();
      expect(classes).toContain("sidebar-item--active");
      expect(classes).not.toContain("sidebar-item--has-active-child");
    });

    it("does not mark a childless item as holding an active child", async () => {
      const harness = makeSidebarState();
      harness.activePath.value = ["products"];
      const { wrapper } = await render({ id: "other", label: "Other", to: "/x" }, { harness });
      expect(wrapper.find(".sidebar-item").classes())
        .not.toContain("sidebar-item--has-active-child");
    });

    it("follows the active route as it changes", async () => {
      const harness = makeSidebarState();
      const { wrapper } = await render(LEAF, { harness });
      expect(wrapper.find(".sidebar-item").classes()).not.toContain("sidebar-item--active");

      harness.activePath.value = ["catalog", "products"];
      await wrapper.vm.$nextTick();
      expect(wrapper.find(".sidebar-item").classes()).toContain("sidebar-item--active");
    });
  });

  describe("disabled", () => {
    it("does nothing on click", async () => {
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

    it("does not expand a disabled branch", async () => {
      const harness = makeSidebarState();
      const { wrapper } = await render({ ...BRANCH, disabled: true }, { harness });
      await wrapper.find("button").trigger("click");
      expect(harness.state.isExpanded("catalog")).toBe(false);
    });

    it("does not prefetch", async () => {
      const { wrapper, prefetch } = await render({ ...LEAF, disabled: true });
      await wrapper.find(".sidebar-item").trigger("mouseenter");
      expect(prefetch).not.toHaveBeenCalled();
    });

    it("carries the modifier and the attribute", async () => {
      const { wrapper } = await render({ id: "x", label: "X", disabled: true });
      expect(wrapper.find(".sidebar-item").classes()).toContain("sidebar-item--disabled");
      expect(wrapper.find("button").attributes("disabled")).toBeDefined();
    });
  });

  describe("prefetch", () => {
    it("announces a leaf's destination on hover", async () => {
      const { wrapper, prefetch } = await render();
      await wrapper.find("a").trigger("mouseenter");
      expect(prefetch).toHaveBeenCalledWith("/catalog/products");
    });

    it("stays quiet for a branch", async () => {
      // Hovering a section discloses it; there is no route to warm, and the
      // branch's own `to` is never where the click goes.
      const { wrapper, prefetch } = await render(BRANCH);
      await wrapper.find("button").trigger("mouseenter");
      expect(prefetch).not.toHaveBeenCalled();
    });

    it("stays quiet for an item that has nowhere to go", async () => {
      const { wrapper, prefetch } = await render({ id: "action", label: "Run" });
      await wrapper.find("button").trigger("mouseenter");
      expect(prefetch).not.toHaveBeenCalled();
    });
  });

  describe("collapsed", () => {
    it("hides the label and the badge", async () => {
      const { wrapper } = await render({ ...LEAF, badge: 2 }, { collapsed: true });
      expect(wrapper.find(".sidebar-item__label").exists()).toBe(false);
      expect(wrapper.find(".sidebar-item__badge").exists()).toBe(false);
    });

    it("keeps the label reachable as the accessible name", async () => {
      // The rail is glyphs only; without this the row announces as nothing.
      const { wrapper } = await render(LEAF, { collapsed: true });
      expect(wrapper.find(".sidebar-item").attributes("aria-label")).toBe("Products");
    });

    it("wraps a leaf in a tooltip carrying the label", async () => {
      const { wrapper } = await render(LEAF, { collapsed: true });
      const tooltip = wrapper.findComponent(VTooltip);
      expect(tooltip.exists()).toBe(true);
      expect(tooltip.props("text")).toBe("Products");
      expect(tooltip.props("placement")).toBe("right");
    });

    it("still navigates from inside the tooltip", async () => {
      const { wrapper } = await render(LEAF, { collapsed: true });
      expect(wrapper.findComponent(RouterLink).exists()).toBe(true);
    });

    it("wraps a branch in a flyout instead", async () => {
      // A tooltip would name the section without ever revealing its children,
      // which on a collapsed rail is the only way to reach them.
      const { wrapper } = await render(BRANCH, { collapsed: true });
      expect(wrapper.findComponent(SidebarMenuFlyout).exists()).toBe(true);
      expect(wrapper.findComponent(VTooltip).exists()).toBe(false);
    });

    it("hands the flyout the item whose children it must list", async () => {
      const { wrapper } = await render(BRANCH, { collapsed: true });
      expect(wrapper.findComponent(SidebarMenuFlyout).props("item"))
        .toMatchObject({ id: "catalog" });
    });

    it("gives a disabled branch neither flyout nor tooltip", async () => {
      const { wrapper } = await render({ ...BRANCH, disabled: true }, { collapsed: true });
      expect(wrapper.findComponent(SidebarMenuFlyout).exists()).toBe(false);
      expect(wrapper.findComponent(VTooltip).exists()).toBe(false);
    });

    it("renders no accordion — the flyout is the disclosure", async () => {
      const { wrapper } = await render(BRANCH, { collapsed: true });
      expect(wrapper.find(".sidebar-item-children").exists()).toBe(false);
    });

    it("still marks the active row", async () => {
      const harness = makeSidebarState();
      harness.activePath.value = ["catalog", "products"];
      const { wrapper } = await render(LEAF, { collapsed: true, harness });
      expect(wrapper.find(".sidebar-item").classes()).toContain("sidebar-item--active");
    });

    it("swaps branches live when the rail collapses", async () => {
      const harness = makeSidebarState();
      const { wrapper } = await render(BRANCH, { harness });
      expect(wrapper.findComponent(SidebarMenuFlyout).exists()).toBe(false);

      harness.state.isCollapsed.value = true;
      await wrapper.vm.$nextTick();
      expect(wrapper.findComponent(SidebarMenuFlyout).exists()).toBe(true);
    });
  });

  describe("recursion", () => {
    it("nests as deep as the tree goes", async () => {
      const deep = {
        id: "a",
        label: "A",
        children: [{
          id: "b",
          label: "B",
          children: [{ id: "c", label: "C", to: "/catalog" }],
        }],
      };
      const { wrapper } = await render(deep);
      const levels = wrapper.findAllComponents(SidebarNavItem).map(c => c.props("level"));
      expect(levels).toEqual([1, 2]);
    });
  });
});
