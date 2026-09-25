import { describe, expect, it } from "vitest";

import SidebarFooter from "../../../src/components/navigation-sidebar/components/SidebarFooter.vue";
import SidebarNavItem from "../../../src/components/navigation-sidebar/components/SidebarNavItem.vue";
import type { SidebarNavItem as NavItem } from "../../../src/components/navigation-sidebar/types";
import { makeSidebarState, mountInSidebar } from "../../setup/sidebar";

/**
 * Two slots around an optional nav. The app puts its user menu in `#start` and
 * its theme toggle in `#end`; the sidebar itself contributes only the nav
 * between them, and only if it was given items.
 */

const ITEMS: NavItem[] = [
  { id: "support", label: "Support", to: "/elsewhere" },
  { id: "docs", label: "Docs", to: "/catalog" },
];

async function render(props = {}, slots = {}, harness = makeSidebarState()) {
  return mountInSidebar(SidebarFooter, { props, slots, harness });
}

describe("SidebarFooter", () => {
  describe("nav items", () => {
    it("renders one row each", async () => {
      const { wrapper } = await render({ items: ITEMS });
      expect(wrapper.findAllComponents(SidebarNavItem).map(c => (c.props("item") as NavItem).id))
        .toEqual(["support", "docs"]);
    });

    it("renders them at depth zero", async () => {
      const { wrapper } = await render({ items: ITEMS });
      expect(wrapper.findAllComponents(SidebarNavItem)[0].props("level")).toBe(0);
    });

    it("renders no nav element at all when there are none", async () => {
      // Not an empty `<nav>`: the footer's gap would then show as a stray band
      // of padding above the theme toggle.
      const { wrapper } = await render();
      expect(wrapper.find(".v-sidebar-footer__nav").exists()).toBe(false);
    });

    it("renders no nav for an empty array either", async () => {
      const { wrapper } = await render({ items: [] });
      expect(wrapper.find(".v-sidebar-footer__nav").exists()).toBe(false);
    });
  });

  describe("slots", () => {
    it("renders #start above the nav", async () => {
      const { wrapper } = await render(
        { items: ITEMS },
        { start: "<div class=\"user-menu\">U</div>" },
      );
      const start = wrapper.find(".v-sidebar-footer__slot");
      expect(start.find(".user-menu").exists()).toBe(true);

      const children = [...wrapper.element.children];
      expect(children.indexOf(start.element))
        .toBeLessThan(children.indexOf(wrapper.find(".v-sidebar-footer__nav").element));
    });

    it("renders #end below the nav", async () => {
      const { wrapper } = await render(
        { items: ITEMS },
        { end: "<div class=\"theme\">T</div>" },
      );
      const end = wrapper.find(".v-sidebar-footer__slot--end");
      expect(end.find(".theme").exists()).toBe(true);

      const children = [...wrapper.element.children];
      expect(children.indexOf(end.element))
        .toBeGreaterThan(children.indexOf(wrapper.find(".v-sidebar-footer__nav").element));
    });

    it("renders no wrapper for a slot that was not passed", async () => {
      const { wrapper } = await render();
      expect(wrapper.find(".v-sidebar-footer__slot").exists()).toBe(false);
      expect(wrapper.find(".v-sidebar-footer__slot--end").exists()).toBe(false);
    });

    it("renders both together", async () => {
      const { wrapper } = await render({}, {
        start: "<div class=\"user-menu\">U</div>",
        end: "<div class=\"theme\">T</div>",
      });
      expect(wrapper.find(".user-menu").exists()).toBe(true);
      expect(wrapper.find(".theme").exists()).toBe(true);
    });
  });

  describe("collapsed", () => {
    it("marks itself when the rail collapses", async () => {
      const harness = makeSidebarState();
      const { wrapper } = await render({ items: ITEMS }, {}, harness);
      expect(wrapper.classes()).not.toContain("v-sidebar-footer--collapsed");

      harness.state.isCollapsed.value = true;
      await wrapper.vm.$nextTick();
      expect(wrapper.classes()).toContain("v-sidebar-footer--collapsed");
    });

    it("keeps the rows, which collapse themselves", async () => {
      // Each row is a `SidebarNavItem` and already knows to drop its label and
      // grow a tooltip; the footer does not need a second rule for that.
      const harness = makeSidebarState();
      harness.state.isCollapsed.value = true;
      const { wrapper } = await render({ items: ITEMS }, {}, harness);

      expect(wrapper.findAllComponents(SidebarNavItem)).toHaveLength(2);
      expect(wrapper.find(".sidebar-item__label").exists()).toBe(false);
    });
  });
});
