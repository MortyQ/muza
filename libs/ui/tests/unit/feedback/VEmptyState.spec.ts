import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import VEmptyState from "../../../src/components/feedback/VEmptyState.vue";

describe("VEmptyState", () => {
  it("renders the line", () => {
    const w = mount(VEmptyState, { props: { text: "No orders" } });
    expect(w.find(".v-empty-state__text").text()).toBe("No orders");
  });

  it("prefers the default slot over text", () => {
    const w = mount(VEmptyState, { props: { text: "No orders" }, slots: { default: "<b>Nothing</b>" } });
    expect(w.find(".v-empty-state__text b").text()).toBe("Nothing");
  });

  it("renders the action only when one is given", () => {
    expect(mount(VEmptyState, { props: { text: "x" } }).find(".v-empty-state__action").exists()).toBe(false);

    const w = mount(VEmptyState, {
      props: { text: "x" },
      slots: { action: "<button class='reset'>Reset</button>" },
    });
    expect(w.find(".v-empty-state__action .reset").exists()).toBe(true);
  });

  it.each(["center", "start"] as const)("aligns %s", (align) => {
    expect(mount(VEmptyState, { props: { align } }).classes()).toContain(`v-empty-state--${align}`);
  });

  it("centres by default", () => {
    expect(mount(VEmptyState).classes()).toContain("v-empty-state--center");
  });
});
