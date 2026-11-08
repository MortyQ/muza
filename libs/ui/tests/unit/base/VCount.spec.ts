import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import VCount from "../../../src/components/base/VCount.vue";

/** The unit setup answers `false` to every media query; roll needs a yes. */
function allowMotion(allowed: boolean): void {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query === "(prefers-reduced-motion: no-preference)" ? allowed : false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }));
}

const realMatchMedia = window.matchMedia;

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.stubGlobal("matchMedia", realMatchMedia);
});

describe("VCount", () => {
  it("paints the value as plain text, with no motion on first paint", () => {
    allowMotion(true);
    const w = mount(VCount, { props: { value: "$1,234.00" } });
    expect(w.text()).toBe("$1,234.00");
    expect(w.find(".v-count__column").exists()).toBe(false);
  });

  it("rolls only the digits that changed, last digit first", async () => {
    allowMotion(true);
    const w = mount(VCount, { props: { value: "$1,234" } });
    await w.setProps({ value: "$1,299" });

    const columns = w.findAll(".v-count__column");
    expect(columns).toHaveLength(2);
    // Rightmost column starts first; the one to its left 30ms later.
    expect(columns[1].attributes("style")).toContain("--v-count-delay: 0ms");
    expect(columns[0].attributes("style")).toContain("--v-count-delay: 30ms");
    expect(w.findAll(".v-count__still").map(s => s.text()).join("")).toBe("$1,2");
  });

  it("rolls up toward a larger digit and down toward a smaller one", async () => {
    allowMotion(true);
    const w = mount(VCount, { props: { value: "15" } });
    await w.setProps({ value: "61" });

    const reels = w.findAll(".v-count__reel");
    expect(reels[0].classes()).toContain("v-count__reel--up");
    expect(reels[1].classes()).toContain("v-count__reel--down");
    // Up: old face on top, new below. Down: the reverse.
    expect(reels[0].findAll(".v-count__face").map(f => f.text())).toEqual(["1", "6"]);
    expect(reels[1].findAll(".v-count__face").map(f => f.text())).toEqual(["1", "5"]);
  });

  it("never rolls a separator or a currency symbol", async () => {
    allowMotion(true);
    const w = mount(VCount, { props: { value: "$9.50" } });
    await w.setProps({ value: "€9,51" });
    expect(w.findAll(".v-count__column")).toHaveLength(1);
  });

  it("reads the value once to assistive technology while rolling", async () => {
    allowMotion(true);
    const w = mount(VCount, { props: { value: "10" } });
    await w.setProps({ value: "11" });
    expect(w.find(".v-count__sr").text()).toBe("11");
    expect(w.find(".v-count__glyphs").attributes("aria-hidden")).toBe("true");
  });

  it("settles back to plain text equal to the value", async () => {
    allowMotion(true);
    const w = mount(VCount, { props: { value: "$1,234" } });
    await w.setProps({ value: "$1,299" });
    vi.advanceTimersByTime(450 + 30);
    await w.vm.$nextTick();
    expect(w.find(".v-count__column").exists()).toBe(false);
    expect(w.element.textContent?.trim()).toBe("$1,299");
  });

  it("does not roll under reduced motion", async () => {
    allowMotion(false);
    const w = mount(VCount, { props: { value: "10" } });
    await w.setProps({ value: "11" });
    expect(w.find(".v-count__column").exists()).toBe(false);
    expect(w.text()).toBe("11");
  });

  it("does not roll when nothing but non-digits changed", async () => {
    allowMotion(true);
    const w = mount(VCount, { props: { value: "$10" } });
    await w.setProps({ value: "€10" });
    expect(w.find(".v-count__glyphs").exists()).toBe(false);
    expect(w.text()).toBe("€10");
  });

  it("an interrupted roll restarts from the value it was heading to", async () => {
    allowMotion(true);
    const w = mount(VCount, { props: { value: "10" } });
    await w.setProps({ value: "11" });
    await w.setProps({ value: "12" });
    const faces = w.findAll(".v-count__face").map(f => f.text());
    expect(faces).toEqual(["1", "2"]);

    vi.advanceTimersByTime(450);
    await w.vm.$nextTick();
    expect(w.element.textContent?.trim()).toBe("12");
  });
});
