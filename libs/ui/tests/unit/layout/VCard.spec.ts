import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import VLoader from "../../../src/components/feedback/VLoader.vue";
import VCard, {
  type CardPadding,
  type CardRadius,
  type CardSize,
  type CardVariant,
} from "../../../src/components/layout/VCard.vue";

const VARIANTS: CardVariant[] = [
  "default", "elevated", "outlined", "ghost", "glass", "glass-elevated", "translucent",
];
const SIZES: CardSize[] = ["fit", "sm", "md", "lg", "xl", "full"];
const RADII: CardRadius[] = ["none", "sm", "md", "lg", "xl", "full"];
const PADDINGS: CardPadding[] = ["none", "sm", "md", "lg", "xl"];

const stubs = { Icon: true };

function card(props: Record<string, unknown> = {}, slots: Record<string, string> = {}) {
  return mount(VCard, { props, slots, global: { stubs } });
}

describe("VCard", () => {
  describe("element", () => {
    it("is a div by default", () => {
      expect(card().element.tagName).toBe("DIV");
    });

    it("honours the `as` prop", () => {
      expect(card({ as: "section" }).element.tagName).toBe("SECTION");
    });

    it("becomes an anchor whenever href is set, whatever `as` says", () => {
      const w = card({ as: "section", href: "/pricing" });
      expect(w.element.tagName).toBe("A");
      expect(w.attributes("href")).toBe("/pricing");
    });

    it("adds rel only for a new tab", () => {
      expect(card({ href: "/x", target: "_blank" }).attributes("rel")).toBe("noopener noreferrer");
      expect(card({ href: "/x" }).attributes("rel")).toBeUndefined();
    });

    it("sets no link attributes without href", () => {
      const w = card({ target: "_blank" });
      expect(w.attributes("href")).toBeUndefined();
      expect(w.attributes("target")).toBeUndefined();
    });
  });

  describe("interactivity", () => {
    it("is not interactive by default", () => {
      expect(card().classes()).not.toContain("v-card--interactive");
    });

    it.each([
      [{ clickable: true }],
      [{ href: "/x" }],
      [{ as: "button" }],
    ])("%o makes it interactive", (props) => {
      expect(card(props).classes()).toContain("v-card--interactive");
    });

    it("emits click", async () => {
      const w = card({ clickable: true });
      await w.trigger("click");
      expect(w.emitted("click")).toHaveLength(1);
    });

    it("swallows the click when disabled", async () => {
      const w = card({ clickable: true, disabled: true });
      await w.trigger("click");
      expect(w.emitted("click")).toBeUndefined();
    });

    it("swallows the click while loading", async () => {
      const w = card({ clickable: true, loading: true });
      await w.trigger("click");
      expect(w.emitted("click")).toBeUndefined();
    });
  });

  describe("loading", () => {
    it("replaces the whole body with a loader", () => {
      const w = card({ title: "Revenue", loading: true }, { default: "<p class='body'>x</p>" });
      expect(w.findComponent(VLoader).exists()).toBe(true);
      expect(w.find(".v-card__header").exists()).toBe(false);
      expect(w.find(".body").exists()).toBe(false);
    });

    it("lets the loading slot replace the loader", () => {
      const w = card({ loading: true }, { loading: "<b class='custom-loading'>…</b>" });
      expect(w.find(".custom-loading").exists()).toBe(true);
      expect(w.findComponent(VLoader).exists()).toBe(false);
    });

    it("carries the loading class", () => {
      expect(card({ loading: true }).classes()).toContain("v-card--loading");
    });
  });

  describe("header", () => {
    it("is absent with nothing to put in it", () => {
      expect(card().find(".v-card__header").exists()).toBe(false);
    });

    it.each([
      [{ title: "Revenue" }],
      [{ subtitle: "This month" }],
      [{ icon: "lucide:chart-bar" }],
    ])("%o brings the header into existence", (props) => {
      expect(card(props).find(".v-card__header").exists()).toBe(true);
    });

    it("renders title, subtitle and description", () => {
      const w = card({ title: "Revenue", subtitle: "This month", description: "Gross" });
      expect(w.find(".v-card__title").text()).toBe("Revenue");
      expect(w.find(".v-card__subtitle").text()).toBe("This month");
      expect(w.find(".v-card__description").text()).toBe("Gross");
    });

    it("uses an h3 for the title", () => {
      expect(card({ title: "Revenue" }).find(".v-card__title").element.tagName).toBe("H3");
    });

    it("lets the header slot replace the built-in markup", () => {
      const w = card({ title: "Revenue" }, { header: "<b class='custom-header'>H</b>" });
      expect(w.find(".custom-header").exists()).toBe(true);
      expect(w.find(".v-card__title").exists()).toBe(false);
    });
  });

  describe("content and footer", () => {
    it("renders no content wrapper without a default slot", () => {
      expect(card({ title: "Revenue" }).find(".v-card__content").exists()).toBe(false);
    });

    it("wraps the default slot", () => {
      const w = card({}, { default: "<p class='body'>Body</p>" });
      expect(w.find(".v-card__content .body").exists()).toBe(true);
    });

    it("renders the footer only when slotted", () => {
      expect(card().find(".v-card__footer").exists()).toBe(false);
      expect(card({}, { footer: "<b>F</b>" }).find(".v-card__footer").exists()).toBe(true);
    });
  });

  describe("appearance", () => {
    it.each(VARIANTS)("variant %s", (variant) => {
      expect(card({ variant }).classes()).toContain(`v-card--${variant}`);
    });

    it.each(SIZES)("size %s", (size) => {
      expect(card({ size }).classes()).toContain(`v-card--${size}`);
    });

    it.each(RADII)("radius %s", (radius) => {
      expect(card({ radius }).classes()).toContain(`v-card--radius-${radius}`);
    });

    it.each(PADDINGS)("padding %s", (padding) => {
      expect(card({ padding }).classes()).toContain(`v-card--padding-${padding}`);
    });

    it("defaults to a full-width, xl-radius, sm-padding default card", () => {
      const classes = card().classes();
      expect(classes).toEqual(expect.arrayContaining([
        "v-card", "v-card--default", "v-card--full", "v-card--radius-xl", "v-card--padding-sm",
      ]));
    });

    it("marks itself disabled", () => {
      expect(card({ disabled: true }).classes()).toContain("v-card--disabled");
    });
  });
});
