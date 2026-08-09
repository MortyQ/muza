import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";

import VIcon from "../../../../src/components/base/VIcon.vue";
import TableExpandAdditionalHeadersButton
  from "../../../../src/components/table/components/TableExpandAdditionalHeadersButton.vue";
import TableFullscreenToggle
  from "../../../../src/components/table/components/TableFullscreenToggle.vue";
import TablePinButton from "../../../../src/components/table/components/TablePinButton.vue";

/**
 * Three icon buttons whose whole job is an accessible name that changes with
 * state, and — for the pin — not letting its click reach the row underneath.
 *
 * Icon names are read off `VIcon`'s props rather than the markup: Iconify
 * renders an empty `<svg>` until it has fetched the glyph, so the DOM says
 * nothing about which icon was asked for.
 */

const iconName = (w: ReturnType<typeof mount>) =>
  w.findComponent(VIcon).props("icon");

describe("TableFullscreenToggle", () => {
  const toggle = (isFullscreen: boolean) =>
    mount(TableFullscreenToggle, { props: { isFullscreen } });

  it("offers to expand while collapsed", () => {
    const w = toggle(false);
    expect(w.attributes("aria-label")).toBe("Expand table");
    expect(w.attributes("title")).toBe("Expand table");
    expect(iconName(w)).toBe("lucide:maximize-2");
  });

  it("offers to collapse while expanded", () => {
    const w = toggle(true);
    expect(w.attributes("aria-label")).toBe("Collapse table");
    expect(iconName(w)).toBe("lucide:minimize-2");
  });

  it("marks itself active while expanded", () => {
    expect(toggle(true).classes()).toContain("v-table-fullscreen-toggle--active");
    expect(toggle(false).classes()).not.toContain("v-table-fullscreen-toggle--active");
  });

  it("is a plain button, so it cannot submit a surrounding form", () => {
    expect(toggle(false).attributes("type")).toBe("button");
  });

  it("emits toggle on click", async () => {
    const w = toggle(false);
    await w.trigger("click");
    expect(w.emitted("toggle")).toHaveLength(1);
  });

  it("updates its label when the state changes", async () => {
    const w = toggle(false);
    await w.setProps({ isFullscreen: true });
    expect(w.attributes("aria-label")).toBe("Collapse table");
  });
});

describe("TablePinButton", () => {
  const pin = (props: { pinned: boolean, label: string }) =>
    mount(TablePinButton, { props });

  it("names what it will pin", () => {
    expect(pin({ pinned: false, label: "Revenue" }).attributes("aria-label"))
      .toBe("Pin Revenue");
  });

  it("names what it will unpin", () => {
    expect(pin({ pinned: true, label: "Revenue" }).attributes("aria-label"))
      .toBe("Unpin Revenue");
  });

  it("reports its state to assistive tech", () => {
    expect(pin({ pinned: true, label: "row" }).attributes("aria-pressed")).toBe("true");
    expect(pin({ pinned: false, label: "row" }).attributes("aria-pressed")).toBe("false");
  });

  it("marks itself active while pinned", () => {
    expect(pin({ pinned: true, label: "row" }).classes())
      .toContain("v-table-pin-button--active");
  });

  it("shows a pin when unpinned and a clear affordance when pinned", () => {
    // `x` rather than `pin-off`: at 13px the diagonal slash turns to mush.
    expect(iconName(pin({ pinned: false, label: "row" }))).toBe("lucide:pin");
    expect(iconName(pin({ pinned: true, label: "row" }))).toBe("lucide:x");
  });

  it("emits toggle on click", async () => {
    const w = pin({ pinned: false, label: "row" });
    await w.trigger("click");
    expect(w.emitted("toggle")).toHaveLength(1);
  });

  it("keeps its click away from the row and the sort handler", async () => {
    const onRowClick = vi.fn();
    const w = mount({
      components: { TablePinButton },
      setup: () => ({ onRowClick }),
      template: "<div @click=\"onRowClick\">"
        + "<TablePinButton :pinned=\"false\" label=\"row\" /></div>",
    });

    await w.find("button").trigger("click");
    expect(onRowClick).not.toHaveBeenCalled();
    expect(w.findComponent(TablePinButton).emitted("toggle")).toHaveLength(1);
  });

  it("keeps its mousedown away too, so a resize drag cannot start on it", async () => {
    const onMouseDown = vi.fn();
    const w = mount({
      components: { TablePinButton },
      setup: () => ({ onMouseDown }),
      template: "<div @mousedown=\"onMouseDown\">"
        + "<TablePinButton :pinned=\"false\" label=\"row\" /></div>",
    });

    await w.find("button").trigger("mousedown");
    expect(onMouseDown).not.toHaveBeenCalled();
  });
});

describe("TableExpandAdditionalHeadersButton", () => {
  const button = (isExpanded: boolean) =>
    mount(TableExpandAdditionalHeadersButton, { props: { isExpanded } });

  it("marks itself expanded", () => {
    expect(button(true).classes()).toContain("is-expanded");
    expect(button(false).classes()).not.toContain("is-expanded");
  });

  it("keeps the same chevron in both states, rotating it in CSS", () => {
    expect(iconName(button(false))).toBe("lucide:chevron-right");
    expect(iconName(button(true))).toBe("lucide:chevron-right");
  });

  it("emits click", async () => {
    const w = button(false);
    await w.trigger("click");
    expect(w.emitted("click")).toHaveLength(1);
  });

  it("stops the click from reaching its container", async () => {
    const onOuter = vi.fn();
    const w = mount({
      components: { TableExpandAdditionalHeadersButton },
      setup: () => ({ onOuter }),
      template: "<div @click=\"onOuter\">"
        + "<TableExpandAdditionalHeadersButton :is-expanded=\"false\" /></div>",
    });

    await w.find("button").trigger("click");
    expect(onOuter).not.toHaveBeenCalled();
  });
});
