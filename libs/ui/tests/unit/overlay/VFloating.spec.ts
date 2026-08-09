import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";

import VFloating from "../../../src/components/overlay/VFloating.vue";

const ITEMS = [
  { label: "Rename", value: "rename", icon: "lucide:pencil" },
  { label: "Duplicate", value: "duplicate" },
  { label: "Delete", value: "delete", disabled: true },
];

const stubs = { Icon: true };

function floating(props: Record<string, unknown> = {}, slots: Record<string, string> = {}) {
  return mount(VFloating, {
    props: { items: ITEMS, teleport: false, ...props },
    slots: { trigger: "<button class='trig'>Open</button>", ...slots },
    global: { stubs },
  });
}

const trigger = (w: ReturnType<typeof floating>) => w.find(".v-floating-trigger");
const content = (w: ReturnType<typeof floating>) => w.find(".v-floating-content");
const options = (w: ReturnType<typeof floating>) => w.findAll(".v-floating-item");

async function open(w: ReturnType<typeof floating>) {
  await trigger(w).trigger("click");
  await w.vm.$nextTick();
  return w;
}

describe("VFloating", () => {
  it("renders the trigger slot", () => {
    expect(floating().find(".trig").text()).toBe("Open");
  });

  it("starts closed", () => {
    expect(content(floating()).exists()).toBe(false);
  });

  it("opens and closes on the trigger", async () => {
    const w = await open(floating());
    expect(content(w).exists()).toBe(true);

    await trigger(w).trigger("click");
    await w.vm.$nextTick();
    expect(content(w).exists()).toBe(false);
  });

  it("does not open when disabled", async () => {
    const w = await open(floating({ disabled: true }));
    expect(content(w).exists()).toBe(false);
  });

  describe("items", () => {
    it("renders one option per item", async () => {
      const w = await open(floating());
      expect(options(w).map(o => o.text())).toEqual(["Rename", "Duplicate", "Delete"]);
    });

    it("marks itself a listbox of options", async () => {
      const w = await open(floating());
      expect(content(w).attributes("role")).toBe("listbox");
      expect(options(w)[0].attributes("role")).toBe("option");
    });

    it("emits the value of the chosen item", async () => {
      const w = await open(floating());
      await options(w)[0].trigger("click");
      expect(w.emitted("select")?.[0]).toEqual(["rename"]);
    });

    it("closes after a selection by default", async () => {
      const w = await open(floating());
      await options(w)[0].trigger("click");
      await w.vm.$nextTick();
      expect(content(w).exists()).toBe(false);
    });

    it("stays open when closeOnSelect is off", async () => {
      const w = await open(floating({ closeOnSelect: false }));
      await options(w)[0].trigger("click");
      await w.vm.$nextTick();
      expect(content(w).exists()).toBe(true);
    });

    it("ignores a disabled item", async () => {
      const w = await open(floating());
      await options(w)[2].trigger("click");
      expect(w.emitted("select")).toBeUndefined();
    });

    it("renders an icon only for items that declare one", async () => {
      const w = await open(floating());
      expect(w.findAll(".v-floating-item-icon")).toHaveLength(1);
    });
  });

  describe("dialog mode", () => {
    it("renders slotted content as a dialog rather than a listbox", async () => {
      const w = await open(floating(
        { items: undefined },
        { content: "<p class='panel'>Anything</p>" },
      ));
      expect(w.find(".panel").exists()).toBe(true);
      expect(content(w).attributes("role")).toBe("dialog");
    });
  });

  describe("hover", () => {
    /**
     * Hover opening is gated on `(hover: hover) and (pointer: fine)`, and the
     * global jsdom stub answers false to every query — so without this the
     * whole group would pass vacuously by never opening at all.
     */
    function asHoverCapable() {
      vi.stubGlobal("matchMedia", (query: string) => ({
        matches: query.includes("hover"),
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }));
    }

    it("does not open on hover by default", async () => {
      asHoverCapable();
      const w = floating();
      await trigger(w).trigger("pointerenter");
      await w.vm.$nextTick();
      expect(content(w).exists()).toBe(false);
    });

    it("opens after the hover delay when enabled", async () => {
      asHoverCapable();
      vi.useFakeTimers();
      try {
        const w = floating({ openOnHover: true, hoverDelay: 100 });
        await trigger(w).trigger("pointerenter");

        vi.advanceTimersByTime(99);
        await w.vm.$nextTick();
        expect(content(w).exists()).toBe(false);

        vi.advanceTimersByTime(1);
        await w.vm.$nextTick();
        expect(content(w).exists()).toBe(true);
      }
      finally {
        vi.useRealTimers();
      }
    });

    it("cancels the pending open when the pointer leaves first", async () => {
      asHoverCapable();
      vi.useFakeTimers();
      try {
        const w = floating({ openOnHover: true, hoverDelay: 100 });
        await trigger(w).trigger("pointerenter");
        vi.advanceTimersByTime(50);
        await trigger(w).trigger("pointerleave");
        vi.advanceTimersByTime(500);
        await w.vm.$nextTick();

        expect(content(w).exists()).toBe(false);
      }
      finally {
        vi.useRealTimers();
      }
    });

    it("keeps click-to-toggle working alongside hover", async () => {
      asHoverCapable();
      const w = await open(floating({ openOnHover: true }));
      expect(content(w).exists()).toBe(true);
    });
  });

  it("emits nothing but select — opening is internal state, not an event", () => {
    const w = floating();
    expect(Object.keys(w.emitted())).toEqual([]);
  });
});
