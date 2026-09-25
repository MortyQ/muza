import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import VIcon from "../../../src/components/base/VIcon.vue";
import VThemeSwitcher, { type ThemeOption } from "../../../src/components/base/VThemeSwitcher.vue";

const THEMES: ThemeOption[] = [
  { value: "light", label: "Light", icon: "lucide:sun" },
  { value: "dark", label: "Dark", icon: "lucide:moon" },
  { value: "auto", label: "Auto", icon: "lucide:monitor" },
];

const stubs = { Icon: true };

function switcher(props: Record<string, unknown>) {
  return mount(VThemeSwitcher, {
    props: { themes: THEMES, ...props },
    global: { stubs },
  });
}

/**
 * The template's root-level comments make the component multi-root, so
 * `wrapper.element` is a fragment and `classes()` on it is empty. Reach for the
 * rendered root through a selector instead of the wrapper.
 */
const root = (w: ReturnType<typeof switcher>) => w.find(".v-theme-switcher");

describe("VThemeSwitcher", () => {
  it("carries no size modifier and a 15px icon when size is unset", () => {
    // Unset is the chrome's natural 30px — the height every other control in
    // a toolbar row stands at. `md` is an explicit 32px override, not the default.
    const w = switcher({ modelValue: "light" });
    expect(root(w).classes().some(c => /^v-theme-switcher--(sm|md|lg)$/.test(c))).toBe(false);
    expect(w.findComponent(VIcon).props().size).toBe(15);
  });

  it("adds the modifier for an explicit size", () => {
    expect(root(switcher({ modelValue: "light", size: "sm" })).classes())
      .toContain("v-theme-switcher--sm");
  });

  describe("cycle variant", () => {
    it("renders a single button", () => {
      const w = switcher({ modelValue: "light" });
      expect(w.findAll("button")).toHaveLength(1);
      expect(root(w).attributes("type")).toBe("button");
      expect(root(w).classes()).toContain("v-theme-switcher--cycle");
    });

    it("advances to the next theme on click", async () => {
      const w = switcher({ modelValue: "light" });
      await root(w).trigger("click");
      expect(w.emitted("update:modelValue")?.[0]).toEqual(["dark"]);
    });

    it("wraps around from the last theme to the first", async () => {
      const w = switcher({ modelValue: "auto" });
      await root(w).trigger("click");
      expect(w.emitted("update:modelValue")?.[0]).toEqual(["light"]);
    });

    it("names both the current and the next theme for screen readers", () => {
      const w = switcher({ modelValue: "light" });
      expect(root(w).attributes("aria-label")).toBe("Theme: Light. Switch to Dark");
      expect(root(w).attributes("title")).toBe("Switch to Dark");
    });

    it("falls back to the first theme when the model matches nothing", () => {
      const w = switcher({ modelValue: "sepia" });
      expect(root(w).attributes("aria-label")).toContain("Theme: Light");
    });

    it("shows the icon of the current theme", () => {
      const w = switcher({ modelValue: "dark" });
      expect(w.findComponent(VIcon).props().icon).toBe("lucide:moon");
    });

    it("uses a neutral icon when the theme declares none", () => {
      const w = mount(VThemeSwitcher, {
        props: { themes: [{ value: "light", label: "Light" }], modelValue: "light" },
        global: { stubs },
      });
      expect(w.findComponent(VIcon).props().icon).toBe("lucide:palette");
    });

    it("cycles correctly through a two-theme list", async () => {
      const two = [THEMES[0], THEMES[1]];
      const w = mount(VThemeSwitcher, {
        props: { themes: two, modelValue: "dark" },
        global: { stubs },
      });
      await w.find(".v-theme-switcher").trigger("click");
      expect(w.emitted("update:modelValue")?.[0]).toEqual(["light"]);
    });
  });

  describe("segment variant", () => {
    it("renders one button per theme", () => {
      const w = switcher({ modelValue: "light", variant: "segment" });
      expect(w.findAll(".v-ts__item")).toHaveLength(THEMES.length);
      expect(root(w).classes()).toContain("v-theme-switcher--segment");
    });

    it("marks only the active theme as pressed", () => {
      const w = switcher({ modelValue: "dark", variant: "segment" });
      const pressed = w.findAll(".v-ts__item").map(b => b.attributes("aria-pressed"));
      expect(pressed).toEqual(["false", "true", "false"]);
    });

    it("selects the clicked theme rather than cycling", async () => {
      const w = switcher({ modelValue: "light", variant: "segment" });
      await w.findAll(".v-ts__item")[2].trigger("click");
      expect(w.emitted("update:modelValue")?.[0]).toEqual(["auto"]);
    });

    it("labels every option", () => {
      const w = switcher({ modelValue: "light", variant: "segment" });
      expect(w.findAll(".v-ts__label").map(l => l.text())).toEqual(["Light", "Dark", "Auto"]);
    });

    it("marks the active item with its own class", () => {
      const w = switcher({ modelValue: "auto", variant: "segment" });
      const active = w.findAll(".v-ts__item").map(b => b.classes().includes("v-ts__item--active"));
      expect(active).toEqual([false, false, true]);
    });
  });

  describe("toggle variant", () => {
    it("renders a radio per theme behind one thumb", () => {
      const w = switcher({ modelValue: "light", variant: "toggle" });
      expect(root(w).attributes("role")).toBe("radiogroup");
      expect(w.findAll(".v-ts__option")).toHaveLength(THEMES.length);
      expect(w.findAll(".v-ts__thumb")).toHaveLength(1);
    });

    it("checks only the active theme", () => {
      const w = switcher({ modelValue: "dark", variant: "toggle" });
      const checked = w.findAll(".v-ts__option").map(b => b.attributes("aria-checked"));
      expect(checked).toEqual(["false", "true", "false"]);
    });

    it("hands the thumb its position as custom properties", () => {
      const style = root(switcher({ modelValue: "auto", variant: "toggle" })).attributes("style");
      expect(style).toContain("--v-ts-count: 3");
      expect(style).toContain("--v-ts-index: 2");
    });

    it("parks the thumb on the first option for an unknown model", () => {
      const style = root(switcher({ modelValue: "sepia", variant: "toggle" })).attributes("style");
      expect(style).toContain("--v-ts-index: 0");
    });

    it("selects the clicked theme", async () => {
      const w = switcher({ modelValue: "light", variant: "toggle" });
      await w.findAll(".v-ts__option")[1].trigger("click");
      expect(w.emitted("update:modelValue")?.[0]).toEqual(["dark"]);
    });

    it("labels icon-only options for assistive tech", () => {
      const w = switcher({ modelValue: "light", variant: "toggle" });
      expect(w.findAll(".v-ts__option").map(b => b.attributes("aria-label")))
        .toEqual(["Light", "Dark", "Auto"]);
    });

    it("stacks only when vertical is set", () => {
      expect(root(switcher({ modelValue: "light", variant: "toggle" })).classes())
        .not.toContain("v-theme-switcher--vertical");
      expect(root(switcher({ modelValue: "light", variant: "toggle", vertical: true })).classes())
        .toContain("v-theme-switcher--vertical");
    });

    it("ignores vertical on the other variants", () => {
      expect(root(switcher({ modelValue: "light", variant: "segment", vertical: true })).classes())
        .not.toContain("v-theme-switcher--vertical");
    });
  });

  it.each(["sm", "md", "lg"] as const)("applies the %s size class", (size) => {
    expect(root(switcher({ modelValue: "light", size })).classes())
      .toContain(`v-theme-switcher--${size}`);
  });

  it.each([
    ["sm", 14],
    ["md", 16],
    ["lg", 20],
  ] as const)("scales the icon for size %s", (size, expected) => {
    const w = switcher({ modelValue: "light", size });
    expect(w.findComponent(VIcon).props().size).toBe(expected);
  });
});
