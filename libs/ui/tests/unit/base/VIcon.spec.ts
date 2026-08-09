import { Icon } from "@iconify/vue";
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import VIcon from "../../../src/components/base/VIcon.vue";

/** Iconify resolves icons over the network; the stub keeps that out of unit tests. */
const stubs = { Icon: true };

function iconProps(props: Record<string, unknown> = {}) {
  return mount(VIcon, { props, global: { stubs } }).findComponent(Icon).props();
}

describe("VIcon", () => {
  it("passes the icon id straight through", () => {
    expect(iconProps({ icon: "lucide:check" }).icon).toBe("lucide:check");
  });

  it("defaults to 24px square", () => {
    const props = iconProps({ icon: "lucide:check" });
    expect(props.width).toBe(24);
    expect(props.height).toBe(24);
  });

  it("accepts a numeric size", () => {
    expect(iconProps({ icon: "lucide:check", size: 16 }).width).toBe(16);
  });

  it("parses a string size into a number", () => {
    const props = iconProps({ icon: "lucide:check", size: "18" });
    expect(props.width).toBe(18);
    expect(props.height).toBe(18);
  });

  it("is hidden from assistive tech and unfocusable", () => {
    const w = mount(VIcon, { props: { icon: "lucide:check" }, global: { stubs } });
    expect(w.attributes("aria-hidden")).toBe("true");
    expect(w.attributes("focusable")).toBe("false");
  });

  describe("loading", () => {
    it("swaps the icon for a spinner", () => {
      expect(iconProps({ icon: "lucide:check", loading: true }).icon).toBe("lucide:loader-circle");
    });

    it("spins via a class, not an inline animation", () => {
      const w = mount(VIcon, { props: { icon: "lucide:check", loading: true }, global: { stubs } });
      expect(w.classes()).toContain("v-icon--spin");
      expect(w.attributes("style") ?? "").not.toContain("animation");
    });

    it("does not spin when idle", () => {
      const w = mount(VIcon, { props: { icon: "lucide:check" }, global: { stubs } });
      expect(w.classes()).not.toContain("v-icon--spin");
    });
  });

  describe("colour", () => {
    it("applies a CSS value as the colour", () => {
      const w = mount(VIcon, {
        props: { icon: "lucide:check", color: "var(--ui-primary)" },
        global: { stubs },
      });
      expect(w.attributes("style")).toContain("color: var(--ui-primary)");
    });

    it("inherits currentColor when no colour is given", () => {
      const w = mount(VIcon, { props: { icon: "lucide:check" }, global: { stubs } });
      expect(w.attributes("style")).toBeUndefined();
    });
  });
});
