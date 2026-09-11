import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import VScrollPanel from "../../../src/components/layout/VScrollPanel.vue";

const COPY = ".v-scroll-panel__copy-btn";

describe("VScrollPanel", () => {
  it("renders its slot", () => {
    const w = mount(VScrollPanel, { slots: { default: "<p class='body'>Content</p>" } });
    expect(w.find(".body").text()).toBe("Content");
  });

  it("carries its own class", () => {
    expect(mount(VScrollPanel).classes()).toContain("v-scroll-panel");
  });

  it("sets no inline style without maxHeight", () => {
    expect(mount(VScrollPanel).attributes("style")).toBeUndefined();
  });

  it.each(["300px", "50vh", "clamp(200px, 40vh, 600px)"])(
    "hands maxHeight %s to CSS as a variable",
    (maxHeight) => {
      const w = mount(VScrollPanel, { props: { maxHeight } });
      const style = w.attributes("style") ?? "";
      expect(style).toContain(`--v-scroll-panel-max-height: ${maxHeight}`);
      // Not a plain `max-height:` declaration — the custom property's own name
      // ends in "max-height", so the check needs a declaration boundary.
      expect(style).not.toMatch(/(^|;)\s*max-height:/);
    },
  );

  /**
   * `useClipboard` reports `isSupported: false` without `navigator.clipboard`,
   * which jsdom does not ship — so the button never renders and every case here
   * would pass vacuously.
   *
   * It has to be defined on the real `window.navigator`, not swapped in with
   * `vi.stubGlobal`: @vueuse captures `defaultNavigator = window.navigator` at
   * module-evaluation time, so a replacement global arrives too late to be seen.
   */
  describe("the copy button", () => {
    let writeText: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      writeText = vi.fn(() => Promise.resolve());
      Object.defineProperty(window.navigator, "clipboard", {
        value: { writeText },
        configurable: true,
      });
      // And the permission, which is a separate gate: @vueuse only reaches for
      // `clipboard.writeText` when `clipboard-write` is granted or promptable,
      // and falls back to `document.execCommand` — which jsdom does not
      // implement — otherwise.
      Object.defineProperty(window.navigator, "permissions", {
        // A real `PermissionStatus` is an EventTarget, and @vueuse subscribes to
        // it — a bare `{ state }` object throws on `addEventListener` instead.
        value: {
          query: () => Promise.resolve(
            Object.assign(new EventTarget(), { state: "granted", onchange: null }),
          ),
        },
        configurable: true,
      });
    });

    afterEach(() => {
      Reflect.deleteProperty(window.navigator, "clipboard");
      Reflect.deleteProperty(window.navigator, "permissions");
    });

    /**
     * Mount, then let the permission query resolve. @vueuse reads the state
     * asynchronously, and a click in the same tick still sees it as unresolved —
     * which sends `copy()` down the `document.execCommand` fallback jsdom does
     * not implement.
     */
    const ready = async (props: Record<string, unknown>) => {
      const w = mount(VScrollPanel, { props });
      await new Promise(resolve => setTimeout(resolve, 0));
      return w;
    };

    it("is absent without copyText, so existing callers see no change", () => {
      expect(mount(VScrollPanel).find(COPY).exists()).toBe(false);
    });

    it("appears once copyText is given", () => {
      expect(mount(VScrollPanel, { props: { copyText: "abc" } }).find(COPY).exists()).toBe(true);
    });

    it("appears for an empty string too", () => {
      // `undefined` is "no copy button"; `""` is a copy button for empty
      // content, which is a thing a caller can legitimately mean.
      expect(mount(VScrollPanel, { props: { copyText: "" } }).find(COPY).exists()).toBe(true);
    });

    it("writes the text to the clipboard on click", async () => {
      const w = await ready({ copyText: "sku-1234" });
      await w.find(COPY).trigger("click");
      expect(writeText).toHaveBeenCalledWith("sku-1234");
    });

    it("labels itself from copyLabel", () => {
      const w = mount(VScrollPanel, { props: { copyText: "x", copyLabel: "Copy the payload" } });
      expect(w.find(COPY).attributes("aria-label")).toBe("Copy the payload");
    });

    it("falls back to a sensible label", () => {
      const w = mount(VScrollPanel, { props: { copyText: "x" } });
      expect(w.find(COPY).attributes("aria-label")).toBe("Copy to clipboard");
    });

    it("announces the copy and marks itself, then says so in the label", async () => {
      const w = await ready({ copyText: "x" });
      await w.find(COPY).trigger("click");
      await w.vm.$nextTick();
      expect(w.find(COPY).classes()).toContain("v-scroll-panel__copy-btn--copied");
      expect(w.find(COPY).attributes("aria-label")).toBe("Copied");
    });

    it("keeps both glyphs mounted so they can cross-fade", () => {
      // Swapping one for the other with `v-if` would pop, and the button would
      // resize for a frame.
      const w = mount(VScrollPanel, { props: { copyText: "x" } });
      expect(w.findAll(".v-scroll-panel__copy-glyph")).toHaveLength(2);
    });

    it("still renders the slot alongside the button", () => {
      const w = mount(VScrollPanel, {
        props: { copyText: "x" },
        slots: { default: "<p class='body'>Content</p>" },
      });
      expect(w.find(".body").text()).toBe("Content");
    });

    it("stays out of the layout, so it overlays the first line", () => {
      // Zero-height sticky wrapper: an absolutely positioned button would scroll
      // away with the content, since this element *is* the scroll container.
      const w = mount(VScrollPanel, { props: { copyText: "x" } });
      expect(w.find(".v-scroll-panel__copy").exists()).toBe(true);
    });
  });
});
