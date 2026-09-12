import { describe, expect, it } from "vitest";

import VIcon from "../../../src/components/base/VIcon.vue";
import SidebarMobileHeader from "../../../src/components/navigation-sidebar/components/mobile/SidebarMobileHeader.vue";
import { makeSidebarState, mountInSidebar } from "../../setup/sidebar";

/**
 * The drawer's header: the brand, and the button that dismisses it. The desktop
 * header's collapse toggle has no meaning here — a drawer is open or gone.
 */

const BRAND = { brandName: "Muzakit", logoUrl: "/logo.svg" };

async function render(options = BRAND) {
  const harness = makeSidebarState(options);
  return mountInSidebar(SidebarMobileHeader, { harness });
}

describe("SidebarMobileHeader", () => {
  describe("brand", () => {
    it("shows the name as the drawer's heading", async () => {
      const { wrapper } = await render();
      const name = wrapper.find(".sidebar-mobile-header__name");
      expect(name.element.tagName).toBe("H1");
      expect(name.text()).toBe("Muzakit");
    });

    it("shows the logo, labelled with the brand name", async () => {
      const img = (await render()).wrapper.find(".sidebar-mobile-header__logo img");
      expect(img.attributes("src")).toBe("/logo.svg");
      expect(img.attributes("alt")).toBe("Muzakit");
    });

    it("omits the logo when there is no url", async () => {
      const { wrapper } = await render({ brandName: "Muzakit", logoUrl: "" });
      expect(wrapper.find(".sidebar-mobile-header__logo").exists()).toBe(false);
    });

    it("omits the heading when there is no name", async () => {
      // An empty `<h1>` is a worse outcome than no heading: it lands in the
      // document outline as a blank level-one entry.
      const { wrapper } = await render({ brandName: "", logoUrl: "/logo.svg" });
      expect(wrapper.find(".sidebar-mobile-header__name").exists()).toBe(false);
    });

    it("survives having neither", async () => {
      const { wrapper } = await render({ brandName: "", logoUrl: "" });
      expect(wrapper.find(".sidebar-mobile-header__close").exists()).toBe(true);
    });
  });

  describe("the close button", () => {
    it("closes the drawer", async () => {
      const harness = makeSidebarState(BRAND);
      harness.state.isMobileOpen.value = true;
      const { wrapper } = await mountInSidebar(SidebarMobileHeader, { harness });

      await wrapper.find(".sidebar-mobile-header__close").trigger("click");
      expect(harness.state.isMobileOpen.value).toBe(false);
    });

    it("is a real button with an accessible name", async () => {
      const button = (await render()).wrapper.find(".sidebar-mobile-header__close");
      expect(button.attributes("type")).toBe("button");
      expect(button.attributes("aria-label")).toBe("Close menu");
    });

    it("carries an icon and no text", async () => {
      const { wrapper } = await render();
      const button = wrapper.find(".sidebar-mobile-header__close");
      expect(button.text()).toBe("");
      expect(button.findComponent(VIcon).props("icon")).toBe("lucide:x");
    });

    it("stays idempotent when the drawer is already shut", async () => {
      const harness = makeSidebarState(BRAND);
      const { wrapper } = await mountInSidebar(SidebarMobileHeader, { harness });
      await wrapper.find(".sidebar-mobile-header__close").trigger("click");
      expect(harness.state.isMobileOpen.value).toBe(false);
    });

    it("does not touch the collapsed rail", async () => {
      // Two separate axes: dismissing the drawer must not collapse the desktop
      // sidebar the same app is rendering behind it.
      const harness = makeSidebarState(BRAND);
      const { wrapper } = await mountInSidebar(SidebarMobileHeader, { harness });
      await wrapper.find(".sidebar-mobile-header__close").trigger("click");
      expect(harness.state.isCollapsed.value).toBe(false);
    });
  });
});
