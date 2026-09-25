import { describe, expect, it } from "vitest";

import VIcon from "../../../src/components/base/VIcon.vue";
import SidebarHeader from "../../../src/components/navigation-sidebar/components/SidebarHeader.vue";
import { makeSidebarState, mountInSidebar } from "../../setup/sidebar";

/**
 * Brand on the left, controls on the right, and the one button that collapses
 * the rail. Everything it renders comes from the provided options — the header
 * takes no props of its own.
 */

const BRAND = { brandName: "Muzakit", logoUrl: "/logo.svg" };

async function render(options = BRAND, slots = {}) {
  const harness = makeSidebarState(options);
  const mounted = await mountInSidebar(SidebarHeader, { harness, slots });
  return mounted;
}

const toggle = (wrapper: Awaited<ReturnType<typeof render>>["wrapper"]) =>
  wrapper.find(".sidebar-header__toggle");

describe("SidebarHeader", () => {
  describe("brand", () => {
    it("shows the name", async () => {
      const { wrapper } = await render();
      expect(wrapper.find(".sidebar-header__name").text()).toBe("Muzakit");
    });

    it("shows the logo, labelled with the brand name", async () => {
      // The name is right beside it, so the alt text is redundant to a sighted
      // user — but an empty alt on a linked logo reads as nothing at all.
      const { wrapper } = await render();
      const img = wrapper.find(".sidebar-header__logo img");
      expect(img.attributes("src")).toBe("/logo.svg");
      expect(img.attributes("alt")).toBe("Muzakit");
    });

    it("renders no logo block when there is no url", async () => {
      const { wrapper } = await render({ brandName: "Muzakit" });
      expect(wrapper.find(".sidebar-header__logo").exists()).toBe(false);
      expect(wrapper.find(".sidebar-header__name").text()).toBe("Muzakit");
    });

    it("hides the whole brand when the rail collapses", async () => {
      const harness = makeSidebarState(BRAND);
      const { wrapper } = await mountInSidebar(SidebarHeader, { harness });
      expect(wrapper.find(".sidebar-header__brand").exists()).toBe(true);

      harness.state.isCollapsed.value = true;
      await wrapper.vm.$nextTick();
      expect(wrapper.find(".sidebar-header__brand").exists()).toBe(false);
    });

    it("marks the header collapsed alongside it", async () => {
      const harness = makeSidebarState(BRAND);
      harness.state.isCollapsed.value = true;
      const { wrapper } = await mountInSidebar(SidebarHeader, { harness });
      expect(wrapper.classes()).toContain("sidebar-header--collapsed");
    });
  });

  describe("the collapse toggle", () => {
    it("collapses and expands the rail", async () => {
      const harness = makeSidebarState(BRAND);
      const { wrapper } = await mountInSidebar(SidebarHeader, { harness });

      await toggle(wrapper).trigger("click");
      expect(harness.state.isCollapsed.value).toBe(true);
      await toggle(wrapper).trigger("click");
      expect(harness.state.isCollapsed.value).toBe(false);
    });

    it("is a real button", async () => {
      const { wrapper } = await render();
      expect(toggle(wrapper).attributes("type")).toBe("button");
    });

    it("says what it will do, not what the state is", async () => {
      // A button labelled "Collapsed" describes the rail; this one describes the
      // action, which is what a screen reader user is choosing between.
      const harness = makeSidebarState(BRAND);
      const { wrapper } = await mountInSidebar(SidebarHeader, { harness });
      expect(toggle(wrapper).attributes("aria-label")).toBe("Collapse sidebar");

      harness.state.isCollapsed.value = true;
      await wrapper.vm.$nextTick();
      expect(toggle(wrapper).attributes("aria-label")).toBe("Expand sidebar");
    });

    it("swaps the panel glyph to point the way the rail will move", async () => {
      const harness = makeSidebarState(BRAND);
      const { wrapper } = await mountInSidebar(SidebarHeader, { harness });
      const glyph = () => wrapper.findComponent(VIcon).props("icon");
      expect(glyph()).toBe("lucide:panel-left-close");

      harness.state.isCollapsed.value = true;
      await wrapper.vm.$nextTick();
      expect(glyph()).toBe("lucide:panel-left-open");
    });
  });

  describe("the #end slot", () => {
    it("renders beside the toggle", async () => {
      const { wrapper } = await render(BRAND, { end: "<span class=\"extra\">x</span>" });
      expect(wrapper.find(".sidebar-header__controls .extra").exists()).toBe(true);
    });

    it("does not displace the toggle", async () => {
      const { wrapper } = await render(BRAND, { end: "<span class=\"extra\">x</span>" });
      expect(toggle(wrapper).exists()).toBe(true);
    });

    it("survives the rail collapsing", async () => {
      // The brand is hidden when collapsed; whatever the app put in `#end` is
      // a control, and controls stay reachable on the rail.
      const harness = makeSidebarState(BRAND);
      harness.state.isCollapsed.value = true;
      const { wrapper } = await mountInSidebar(SidebarHeader, {
        harness,
        slots: { end: "<span class=\"extra\">x</span>" },
      });
      expect(wrapper.find(".extra").exists()).toBe(true);
    });
  });
});
