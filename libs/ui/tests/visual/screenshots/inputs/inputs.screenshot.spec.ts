import { describe, expect, it } from "vitest";

import VCheckbox from "../../../../src/components/inputs/VCheckbox.vue";
import VInput from "../../../../src/components/inputs/VInput.vue";
import VSegmentedControl from "../../../../src/components/inputs/VSegmentedControl.vue";
import VSwitch from "../../../../src/components/inputs/VSwitch.vue";
import VToggleGroup from "../../../../src/components/inputs/VToggleGroup.vue";
import { stage } from "../../../setup/stage";
import { THEME_CASES } from "../../../setup/theme";

const SEGMENTS = [
  { label: "Day", value: "day" },
  { label: "Week", value: "week" },
  { label: "Month", value: "month" },
];

const VIEWS = [
  { label: "List", value: "list", icon: "lucide:list" },
  { label: "Grid", value: "grid", icon: "lucide:grid-3x3" },
];

describe.each(THEME_CASES)("input components — %s theme", (theme) => {
  describe("VInput", () => {
    it("empty", async () => {
      const frame = await stage(VInput, { theme, props: { name: "Email" }, width: 360 });
      await expect(frame).toMatchScreenshot(`vinput-empty-${theme}`);
    });

    it("filled, with a leading icon", async () => {
      const frame = await stage(VInput, {
        theme,
        props: { name: "Email", modelValue: "ada@example.com", icon: "lucide:mail" },
        width: 360,
      });
      await expect(frame).toMatchScreenshot(`vinput-filled-${theme}`);
    });

    it("invalid", async () => {
      const frame = await stage(VInput, {
        theme,
        props: { name: "Email", modelValue: "nope", error: "Enter a valid address" },
        width: 360,
      });
      await expect(frame).toMatchScreenshot(`vinput-error-${theme}`);
    });

    it("with helper text", async () => {
      const frame = await stage(VInput, {
        theme,
        props: { name: "Handle", helperText: "Letters and numbers only" },
        width: 360,
      });
      await expect(frame).toMatchScreenshot(`vinput-helper-${theme}`);
    });

    it("disabled", async () => {
      const frame = await stage(VInput, {
        theme,
        props: { name: "Email", modelValue: "locked@example.com", disabled: true },
        width: 360,
      });
      await expect(frame).toMatchScreenshot(`vinput-disabled-${theme}`);
    });

    it.each(["sm", "md", "lg"] as const)("size %s", async (size) => {
      const frame = await stage(VInput, {
        theme,
        props: { name: "Email", size, modelValue: "ada@example.com" },
        width: 360,
      });
      await expect(frame).toMatchScreenshot(`vinput-${size}-${theme}`);
    });

    it("textarea", async () => {
      const frame = await stage(VInput, {
        theme,
        props: { name: "Notes", textarea: true, rows: 3, modelValue: "Two lines\nof text" },
        width: 360,
      });
      await expect(frame).toMatchScreenshot(`vinput-textarea-${theme}`);
    });

    it("search", async () => {
      const frame = await stage(VInput, {
        theme,
        props: { type: "search", placeholder: "Search products", modelValue: "widget" },
        width: 360,
      });
      await expect(frame).toMatchScreenshot(`vinput-search-${theme}`);
    });
  });

  describe("VSwitch", () => {
    it.each([false, true])("checked=%s", async (checked) => {
      const frame = await stage(VSwitch, {
        theme,
        props: { modelValue: checked, trueLabel: "On", falseLabel: "Off" },
        width: 180,
      });
      await expect(frame).toMatchScreenshot(`vswitch-${checked ? "on" : "off"}-${theme}`);
    });

    it("disabled", async () => {
      const frame = await stage(VSwitch, {
        theme,
        props: { modelValue: true, disabled: true, trueLabel: "On" },
        width: 180,
      });
      await expect(frame).toMatchScreenshot(`vswitch-disabled-${theme}`);
    });

    it("with icons", async () => {
      const frame = await stage(VSwitch, {
        theme,
        props: { modelValue: true, trueIcon: "lucide:check", falseIcon: "lucide:x" },
        width: 180,
      });
      await expect(frame).toMatchScreenshot(`vswitch-icons-${theme}`);
    });
  });

  describe("VCheckbox", () => {
    it.each([false, true])("checked=%s", async (checked) => {
      const frame = await stage(VCheckbox, {
        theme,
        props: { modelValue: checked, label: "Subscribe to updates" },
        width: 280,
      });
      await expect(frame).toMatchScreenshot(`vcheckbox-${checked ? "on" : "off"}-${theme}`);
    });

    it("disabled", async () => {
      const frame = await stage(VCheckbox, {
        theme,
        props: { modelValue: true, disabled: true, label: "Locked" },
        width: 280,
      });
      await expect(frame).toMatchScreenshot(`vcheckbox-disabled-${theme}`);
    });
  });

  describe("VSegmentedControl", () => {
    it.each(["sm", "md", "lg"] as const)("size %s", async (size) => {
      const frame = await stage(VSegmentedControl, {
        theme,
        props: { options: SEGMENTS, modelValue: "week", size },
        width: 340,
      });
      await expect(frame).toMatchScreenshot(`vsegmentedcontrol-${size}-${theme}`);
    });

    it("disabled", async () => {
      const frame = await stage(VSegmentedControl, {
        theme,
        props: { options: SEGMENTS, modelValue: "week", disabled: true },
        width: 340,
      });
      await expect(frame).toMatchScreenshot(`vsegmentedcontrol-disabled-${theme}`);
    });
  });

  describe("VToggleGroup", () => {
    it("with icons", async () => {
      const frame = await stage(VToggleGroup, {
        theme,
        props: { options: VIEWS, modelValue: "grid" },
        width: 280,
      });
      await expect(frame).toMatchScreenshot(`vtogglegroup-${theme}`);
    });
  });
});
