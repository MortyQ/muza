import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import SidebarMobileFooter from "../../../src/components/navigation-sidebar/components/mobile/SidebarMobileFooter.vue";
import SidebarMobileNavItem from "../../../src/components/navigation-sidebar/components/mobile/SidebarMobileNavItem.vue";
import type { SidebarNavItem as NavItem } from "../../../src/components/navigation-sidebar/types";
import { makeSidebarState, mountInSidebar } from "../../setup/sidebar";

/**
 * The drawer's footer. Structurally the desktop footer's twin, with one real
 * difference: both its slots land in the same wrapper class, where the desktop
 * one uses two (`v-sidebar-footer__slot` and `sidebar-footer__slot`).
 */

const ITEMS: NavItem[] = [
  { id: "support", label: "Support", to: "/elsewhere" },
  { id: "docs", label: "Docs", to: "/catalog" },
];

async function render(props = {}, slots = {}) {
  return mountInSidebar(SidebarMobileFooter, { props, slots, harness: makeSidebarState() });
}

describe("SidebarMobileFooter", () => {
  describe("nav items", () => {
    it("renders one row each, at depth zero", async () => {
      const { wrapper } = await render({ items: ITEMS });
      const rows = wrapper.findAllComponents(SidebarMobileNavItem);
      expect(rows.map(c => (c.props("item") as NavItem).id)).toEqual(["support", "docs"]);
      expect(rows[0].props("level")).toBe(0);
    });

    it("renders no nav when there are none", async () => {
      expect((await render()).wrapper.find(".sidebar-mobile-footer__nav").exists()).toBe(false);
    });

    it("renders no nav for an empty array either", async () => {
      const { wrapper } = await render({ items: [] });
      expect(wrapper.find(".sidebar-mobile-footer__nav").exists()).toBe(false);
    });
  });

  describe("slots", () => {
    it("renders #start above the nav", async () => {
      const { wrapper } = await render(
        { items: ITEMS },
        { start: "<div class=\"user-menu\">U</div>" },
      );
      const children = [...wrapper.element.children];
      const start = wrapper.find(".user-menu").element.parentElement!;
      expect(children.indexOf(start))
        .toBeLessThan(children.indexOf(wrapper.find(".sidebar-mobile-footer__nav").element));
    });

    it("renders #end below the nav", async () => {
      const { wrapper } = await render(
        { items: ITEMS },
        { end: "<div class=\"theme\">T</div>" },
      );
      const children = [...wrapper.element.children];
      const end = wrapper.find(".theme").element.parentElement!;
      expect(children.indexOf(end))
        .toBeGreaterThan(children.indexOf(wrapper.find(".sidebar-mobile-footer__nav").element));
    });

    it("wraps each slot it was given, and only those", async () => {
      const none = await render();
      expect(none.wrapper.findAll(".sidebar-mobile-footer__slot")).toHaveLength(0);

      const one = await render({}, { start: "<div>U</div>" });
      expect(one.wrapper.findAll(".sidebar-mobile-footer__slot")).toHaveLength(1);

      const both = await render({}, { start: "<div>U</div>", end: "<div>T</div>" });
      expect(both.wrapper.findAll(".sidebar-mobile-footer__slot")).toHaveLength(2);
    });
  });

  it("needs no sidebar state of its own", async () => {
    // The only component under `navigation-sidebar/` besides
    // `SidebarMenuFlyoutParent` that does not call `useSidebarState()`. Mounting
    // it bare is the assertion: if it grew an inject, this throws.
    const wrapper = mount(SidebarMobileFooter, { slots: { start: "<div class=\"u\">U</div>" } });
    expect(wrapper.find(".u").exists()).toBe(true);
  });
});
