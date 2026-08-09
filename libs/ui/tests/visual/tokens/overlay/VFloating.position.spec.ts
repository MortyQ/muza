import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-vue";

import VFloating from "../../../../src/components/overlay/VFloating.vue";
import { applyTheme } from "../../../setup/theme";

/**
 * Placement is computed from getBoundingClientRect and the viewport, both of
 * which are zero in jsdom — so all of this only means anything in a real
 * engine. VFloating's props, items and hover timing live in the unit project.
 */

const ITEMS = [
  { label: "Rename", value: "rename" },
  { label: "Duplicate", value: "duplicate" },
];

interface Placed {
  host: HTMLElement
  trigger: DOMRect
  content: DOMRect
}

async function place(
  placement: string,
  position: Partial<Record<"top" | "left" | "right" | "bottom", string>>,
): Promise<Placed> {
  await applyTheme("light");

  const host = document.createElement("div");
  host.style.position = "fixed";
  Object.assign(host.style, position);
  document.body.appendChild(host);

  const screen = render(VFloating, {
    props: { items: ITEMS, placement, teleport: false },
    slots: { trigger: "<button style='width:120px;height:32px'>Open</button>" },
  });
  host.append(...Array.from(screen.container.childNodes));

  const triggerEl = host.querySelector(".v-floating-trigger") as HTMLElement;
  triggerEl.click();
  await new Promise(resolve => requestAnimationFrame(() => resolve(null)));
  await new Promise(resolve => setTimeout(resolve, 50));

  const contentEl = host.querySelector(".v-floating-content") as HTMLElement;
  return {
    host,
    trigger: triggerEl.getBoundingClientRect(),
    content: contentEl.getBoundingClientRect(),
  };
}

describe("VFloating placement", () => {
  it("bottom-* sits below the trigger", async () => {
    const { trigger, content } = await place("bottom-left", { top: "100px", left: "100px" });
    expect(content.top).toBeGreaterThanOrEqual(trigger.bottom - 1);
  });

  it("top-* sits above the trigger", async () => {
    const { trigger, content } = await place("top-left", { top: "500px", left: "100px" });
    expect(content.bottom).toBeLessThanOrEqual(trigger.top + 1);
  });

  it("bottom-left aligns to the trigger's left edge", async () => {
    const { trigger, content } = await place("bottom-left", { top: "100px", left: "200px" });
    expect(Math.abs(content.left - trigger.left)).toBeLessThanOrEqual(2);
  });

  it("bottom-right aligns to the trigger's right edge", async () => {
    const { trigger, content } = await place("bottom-right", { top: "100px", left: "200px" });
    expect(Math.abs(content.right - trigger.right)).toBeLessThanOrEqual(2);
  });

  /**
   * VFloating anchors to the trigger and stops there — it has no viewport
   * clamping, and no flip: the source contains no reference to innerWidth or
   * innerHeight at all. Near an edge the panel therefore runs off the page.
   * VTooltip, by contrast, does pick an optimal placement and pads the edges.
   *
   * These two pin the behaviour as it stands so the gap is visible and a fix
   * cannot land unnoticed. Whoever adds clamping should invert them.
   */
  it("overflows the right edge rather than shifting back (known gap)", async () => {
    const { content } = await place("bottom-left", { top: "100px", right: "4px" });
    expect(content.right).toBeGreaterThan(window.innerWidth);
  });

  it("overflows the bottom edge rather than flipping above (known gap)", async () => {
    const { content } = await place("bottom-left", { bottom: "4px", left: "100px" });
    expect(content.bottom).toBeGreaterThan(window.innerHeight);
  });

  it("renders with a real size once open", async () => {
    // A zero box would make every other assertion here vacuously true.
    const { content } = await place("bottom-left", { top: "100px", left: "100px" });
    expect(content.width).toBeGreaterThan(0);
    expect(content.height).toBeGreaterThan(0);
  });
});

describe("VFloating click-outside", () => {
  it("closes when the click lands elsewhere on the page", async () => {
    const { host } = await place("bottom-left", { top: "100px", left: "100px" });
    expect(host.querySelector(".v-floating-content")).not.toBeNull();

    document.body.click();
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(host.querySelector(".v-floating-content")).toBeNull();
  });

  it("stays open when the click lands inside the panel", async () => {
    const { host } = await place("bottom-left", { top: "100px", left: "100px" });
    (host.querySelector(".v-floating-content") as HTMLElement).click();
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(host.querySelector(".v-floating-content")).not.toBeNull();
  });
});
