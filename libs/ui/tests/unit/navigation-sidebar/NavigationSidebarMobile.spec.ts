import { describe, expect, it, vi } from "vitest";

import SidebarMobileFooter from "../../../src/components/navigation-sidebar/components/mobile/SidebarMobileFooter.vue";
import SidebarMobileHeader from "../../../src/components/navigation-sidebar/components/mobile/SidebarMobileHeader.vue";
import SidebarMobileNav from "../../../src/components/navigation-sidebar/components/mobile/SidebarMobileNav.vue";
import NavigationSidebarMobile from "../../../src/components/navigation-sidebar/NavigationSidebarMobile.vue";
import type { SidebarNavItem as NavItem } from "../../../src/components/navigation-sidebar/types";
import { makeSidebarState, mountInSidebar, type SidebarHarness } from "../../setup/sidebar";

/**
 * The drawer shell: header, nav, footer, and the scrim behind them. It owns one
 * behaviour of its own — Escape closes it — and otherwise just wires the three
 * mobile components to the shared state.
 */

async function render(
  { open = false, props = {}, slots = {}, harness = makeSidebarState() } = {},
): Promise<{ wrapper: Awaited<ReturnType<typeof mountInSidebar>>["wrapper"]
  harness: SidebarHarness }> {
  if (open) harness.state.isMobileOpen.value = true;
  const { wrapper } = await mountInSidebar(NavigationSidebarMobile, {
    props,
    slots,
    harness,
    attachTo: document.body,
  });
  return { wrapper, harness };
}

const press = (key: string) =>
  document.dispatchEvent(new KeyboardEvent("keydown", { key }));

describe("NavigationSidebarMobile", () => {
  it("renders the three mobile parts", async () => {
    const { wrapper } = await render();
    expect(wrapper.findComponent(SidebarMobileHeader).exists()).toBe(true);
    expect(wrapper.findComponent(SidebarMobileNav).exists()).toBe(true);
    expect(wrapper.findComponent(SidebarMobileFooter).exists()).toBe(true);
  });

  it("names the drawer for assistive tech", async () => {
    const { wrapper } = await render();
    expect(wrapper.find("aside").attributes("aria-label")).toBe("Main navigation");
  });

  describe("open state", () => {
    it("stays mounted while shut, marked closed", async () => {
      // The drawer slides; unmounting it would leave nothing to slide, and the
      // nav inside would rebuild its whole tree on every open.
      const { wrapper } = await render();
      expect(wrapper.find("aside").exists()).toBe(true);
      expect(wrapper.find("aside").classes()).not.toContain("sidebar-mobile--open");
    });

    it("marks itself open", async () => {
      const { wrapper } = await render({ open: true });
      expect(wrapper.find("aside").classes()).toContain("sidebar-mobile--open");
    });

    it("follows the state as it changes", async () => {
      const { wrapper, harness } = await render();
      harness.state.openMobile();
      await wrapper.vm.$nextTick();
      expect(wrapper.find("aside").classes()).toContain("sidebar-mobile--open");
    });
  });

  describe("the scrim", () => {
    it("appears only while open", async () => {
      const shut = await render();
      expect(shut.wrapper.find(".sidebar-mobile-overlay").exists()).toBe(false);

      const open = await render({ open: true });
      expect(open.wrapper.find(".sidebar-mobile-overlay").exists()).toBe(true);
    });

    it("closes the drawer when tapped", async () => {
      const { wrapper, harness } = await render({ open: true });
      await wrapper.find(".sidebar-mobile-overlay").trigger("click");
      expect(harness.state.isMobileOpen.value).toBe(false);
    });

    it("is hidden from assistive tech", async () => {
      // It is a tap target for sighted users and nothing else; the close button
      // in the header is the accessible route out.
      const { wrapper } = await render({ open: true });
      expect(wrapper.find(".sidebar-mobile-overlay").attributes("aria-hidden")).toBe("true");
    });
  });

  describe("Escape", () => {
    it("closes an open drawer", async () => {
      const { harness } = await render({ open: true });
      press("Escape");
      expect(harness.state.isMobileOpen.value).toBe(false);
    });

    it("does not even call close when the drawer is already shut", async () => {
      // Guarded on `isMobileOpen` rather than closing unconditionally: the
      // listener is on `document`, so every Escape anywhere in the app arrives
      // here, including ones a modal above the sidebar is handling.
      //
      // Asserted on the call, not on the resulting state — closing a shut
      // drawer is a no-op, so state alone cannot tell the guard from its
      // absence. The stub goes in before the mount because the component
      // destructures `closeMobile` in setup.
      const harness = makeSidebarState();
      const closeMobile = vi.fn();
      harness.state.closeMobile = closeMobile;

      await render({ harness });
      press("Escape");
      expect(closeMobile).not.toHaveBeenCalled();
    });

    it("calls close exactly once when it is open", async () => {
      const harness = makeSidebarState();
      const closeMobile = vi.fn();
      harness.state.closeMobile = closeMobile;
      harness.state.isMobileOpen.value = true;

      await render({ harness });
      press("Escape");
      expect(closeMobile).toHaveBeenCalledOnce();
    });

    it("ignores every other key", async () => {
      const { harness } = await render({ open: true });
      press("Enter");
      press("Esc");
      press("a");
      expect(harness.state.isMobileOpen.value).toBe(true);
    });

    it("stops listening once unmounted", async () => {
      // `useEventListener` owns the teardown. Without it a drawer from a
      // previous route would keep answering Escape for the rest of the session.
      const { wrapper, harness } = await render({ open: true });
      wrapper.unmount();
      press("Escape");
      expect(harness.state.isMobileOpen.value).toBe(true);
    });
  });

  describe("footer items and slots", () => {
    it("passes footerItems down to the footer", async () => {
      const items: NavItem[] = [{ id: "support", label: "Support", to: "/elsewhere" }];
      const { wrapper } = await render({ props: { footerItems: items } });
      expect(wrapper.findComponent(SidebarMobileFooter).props("items")).toEqual(items);
    });

    it("defaults them to empty", async () => {
      const { wrapper } = await render();
      expect(wrapper.findComponent(SidebarMobileFooter).props("items")).toEqual([]);
    });

    it("forwards #start and #end to the footer", async () => {
      const { wrapper } = await render({
        slots: { start: "<div class=\"user-menu\">U</div>", end: "<div class=\"theme\">T</div>" },
      });
      const footer = wrapper.findComponent(SidebarMobileFooter);
      expect(footer.find(".user-menu").exists()).toBe(true);
      expect(footer.find(".theme").exists()).toBe(true);
    });

    it("passes no slot the caller did not give", async () => {
      // Forwarding unconditionally would hand the footer an always-truthy slot
      // function, and its `v-if="$slots.start"` would draw an empty wrapper.
      const { wrapper } = await render();
      expect(wrapper.find(".sidebar-mobile-footer__slot").exists()).toBe(false);
    });
  });
});
