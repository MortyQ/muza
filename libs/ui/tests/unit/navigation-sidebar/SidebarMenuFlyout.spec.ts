import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import SidebarMenuFlyout from "../../../src/components/navigation-sidebar/components/SidebarMenuFlyout.vue";
import SidebarMenuFlyoutItem from "../../../src/components/navigation-sidebar/components/SidebarMenuFlyoutItem.vue";
import SidebarMenuFlyoutParent from "../../../src/components/navigation-sidebar/components/SidebarMenuFlyoutParent.vue";
import { makeSidebarState, mountInSidebar } from "../../setup/sidebar";

/**
 * How a collapsed rail reaches a branch's children: hover the glyph, get the
 * whole subtree in a panel teleported to `<body>`.
 *
 * Two things here are deliberately not asserted. Position is computed from
 * `getBoundingClientRect`, which jsdom answers with zeroes — that belongs to the
 * browser project. And the open/close delays are real timers, so every case that
 * crosses one uses fake timers rather than waiting them out.
 *
 * `Teleport` is stubbed globally in `tests/setup/unit.ts`, so the panel stays
 * inline in the wrapper and is reached with `find`, not through `document`. What
 * the stub preserves is the *declaration* — see the teleport case below.
 */

const ITEM = {
  id: "catalog",
  label: "Catalog",
  children: [
    { id: "products", label: "Products", to: "/catalog/products" },
    {
      id: "media",
      label: "Media",
      children: [
        { id: "images", label: "Images", to: "/catalog/media/images" },
      ],
    },
  ],
};

type Wrapper = Awaited<ReturnType<typeof render>>["wrapper"];

const panel = (wrapper: Wrapper) => wrapper.find(".sidebar-flyout-portal");

async function render(item: Record<string, unknown> = ITEM, harness = makeSidebarState()) {
  return mountInSidebar(SidebarMenuFlyout, {
    props: { item },
    slots: { default: "<button class=\"trigger\">glyph</button>" },
    harness,
  });
}

