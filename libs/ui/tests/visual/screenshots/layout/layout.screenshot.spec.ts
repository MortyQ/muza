import { describe, expect, it } from "vitest";

import VAccordion from "../../../../src/components/layout/VAccordion.vue";
import VCard from "../../../../src/components/layout/VCard.vue";
import VInfoNotice from "../../../../src/components/layout/VInfoNotice.vue";
import VScrollPanel from "../../../../src/components/layout/VScrollPanel.vue";
import { stage } from "../../../setup/stage";
import { THEME_CASES } from "../../../setup/theme";

const ITEMS = [
  {
    id: "shipping",
    title: "Shipping",
    subtitle: "Carriers and windows",
    icon: "lucide:truck",
    content: "Orders placed before 14:00 ship the same day.",
  },
  {
    id: "returns",
    title: "Returns",
    icon: "lucide:rotate-ccw",
    content: "Unopened items can be returned within 30 days.",
  },
  {
    id: "warranty",
    title: "Warranty",
    icon: "lucide:shield-check",
    content: "Two-year limited warranty.",
    disabled: true,
  },
];

const FEATURES = [
  { icon: "lucide:zap", title: "Fast", description: "Under a second", tone: "success" as const },
  { icon: "lucide:lock", title: "Secure", description: "Encrypted at rest", tone: "info" as const },
];

describe.each(THEME_CASES)("layout components — %s theme", (theme) => {
  describe("VCard", () => {
    it.each(["default", "elevated", "outlined", "ghost", "translucent"] as const)("%s", async (variant) => {
      const frame = await stage(VCard, {
        theme,
        props: { variant, title: "Revenue", subtitle: "This month", icon: "lucide:chart-bar" },
        slots: { default: "Gross revenue across every marketplace." },
        width: 420,
      });
      await expect(frame).toMatchScreenshot(`vcard-${variant}-${theme}`);
    });

    it.each(["none", "sm", "md", "lg", "xl"] as const)("padding %s", async (padding) => {
      const frame = await stage(VCard, {
        theme,
        props: { padding, title: "Revenue" },
        width: 420,
      });
      await expect(frame).toMatchScreenshot(`vcard-padding-${padding}-${theme}`);
    });

    it("loading", async () => {
      const frame = await stage(VCard, {
        theme,
        props: { title: "Revenue", loading: true },
        width: 420,
      });
      await expect(frame).toMatchScreenshot(`vcard-loading-${theme}`);
    });

    it("with a footer", async () => {
      const frame = await stage(VCard, {
        theme,
        props: { title: "Revenue", subtitle: "This month" },
        slots: { default: "Body text.", footer: "Updated a minute ago" },
        width: 420,
      });
      await expect(frame).toMatchScreenshot(`vcard-footer-${theme}`);
    });
  });

  describe("VAccordion", () => {
    it.each(["default", "outlined", "inset", "popout"] as const)("%s, first panel open", async (variant) => {
      const frame = await stage(VAccordion, {
        theme,
        props: { items: ITEMS, variant, modelValue: ["shipping"] },
        width: 480,
      });
      await expect(frame).toMatchScreenshot(`vaccordion-${variant}-${theme}`);
    });

    it("all closed", async () => {
      const frame = await stage(VAccordion, {
        theme,
        props: { items: ITEMS, modelValue: [] },
        width: 480,
      });
      await expect(frame).toMatchScreenshot(`vaccordion-closed-${theme}`);
    });

    it("several open at once", async () => {
      const frame = await stage(VAccordion, {
        theme,
        props: { items: ITEMS, multiple: true, modelValue: ["shipping", "returns"] },
        width: 480,
      });
      await expect(frame).toMatchScreenshot(`vaccordion-multiple-${theme}`);
    });

    it("flat", async () => {
      const frame = await stage(VAccordion, {
        theme,
        props: { items: ITEMS, flat: true, modelValue: ["shipping"] },
        width: 480,
      });
      await expect(frame).toMatchScreenshot(`vaccordion-flat-${theme}`);
    });
  });

  describe("VInfoNotice", () => {
    it.each(["primary", "success", "warning", "danger", "info", "muted"] as const)("%s tone", async (tone) => {
      const frame = await stage(VInfoNotice, {
        theme,
        props: { tone, title: "Heads up", subtitle: "Something worth reading before you continue." },
        width: 480,
      });
      await expect(frame).toMatchScreenshot(`vinfonotice-${tone}-${theme}`);
    });

    it("feature grid with a hint", async () => {
      const frame = await stage(VInfoNotice, {
        theme,
        props: {
          title: "What you get",
          subtitle: "Included on every plan",
          features: FEATURES,
          hint: "Applies to new orders only.",
        },
        // The feature grid is two columns; at 480 the titles truncate to an
        // ellipsis and the baseline captures nothing useful.
        width: 640,
      });
      await expect(frame).toMatchScreenshot(`vinfonotice-features-${theme}`);
    });

    it("without the card wrapper", async () => {
      const frame = await stage(VInfoNotice, {
        theme,
        props: { card: false, title: "Heads up", subtitle: "No card around this one." },
        width: 480,
      });
      await expect(frame).toMatchScreenshot(`vinfonotice-bare-${theme}`);
    });
  });

  describe("VScrollPanel", () => {
    it("bounded, with content overflowing", async () => {
      const frame = await stage(VScrollPanel, {
        theme,
        props: { maxHeight: "120px" },
        slots: {
          default: Array.from({ length: 8 }, (_, i) => `<p>Line number ${i}</p>`).join(""),
        },
        width: 320,
      });
      await expect(frame).toMatchScreenshot(`vscrollpanel-bounded-${theme}`);
    });
  });
});
