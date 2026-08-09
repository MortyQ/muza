import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import VIcon from "../../../src/components/base/VIcon.vue";
import VTag, { type TagColor, type TagSize, type TagVariant } from "../../../src/components/base/VTag.vue";

const VARIANTS: TagVariant[] = ["solid", "soft", "outline", "ghost"];
const COLORS: TagColor[] = ["primary", "success", "warning", "error", "info", "neutral", "gray"];
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

  it("pairs variant and colour into a single class", () => {
    for (const variant of VARIANTS) {
      for (const color of COLORS) {
        expect(tag({ variant, color }).classes()).toContain(`vtag--${variant}-${color}`);
      }
    }
  });

  it("defaults to a soft primary square tag", () => {
    const classes = tag({}).classes();
    expect(classes).toContain("vtag--soft-primary");
    expect(classes).toContain("vtag--square");
    expect(classes).toContain("vtag--sm");
  });

  it.each([[true, "vtag--rounded"], [false, "vtag--square"]] as const)(
    "rounded=%s gives %s",
    (rounded, expected) => {
      expect(tag({ rounded }).classes()).toContain(expected);
    },
  );

  describe("customColor", () => {
    it("swaps to the custom variant class and drops the colour pairing", () => {
      const w = tag({ variant: "soft", color: "success", customColor: "--ui-info" });
      expect(w.classes()).toContain("vtag--custom-soft");
      expect(w.classes()).not.toContain("vtag--soft-success");
    });

    it("passes the tone in through a custom property", () => {
      const w = tag({ customColor: "--ui-info" });
      expect(w.attributes("style")).toContain("--_tag-color: var(--ui-info)");
    });

    it("leaves the style attribute off when unused", () => {
      expect(tag({}).attributes("style")).toBeUndefined();
    });

    it("keeps working across every variant", () => {
      for (const variant of VARIANTS) {
        expect(tag({ variant, customColor: "--ui-info" }).classes())
          .toContain(`vtag--custom-${variant}`);
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
      const expected = { xs: 12, sm: 14, md: 16, lg: 18 } as const;
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
