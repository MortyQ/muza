import { describe, expect, it } from "vitest";
import { RouterLink } from "vue-router";

import VIcon from "../../../src/components/base/VIcon.vue";
import SidebarMenuFlyoutItem from "../../../src/components/navigation-sidebar/components/SidebarMenuFlyoutItem.vue";
import { makeSidebarState, mountInSidebar } from "../../setup/sidebar";

/**
 * A navigable row inside the collapsed sidebar's flyout. Its sibling
 * `SidebarMenuFlyoutParent` covers the rows that are not.
 *
 * Unlike `SidebarNavItem` it never toggles anything: a flyout is already the
 * expanded view of a branch, so every row here either navigates or is the label
 * of one that cannot.
 */

const item = (overrides = {}) => ({
  id: "images",
  label: "Images",
  to: "/catalog/media/images",
  level: 1,
  ...overrides,
});

async function render(overrides = {}, harness = makeSidebarState()) {
  const mounted = await mountInSidebar(SidebarMenuFlyoutItem, {
    props: { item: item(overrides) },
    harness,
  });
  return mounted;
}

describe("SidebarMenuFlyoutItem", () => {
  it("renders as a router-link", () => {
    // `v-if="item.to"`; the flyout only ever hands it an item that has one.
    return render().then(({ wrapper }) => {
      expect(wrapper.findComponent(RouterLink).exists()).toBe(true);
    });
  });

  it("renders nothing at all without a destination", async () => {
    const { wrapper } = await render({ to: undefined });
    expect(wrapper.find("a").exists()).toBe(false);
  });

  it("shows the label", async () => {
    expect((await render()).wrapper.find(".sidebar-flyout__item-label").text()).toBe("Images");
  });

  it("publishes its depth as a custom property", async () => {
    const { wrapper } = await render({ level: 2 });
    expect(wrapper.find("a").attributes("style")).toContain("--depth: 2");
  });

  describe("active state", () => {
    it("marks itself when it is the current route", async () => {
      const harness = makeSidebarState();
      harness.activePath.value = ["catalog", "media", "images"];
      const { wrapper } = await render({}, harness);

      expect(wrapper.find("a").attributes("aria-current")).toBe("page");
      expect(wrapper.find("a").classes()).toContain("sidebar-flyout__item--active");
    });

    it("does not when it is merely on the path to it", async () => {
      // `isActive`, not `isOnActivePath` — a flyout row is a leaf, and lighting
      // up every ancestor would highlight the whole column.
      const harness = makeSidebarState();
      harness.activePath.value = ["catalog", "media", "images"];
      const { wrapper } = await render({ id: "media" }, harness);

      expect(wrapper.find("a").attributes("aria-current")).toBeUndefined();
      expect(wrapper.find("a").classes()).not.toContain("sidebar-flyout__item--active");
    });

    it("carries no aria-current when nothing is active", async () => {
      const { wrapper } = await render();
      expect(wrapper.find("a").attributes("aria-current")).toBeUndefined();
    });
  });

  describe("clicking", () => {
    it("emits the item, so the flyout can close itself", async () => {
      const { wrapper } = await render();
      await wrapper.find("a").trigger("click");
      expect(wrapper.emitted("click")?.[0]?.[0]).toMatchObject({ id: "images" });
    });

    it("stays silent when disabled", async () => {
      const { wrapper } = await render({ disabled: true });
      await wrapper.find("a").trigger("click");
      expect(wrapper.emitted("click")).toBeUndefined();
    });

    it("still marks a disabled row", async () => {
      const { wrapper } = await render({ disabled: true });
      expect(wrapper.find("a").classes()).toContain("sidebar-flyout__item--disabled");
    });
  });

  describe("prefetch", () => {
    it("announces the resolved destination on hover", async () => {
      const { wrapper, prefetch } = await render();
      await wrapper.find("a").trigger("mouseenter");
      expect(prefetch).toHaveBeenCalledWith("/catalog/media/images");
    });

    it("stays quiet for a disabled row", async () => {
      const { wrapper, prefetch } = await render({ disabled: true });
      await wrapper.find("a").trigger("mouseenter");
      expect(prefetch).not.toHaveBeenCalled();
    });

    it("carries the persistent params the link will actually use", async () => {
      // Prefetching the bare path would warm a route the click then misses.
      const harness = makeSidebarState({ persistentQueryParams: ["brand"] });
      const { wrapper, prefetch } = await mountInSidebar(SidebarMenuFlyoutItem, {
        props: { item: item() },
        harness,
        route: "/?brand=acme",
      });
      await wrapper.find("a").trigger("mouseenter");
      expect(prefetch).toHaveBeenCalledWith({
        path: "/catalog/media/images",
        query: { brand: "acme" },
      });
    });
  });

  describe("icon and badge", () => {
    it("renders the icon at the flyout's size", async () => {
      const icon = (await render({ icon: "lucide:image" })).wrapper.findComponent(VIcon);
      expect(icon.props("icon")).toBe("lucide:image");
      expect(icon.props("size")).toBe(16);
    });

    it("renders no icon when the item has none", async () => {
      expect((await render()).wrapper.findComponent(VIcon).exists()).toBe(false);
    });

    it("shows a badge", async () => {
      const { wrapper } = await render({ badge: 3 });
      expect(wrapper.find(".sidebar-flyout__item-badge").text()).toBe("3");
    });

    it("omits it when unset", async () => {
      expect((await render()).wrapper.find(".sidebar-flyout__item-badge").exists()).toBe(false);
    });
  });
});
