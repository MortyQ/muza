import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";

import VTooltip from "../../../src/components/overlay/VTooltip.vue";

afterEach(() => {
  vi.useRealTimers();
});

function tooltip(props: Record<string, unknown> = {}, slots: Record<string, string> = {}) {
  return mount(VTooltip, {
    props: { text: "Helpful hint", ...props },
    slots: { default: "<button class='trigger'>Hover me</button>", ...slots },
  });
}

const popper = (w: ReturnType<typeof tooltip>) => w.find(".v-tooltip__popper");

/** Show and let the open delay elapse. */
async function reveal(w: ReturnType<typeof tooltip>, event = "mouseenter", ms = 300) {
  await w.trigger(event);
  vi.advanceTimersByTime(ms);
  await w.vm.$nextTick();
}

describe("VTooltip", () => {
  it("renders its trigger", () => {
    expect(tooltip().find(".trigger").text()).toBe("Hover me");
  });

  it("stays hidden until hovered", () => {
    expect(popper(tooltip()).exists()).toBe(false);
  });

  describe("delay", () => {
    it("waits the default 300ms before appearing", async () => {
      vi.useFakeTimers();
      const w = tooltip();

      await w.trigger("mouseenter");
      vi.advanceTimersByTime(299);
      await w.vm.$nextTick();
      expect(popper(w).exists()).toBe(false);

      vi.advanceTimersByTime(1);
      await w.vm.$nextTick();
      expect(popper(w).exists()).toBe(true);
    });

    it("honours a custom delay", async () => {
      vi.useFakeTimers();
      const w = tooltip({ delay: 50 });
      await reveal(w, "mouseenter", 50);
      expect(popper(w).exists()).toBe(true);
    });

    it("cancels a pending reveal when the pointer leaves first", async () => {
      // Without this, sweeping the cursor across a toolbar pops every tooltip
      // it passed over, one after another.
      vi.useFakeTimers();
      const w = tooltip();

      await w.trigger("mouseenter");
      vi.advanceTimersByTime(150);
      await w.trigger("mouseleave");
      vi.advanceTimersByTime(500);
      await w.vm.$nextTick();

      expect(popper(w).exists()).toBe(false);
    });
  });

  describe("hiding", () => {
    it("hides on mouseleave", async () => {
      vi.useFakeTimers();
      const w = tooltip();
      await reveal(w);

      await w.trigger("mouseleave");
      await w.vm.$nextTick();
      expect(popper(w).exists()).toBe(false);
    });

    it("hides on blur", async () => {
      vi.useFakeTimers();
      const w = tooltip();
      await reveal(w, "focus");
      expect(popper(w).exists()).toBe(true);

      await w.trigger("blur");
      await w.vm.$nextTick();
      expect(popper(w).exists()).toBe(false);
    });
  });

  describe("keyboard reachability", () => {
    it("opens on focus, so the tooltip is not mouse-only", async () => {
      vi.useFakeTimers();
      const w = tooltip();
      await reveal(w, "focus");
      expect(popper(w).exists()).toBe(true);
    });
  });

  describe("content", () => {
    it("renders the text", async () => {
      vi.useFakeTimers();
      const w = tooltip();
      await reveal(w);
      expect(popper(w).text()).toBe("Helpful hint");
    });

    it("escapes markup by default", async () => {
      vi.useFakeTimers();
      const w = tooltip({ text: "<b>bold</b>" });
      await reveal(w);
      expect(popper(w).find("b").exists()).toBe(false);
      expect(popper(w).text()).toBe("<b>bold</b>");
    });

    it("renders markup only when explicitly allowed", async () => {
      vi.useFakeTimers();
      const w = tooltip({ text: "<b>bold</b>", allowHtml: true });
      await reveal(w);
      expect(popper(w).find("b").exists()).toBe(true);
    });

    it("never opens with empty text", async () => {
      vi.useFakeTimers();
      const w = tooltip({ text: "" });
      await reveal(w);
      expect(popper(w).exists()).toBe(false);
    });

    it("takes a custom class on the body", async () => {
      vi.useFakeTimers();
      const w = tooltip({ tooltipClass: "wide" });
      await reveal(w);
      expect(w.find(".v-tooltip__body").classes()).toContain("wide");
    });
  });

  describe("disabled", () => {
    it("never opens", async () => {
      vi.useFakeTimers();
      const w = tooltip({ disabled: true });
      await reveal(w);
      expect(popper(w).exists()).toBe(false);
    });
  });

  it("takes a wrapper class", () => {
    expect(tooltip({ wrapperClass: "inline" }).classes()).toContain("inline");
  });

  it("positions through inline style, since the popper is teleported", async () => {
    // jsdom reports every rect as zero, so the numbers are meaningless here —
    // what matters is that positioning happens at all. The real geometry is
    // covered in the browser project.
    vi.useFakeTimers();
    const w = tooltip();
    await reveal(w);
    expect(popper(w).attributes("style")).toContain("top");
  });
});
