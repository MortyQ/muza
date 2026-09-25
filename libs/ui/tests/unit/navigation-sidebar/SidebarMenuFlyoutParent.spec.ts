import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import VIcon from "../../../src/components/base/VIcon.vue";
import SidebarMenuFlyoutParent from "../../../src/components/navigation-sidebar/components/SidebarMenuFlyoutParent.vue";

/**
 * The one sidebar component with no injection and no logic: a flyout row for a
 * branch that has no route of its own, so it labels its children without
 * offering anywhere to go.
 *
 * That it is inert is the contract. A parent row that navigated would take the
 * user somewhere the menu never advertised.
 */

const item = (overrides = {}) => ({ id: "media", label: "Media", level: 1, ...overrides });

function render(overrides = {}) {
  return mount(SidebarMenuFlyoutParent, { props: { item: item(overrides) } });
}

describe("SidebarMenuFlyoutParent", () => {
  it("renders a div, not a link or a button", () => {
    const wrapper = render();
    expect(wrapper.element.tagName).toBe("DIV");
    expect(wrapper.find("a").exists()).toBe(false);
    expect(wrapper.find("button").exists()).toBe(false);
  });

  it("carries the flyout item classes plus its own modifier", () => {
    expect(render().classes()).toEqual(
      expect.arrayContaining(["sidebar-flyout__item", "sidebar-flyout__item--parent"]),
    );
  });

  it("shows the label", () => {
    expect(render().find(".sidebar-flyout__item-label").text()).toBe("Media");
  });

  it("publishes its depth as a custom property", () => {
    // Indentation is a CSS concern; the component only says how deep it is.
    expect(render({ level: 2 }).attributes("style")).toContain("--depth: 2");
  });

  it("reports depth zero as zero, not as absent", () => {
    expect(render({ level: 0 }).attributes("style")).toContain("--depth: 0");
  });

  describe("icon", () => {
    it("renders one when the item has it", () => {
      // Asserted on the props: Iconify renders an empty `<svg>` until it has
      // fetched the glyph, so the name never reaches the markup in jsdom.
      const icon = render({ icon: "lucide:image" }).findComponent(VIcon);
      expect(icon.exists()).toBe(true);
      expect(icon.props("icon")).toBe("lucide:image");
      expect(icon.props("size")).toBe(15);
    });

    it("renders none when it does not", () => {
      expect(render().findComponent(VIcon).exists()).toBe(false);
    });
  });

  describe("badge", () => {
    it("shows when set", () => {
      expect(render({ badge: 7 }).find(".sidebar-flyout__item-badge").text()).toBe("7");
    });

    it("shows a string badge", () => {
      expect(render({ badge: "new" }).find(".sidebar-flyout__item-badge").text()).toBe("new");
    });

    it("is absent when unset", () => {
      expect(render().find(".sidebar-flyout__item-badge").exists()).toBe(false);
    });

    it("is absent for a zero count", () => {
      // `v-if="item.badge"` — a zero badge is a count of nothing, and drawing it
      // would put a "0" chip on every empty section.
      expect(render({ badge: 0 }).find(".sidebar-flyout__item-badge").exists()).toBe(false);
    });
  });

  it("ignores a `to` it happens to carry", () => {
    // The flyout decides which of the two row components to render by looking at
    // `to`; if one reached here anyway it must still not become a link.
    const wrapper = render({ to: "/catalog/media" });
    expect(wrapper.find("a").exists()).toBe(false);
    expect(wrapper.element.tagName).toBe("DIV");
  });
});
