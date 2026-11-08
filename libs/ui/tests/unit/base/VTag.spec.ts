import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import VIcon from "../../../src/components/base/VIcon.vue";
import VTag, { type TagColor, type TagSize, type TagVariant } from "../../../src/components/base/VTag.vue";

const VARIANTS: TagVariant[] = ["solid", "soft", "outline", "ghost"];
const TONES = ["primary", "success", "warning", "danger", "info", "neutral"] as const satisfies TagColor[];
const SIZES: TagSize[] = ["xs", "sm", "md", "lg"];

const stubs = { Icon: true };

function tag(props: Record<string, unknown> = {}) {
  return mount(VTag, { props, global: { stubs } });
}

describe("VTag", () => {
  it("renders the label", () => {
    expect(tag({ label: "Beta" }).text()).toBe("Beta");
  });

  it("prefers the default slot over the label", () => {
    const w = mount(VTag, { props: { label: "Beta" }, slots: { default: "Alpha" }, global: { stubs } });
    expect(w.text()).toBe("Alpha");
  });

  it.each(SIZES)("applies the %s size class", (size) => {
    expect(tag({ size }).classes()).toContain(`vtag--${size}`);
  });

  it("exposes variant and tone as data attributes", () => {
    for (const variant of VARIANTS) {
      for (const color of TONES) {
        const w = tag({ variant, color });
        expect(w.attributes("data-variant")).toBe(variant);
        expect(w.attributes("data-tone")).toBe(color);
      }
    }
  });

  it.each([["error", "danger"], ["gray", "neutral"]] as const)(
    "keeps %s as an alias of %s",
    (color, tone) => {
      expect(tag({ color }).attributes("data-tone")).toBe(tone);
    },
  );

  it("defaults to a soft primary square tag", () => {
    const w = tag({});
    expect(w.attributes("data-variant")).toBe("soft");
    expect(w.attributes("data-tone")).toBe("primary");
    expect(w.classes()).toContain("vtag--square");
    expect(w.classes()).toContain("vtag--sm");
  });

  it.each([[true, "vtag--rounded"], [false, "vtag--square"]] as const)(
    "rounded=%s gives %s",
    (rounded, expected) => {
      expect(tag({ rounded }).classes()).toContain(expected);
    },
  );

  describe("customColor", () => {
    it("takes over the tone from the colour prop", () => {
      const w = tag({ variant: "soft", color: "success", customColor: "--ui-info" });
      expect(w.attributes("data-tone")).toBe("custom");
      expect(w.attributes("data-variant")).toBe("soft");
    });

    it("passes the tone in through a custom property", () => {
      const w = tag({ customColor: "--ui-info" });
      expect(w.attributes("style")).toContain("--v-tag-custom: var(--ui-info)");
    });

    it("leaves the style attribute off when unused", () => {
      expect(tag({}).attributes("style")).toBeUndefined();
    });

    it("keeps working across every variant", () => {
      for (const variant of VARIANTS) {
        const w = tag({ variant, customColor: "--ui-info" });
        expect(w.attributes("data-tone")).toBe("custom");
        expect(w.attributes("data-variant")).toBe(variant);
      }
    });
  });

  describe("icon", () => {
    it("renders exactly one icon, before the label", () => {
      const w = tag({ label: "Tag", icon: "lucide:star" });
      const icons = w.findAllComponents(VIcon);
      expect(icons).toHaveLength(1);
      expect(icons[0].props().icon).toBe("lucide:star");

      const html = w.html();
      expect(html.indexOf("<svg") >= 0 || html.indexOf("icon") >= 0).toBe(true);
      expect(w.element.textContent?.trim()).toBe("Tag");
    });

    it("moves the icon after the label when asked", () => {
      // The label is a bare text node, so it does not show up in `children` —
      // compare document order against the icon element directly instead.
      const iconIsBeforeLabel = (w: ReturnType<typeof tag>) => {
        const icon = w.find(".v-icon").element;
        const label = [...w.element.childNodes]
          .find(n => n.nodeType === Node.TEXT_NODE && n.textContent?.trim() === "Tag");
        expect(label, "expected a text node holding the label").toBeDefined();
        return Boolean(
          icon.compareDocumentPosition(label as Node) & Node.DOCUMENT_POSITION_FOLLOWING,
        );
      };

      expect(iconIsBeforeLabel(tag({ label: "Tag", icon: "lucide:star" }))).toBe(true);
      expect(iconIsBeforeLabel(tag({ label: "Tag", icon: "lucide:star", iconPosition: "right" })))
        .toBe(false);
    });

    it("scales with the tag size", () => {
      const expected = { xs: 10, sm: 12, md: 12, lg: 14 } as const;
      for (const size of SIZES) {
        const w = tag({ icon: "lucide:star", size });
        expect(w.findComponent(VIcon).props().size).toBe(expected[size]);
      }
    });

    it("renders nothing without an icon", () => {
      expect(tag({ label: "Tag" }).findAllComponents(VIcon)).toHaveLength(0);
    });
  });

  describe("slots", () => {
    it("lets icon-left replace the built-in icon", () => {
      const w = mount(VTag, {
        props: { label: "Tag", icon: "lucide:star" },
        slots: { "icon-left": "<b class='custom' />" },
        global: { stubs },
      });
      expect(w.find(".custom").exists()).toBe(true);
      expect(w.findAllComponents(VIcon)).toHaveLength(0);
    });

    it("renders icon-right independently", () => {
      const w = mount(VTag, {
        props: { label: "Tag" },
        slots: { "icon-right": "<b class='right' />" },
        global: { stubs },
      });
      expect(w.find(".right").exists()).toBe(true);
    });
  });
});