/** Hover the trigger and let the 150ms open delay elapse. */
async function open(wrapper: Wrapper) {
  await wrapper.find(".sidebar-flyout-trigger").trigger("mouseenter");
  await vi.advanceTimersByTimeAsync(200);
  await wrapper.vm.$nextTick();
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("SidebarMenuFlyout", () => {
  it("renders the trigger slot", async () => {
    const { wrapper } = await render();
    expect(wrapper.find(".trigger").text()).toBe("glyph");
  });

  it("keeps the panel closed until hovered", async () => {
    const { wrapper } = await render();
    expect(panel(wrapper).exists()).toBe(false);
  });

  describe("opening", () => {
    it("opens on hover, after the delay", async () => {
      const { wrapper } = await render();
      await wrapper.find(".sidebar-flyout-trigger").trigger("mouseenter");
      // Not yet: the delay is what stops a panel flashing open under a cursor
      // that is merely crossing the rail on its way somewhere else.
      await vi.advanceTimersByTimeAsync(100);
      expect(panel(wrapper).exists()).toBe(false);

      await vi.advanceTimersByTimeAsync(100);
      await wrapper.vm.$nextTick();
      expect(panel(wrapper).exists()).toBe(true);
    });

    it("does not open if the cursor leaves before the delay is up", async () => {
      const { wrapper } = await render();
      await wrapper.find(".sidebar-flyout-trigger").trigger("mouseenter");
      await vi.advanceTimersByTimeAsync(100);
      await wrapper.find(".sidebar-flyout-trigger").trigger("mouseleave");
      await vi.advanceTimersByTimeAsync(500);
      await wrapper.vm.$nextTick();
      expect(panel(wrapper).exists()).toBe(false);
    });

    it("declares the panel teleported to the body", async () => {
      // The rail clips its overflow; a panel rendered in place would be cut off
      // at its edge. The stub keeps the content inline but preserves the target,
      // which is the part that would regress if someone dropped the Teleport.
      const { wrapper } = await render();
      await open(wrapper);
      const teleport = wrapper.find("teleport-stub");
      expect(teleport.exists()).toBe(true);
      expect(teleport.attributes("to")).toBe("body");
      expect(teleport.find(".sidebar-flyout-portal").exists()).toBe(true);
    });

    it("titles the panel with the branch's label", async () => {
      const { wrapper } = await render();
      await open(wrapper);
      expect(panel(wrapper).find(".sidebar-flyout__title").text()).toBe("Catalog");
    });

    it("stays shut for a branch with no children", async () => {
      const { wrapper } = await render({ id: "empty", label: "Empty", children: [] });
      await open(wrapper);
      expect(panel(wrapper).exists()).toBe(false);
    });
  });

  describe("closing", () => {
    it("closes when the cursor leaves", async () => {
      const { wrapper } = await render();
      await open(wrapper);

      await wrapper.find(".sidebar-flyout-trigger").trigger("mouseleave");
      await vi.advanceTimersByTimeAsync(200);
      await wrapper.vm.$nextTick();
      expect(panel(wrapper).exists()).toBe(false);
    });

    it("waits out a close delay, so the cursor can cross the gap", async () => {
      // Between the rail and the panel there is a physical gap. Closing on the
      // first `mouseleave` would make the menu unreachable.
      const { wrapper } = await render();
      await open(wrapper);

      await wrapper.find(".sidebar-flyout-trigger").trigger("mouseleave");
      await vi.advanceTimersByTimeAsync(50);
      await wrapper.vm.$nextTick();
      expect(panel(wrapper).exists()).toBe(true);
    });

    it("stays open when the cursor arrives on the panel itself", async () => {
      const { wrapper } = await render();
      await open(wrapper);

      await wrapper.find(".sidebar-flyout-trigger").trigger("mouseleave");
      await panel(wrapper).trigger("mouseenter");
      await vi.advanceTimersByTimeAsync(300);
      await wrapper.vm.$nextTick();
      expect(panel(wrapper).exists()).toBe(true);
    });

    it("closes when a link inside it is clicked", async () => {
      const { wrapper } = await render();
      await open(wrapper);

      wrapper.findComponent(SidebarMenuFlyoutItem).vm.$emit("click", { id: "products" });
      await wrapper.vm.$nextTick();
      expect(panel(wrapper).exists()).toBe(false);
    });

    it("stays open when a disabled link is clicked", async () => {
      const harness = makeSidebarState();
      const { wrapper } = await render({
        id: "catalog",
        label: "Catalog",
        children: [{ id: "products", label: "Products", to: "/x", disabled: true }],
      }, harness);
      await open(wrapper);

      wrapper.findComponent(SidebarMenuFlyoutItem)
        .vm.$emit("click", { id: "products", disabled: true });
      await wrapper.vm.$nextTick();
      expect(panel(wrapper).exists()).toBe(true);
    });

    it("closes the mobile drawer along with itself", async () => {
      const harness = makeSidebarState();
      harness.state.isMobileOpen.value = true;
      const { wrapper } = await render(ITEM, harness);
      await open(wrapper);

      wrapper.findComponent(SidebarMenuFlyoutItem).vm.$emit("click", { id: "products" });
      expect(harness.state.isMobileOpen.value).toBe(false);
    });
  });

  describe("the list it renders", () => {
    it("flattens the subtree rather than nesting it", async () => {
      // A flyout is already a disclosure; nesting a second accordion inside one
      // would need a third level of hover to reach a leaf.
      const { wrapper } = await render();
      await open(wrapper);
      expect(wrapper.findAllComponents(SidebarMenuFlyoutItem)).toHaveLength(2);
      expect(wrapper.findAllComponents(SidebarMenuFlyoutParent)).toHaveLength(1);
    });

    it("stamps each row with its depth, so the flat list still reads as a tree", async () => {
      const { wrapper } = await render();
      await open(wrapper);

      const rows = [
        ...wrapper.findAllComponents(SidebarMenuFlyoutItem),
        ...wrapper.findAllComponents(SidebarMenuFlyoutParent),
      ].map(c => c.props("item") as { id: string, level: number });

      expect(rows.find(r => r.id === "products")?.level).toBe(0);
      expect(rows.find(r => r.id === "media")?.level).toBe(0);
      expect(rows.find(r => r.id === "images")?.level).toBe(1);
    });

    it("sends a navigable row to the item component and the rest to the parent one", async () => {
      const { wrapper } = await render();
      await open(wrapper);

      expect(wrapper.findAllComponents(SidebarMenuFlyoutItem)
        .map(c => (c.props("item") as { id: string }).id)).toEqual(["products", "images"]);
      expect(wrapper.findAllComponents(SidebarMenuFlyoutParent)
        .map(c => (c.props("item") as { id: string }).id)).toEqual(["media"]);
    });

    it("keeps declaration order, parent before its children", async () => {
      const { wrapper } = await render();
      await open(wrapper);
      const ids = panel(wrapper).findAll(".sidebar-flyout__item")
        .map(el => el.find(".sidebar-flyout__item-label").text());
      expect(ids).toEqual(["Products", "Media", "Images"]);
    });

    it("renders a hover bridge, so the gap is crossable", async () => {
      const { wrapper } = await render();
      await open(wrapper);
      expect(panel(wrapper).find(".sidebar-flyout-bridge").exists()).toBe(true);
    });
  });
});
