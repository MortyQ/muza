import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-vue";

import VAccordion from "../../../../src/components/layout/VAccordion.vue";
import VCard from "../../../../src/components/layout/VCard.vue";
import VInfoNotice from "../../../../src/components/layout/VInfoNotice.vue";
import VScrollPanel from "../../../../src/components/layout/VScrollPanel.vue";
import { applyTheme, THEME_CASES } from "../../../setup/theme";
import { computed as computedValue, rawToken, tokenAsColor, tokenAsValue } from "../../../setup/tokens";

const NOTICE_TONES = {
  primary: "--ui-primary",
  success: "--ui-success",
  warning: "--ui-warning",
  danger: "--ui-danger",
  info: "--ui-info",
  muted: "--ui-foreground-muted",
} as const;

const ITEMS = [
  { id: "a", title: "First", content: "One" },
  { id: "b", title: "Second", content: "Two" },
];

describe.each(THEME_CASES)("layout tokens — %s theme", (theme) => {
  async function mountIt(
    component: unknown,
    props: Record<string, unknown> = {},
    slots = {},
  ): Promise<HTMLElement> {
    await applyTheme(theme);
    const screen = render(component as never, { props, slots });
    return screen.container.firstElementChild as HTMLElement;
  }

  describe("VCard", () => {
    it("sits on the surface token with foreground text", async () => {
      const el = await mountIt(VCard, { title: "Revenue" });
      const style = getComputedStyle(el);
      expect(style.backgroundColor).toBe(tokenAsColor("--ui-surface"));
      expect(style.color).toBe(tokenAsColor("--ui-foreground"));
    });

    it("every variant resolves to a distinct elevation", async () => {
      const shadows = new Map<string, string>();
      for (const variant of ["default", "elevated", "outlined", "ghost"] as const) {
        const el = await mountIt(VCard, { variant, title: "T" });
        shadows.set(variant, getComputedStyle(el).boxShadow);
      }
      // Elevated must actually look raised relative to a flat outlined card.
      expect(shadows.get("elevated")).not.toBe(shadows.get("outlined"));
    });

    it("ghost is fully transparent and unelevated at rest", async () => {
      // The raised surface only appears on hover, which a computed-style check
      // cannot reach — the resting state is what this pins down.
      const el = await mountIt(VCard, { variant: "ghost", title: "T" });
      const style = getComputedStyle(el);
      expect(style.backgroundColor).toBe("rgba(0, 0, 0, 0)");
      expect(style.borderTopColor).toBe("rgba(0, 0, 0, 0)");
      expect(style.boxShadow).toBe("none");
    });

    it("outlined draws a border from the border token", async () => {
      const el = await mountIt(VCard, { variant: "outlined", title: "T" });
      expect(getComputedStyle(el).borderTopColor).toBe(tokenAsColor("--ui-border"));
    });

    it.each(["none", "sm", "md", "lg", "xl", "full"] as const)("radius %s applies", async (radius) => {
      const el = await mountIt(VCard, { radius, title: "T" });
      expect(getComputedStyle(el).borderRadius).toBeTruthy();
    });

    it("every radius step resolves to a different value", async () => {
      const radii = new Set<string>();
      for (const radius of ["none", "sm", "md", "lg", "xl", "full"] as const) {
        const el = await mountIt(VCard, { radius, title: "T" });
        radii.add(getComputedStyle(el).borderRadius);
      }
      expect(radii.size).toBeGreaterThanOrEqual(4);
    });

    it("every padding step resolves to a different value", async () => {
      const paddings = new Set<string>();
      for (const padding of ["none", "sm", "md", "lg", "xl"] as const) {
        const el = await mountIt(VCard, { padding, title: "T" });
        paddings.add(getComputedStyle(el).padding);
      }
      expect(paddings.size).toBeGreaterThanOrEqual(4);
    });

    it("tones the title and subtitle apart", async () => {
      const el = await mountIt(VCard, { title: "Revenue", subtitle: "This month" });
      const title = el.querySelector(".v-card__title") as HTMLElement;
      const subtitle = el.querySelector(".v-card__subtitle") as HTMLElement;
      expect(getComputedStyle(title).color).toBe(tokenAsColor("--ui-foreground"));
      expect(getComputedStyle(subtitle).color).toBe(tokenAsColor("--ui-foreground-secondary"));
    });
  });

  describe("VInfoNotice", () => {
    it.each(Object.entries(NOTICE_TONES))("tone %s sets --v-notice-tone to %s", async (tone, token) => {
      const el = await mountIt(VInfoNotice, { title: "T", tone });
      const icon = el.querySelector(".v-info-notice__icon") as HTMLElement;
      expect(computedValue(icon, "--v-notice-tone")).toBe(rawToken(token));
    });

    it("defaults to the primary tone", async () => {
      const el = await mountIt(VInfoNotice, { title: "T" });
      const icon = el.querySelector(".v-info-notice__icon") as HTMLElement;
      expect(computedValue(icon, "--v-notice-tone")).toBe(rawToken("--ui-primary"));
    });

    it("tones each feature icon independently", async () => {
      const el = await mountIt(VInfoNotice, {
        features: [
          { icon: "lucide:zap", title: "Fast", tone: "success" },
          { icon: "lucide:lock", title: "Secure", tone: "danger" },
        ],
      });
      const icons = [...el.querySelectorAll(".v-info-notice__feature-icon")] as HTMLElement[];
      expect(computedValue(icons[0], "--v-notice-tone")).toBe(rawToken("--ui-success"));
      expect(computedValue(icons[1], "--v-notice-tone")).toBe(rawToken("--ui-danger"));
    });
  });

  describe("VScrollPanel", () => {
    it("scrolls vertically and carries the inner elevation", async () => {
      const el = await mountIt(VScrollPanel, {});
      const style = getComputedStyle(el);
      expect(style.overflowY).toBe("auto");
      expect(style.boxShadow).not.toBe("none");
    });

    it("is unbounded without maxHeight", async () => {
      const el = await mountIt(VScrollPanel, {});
      expect(getComputedStyle(el).maxHeight).toBe("none");
    });

    it("takes its bound from the custom property", async () => {
      const el = await mountIt(VScrollPanel, { maxHeight: "240px" });
      expect(getComputedStyle(el).maxHeight).toBe("240px");
    });

    it("uses the xl radius token", async () => {
      const el = await mountIt(VScrollPanel, {});
      expect(getComputedStyle(el).borderRadius)
        .toBe(tokenAsValue("border-radius", "--ui-radius-xl"));
    });
  });

  describe("VAccordion", () => {
    it("collapses a closed panel to zero height", async () => {
      const el = await mountIt(VAccordion, { items: ITEMS, modelValue: [] });
      const content = el.querySelector(".v-accordion__content-wrap") as HTMLElement;
      expect(content.getBoundingClientRect().height).toBe(0);
    });

    it("gives an open panel real height", async () => {
      const el = await mountIt(VAccordion, { items: ITEMS, modelValue: ["a"] });
      const content = el.querySelectorAll(".v-accordion__content-wrap")[0] as HTMLElement;
      expect(content.getBoundingClientRect().height).toBeGreaterThan(0);
    });

    it("keeps the collapsed wrapper free of padding, so no gap survives", async () => {
      // The wrapper is the grid item that collapses to 0fr; padding on it would
      // outlive the collapse and leave a strip under a closed panel.
      const el = await mountIt(VAccordion, { items: ITEMS, modelValue: [] });
      const wrap = el.querySelector(".v-accordion__content-wrap") as HTMLElement;
      const style = getComputedStyle(wrap);
      expect(style.paddingTop).toBe("0px");
      expect(style.paddingBottom).toBe("0px");
    });

    it("only one panel has height in single mode", async () => {
      const el = await mountIt(VAccordion, { items: ITEMS, modelValue: ["b"] });
      const heights = [...el.querySelectorAll(".v-accordion__content-wrap")]
        .map(c => (c as HTMLElement).getBoundingClientRect().height);
      expect(heights[0]).toBe(0);
      expect(heights[1]).toBeGreaterThan(0);
    });
  });
});
