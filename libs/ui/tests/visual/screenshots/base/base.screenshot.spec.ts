import { describe, expect, it } from "vitest";

import VAvatar from "../../../../src/components/base/VAvatar.vue";
import VChip from "../../../../src/components/base/VChip.vue";
import VTag from "../../../../src/components/base/VTag.vue";
import VThemeSwitcher from "../../../../src/components/base/VThemeSwitcher.vue";
import { stage } from "../../../setup/stage";
import { THEME_CASES } from "../../../setup/theme";

const THEMES = [
  { value: "light", label: "Light", icon: "lucide:sun" },
  { value: "dark", label: "Dark", icon: "lucide:moon" },
  { value: "auto", label: "Auto", icon: "lucide:monitor" },
];

describe.each(THEME_CASES)("base components — %s theme", (theme) => {
  describe("VAvatar", () => {
    it.each(["xs", "sm", "md", "lg", "xl"] as const)("size %s", async (size) => {
      const frame = await stage(VAvatar, { theme, props: { name: "Ada Lovelace", size }, width: 160 });
      await expect(frame).toMatchScreenshot(`vavatar-${size}-${theme}`);
    });

    it("square with an online dot", async () => {
      const frame = await stage(VAvatar, {
        theme,
        props: { name: "Grace Hopper", shape: "square", online: true, size: "lg" },
        width: 160,
      });
      await expect(frame).toMatchScreenshot(`vavatar-square-online-${theme}`);
    });

    it("nameless fallback", async () => {
      const frame = await stage(VAvatar, { theme, props: { size: "lg" }, width: 160 });
      await expect(frame).toMatchScreenshot(`vavatar-empty-${theme}`);
    });

    // One frame covering all eight tones, so a palette shift shows up as a
    // single diff rather than eight near-identical ones.
    it("all eight tones", async () => {
      const frame = await stage(VAvatar, { theme, props: { name: "User0" }, width: 480 });
      for (const name of ["User1", "User2", "User3", "User4", "User5", "User6", "User7"]) {
        const extra = await stage(VAvatar, { theme, props: { name }, width: 56 });
        frame.append(...Array.from(extra.childNodes));
        extra.remove();
      }
      await expect(frame).toMatchScreenshot(`vavatar-tones-${theme}`);
    });
  });

  describe("VTag", () => {
    it.each(["solid", "soft", "outline", "ghost"] as const)("%s primary", async (variant) => {
      const frame = await stage(VTag, { theme, props: { label: "Tag", variant }, width: 160 });
      await expect(frame).toMatchScreenshot(`vtag-${variant}-${theme}`);
    });

    it("with an icon, rounded", async () => {
      const frame = await stage(VTag, {
        theme,
        props: { label: "Verified", icon: "lucide:badge-check", rounded: true, size: "md" },
        width: 200,
      });
      await expect(frame).toMatchScreenshot(`vtag-icon-rounded-${theme}`);
    });

    it("status colours in soft", async () => {
      const frame = await stage(VTag, { theme, props: { label: "primary" }, width: 480 });
      for (const color of ["success", "warning", "error", "info", "neutral"] as const) {
        const extra = await stage(VTag, { theme, props: { label: color, color }, width: 90 });
        frame.append(...Array.from(extra.childNodes));
        extra.remove();
      }
      await expect(frame).toMatchScreenshot(`vtag-status-soft-${theme}`);
    });
  });

  describe("VChip", () => {
    it.each(["filled", "soft", "outlined"] as const)("%s", async (variant) => {
      const frame = await stage(VChip, { theme, props: { label: "Design", variant }, width: 200 });
      await expect(frame).toMatchScreenshot(`vchip-${variant}-${theme}`);
    });

    it("selected", async () => {
      const frame = await stage(VChip, {
        theme,
        props: { label: "Design", variant: "outlined", active: true, selectedColor: "primary" },
        width: 200,
      });
      await expect(frame).toMatchScreenshot(`vchip-selected-${theme}`);
    });

    it("icon, badge and close button together", async () => {
      const frame = await stage(VChip, {
        theme,
        props: { label: "Design", icon: "lucide:palette", badge: "3", closable: true },
        width: 260,
      });
      await expect(frame).toMatchScreenshot(`vchip-full-${theme}`);
    });

    it("disabled", async () => {
      const frame = await stage(VChip, {
        theme,
        props: { label: "Design", disabled: true, variant: "filled", color: "primary" },
        width: 200,
      });
      await expect(frame).toMatchScreenshot(`vchip-disabled-${theme}`);
    });
  });

  describe("VThemeSwitcher", () => {
    it("cycle", async () => {
      const frame = await stage(VThemeSwitcher, {
        theme,
        props: { themes: THEMES, modelValue: theme },
        width: 120,
      });
      await expect(frame).toMatchScreenshot(`vthemeswitcher-cycle-${theme}`);
    });

    it("segment", async () => {
      const frame = await stage(VThemeSwitcher, {
        theme,
        props: { themes: THEMES, modelValue: theme, variant: "segment" },
        width: 360,
      });
      await expect(frame).toMatchScreenshot(`vthemeswitcher-segment-${theme}`);
    });
  });
});
