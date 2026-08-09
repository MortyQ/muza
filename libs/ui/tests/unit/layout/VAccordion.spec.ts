import { defineComponent } from "vue";

import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import VAccordion, { type AccordionItem, type AccordionVariant } from "../../../src/components/layout/VAccordion.vue";

const ITEMS: AccordionItem[] = [
  { id: "shipping", title: "Shipping", subtitle: "Carriers", icon: "lucide:truck", content: "Ships today." },
  { id: "returns", title: "Returns", content: "Thirty days." },
  { id: "warranty", title: "Warranty", content: "Two years.", disabled: true },
];

const VARIANTS: AccordionVariant[] = ["default", "outlined", "inset", "popout"];
const stubs = { Icon: true };

function accordion(props: Record<string, unknown> = {}, slots: Record<string, string> = {}) {
  return mount(VAccordion, { props: { items: ITEMS, ...props }, slots, global: { stubs } });
}

const headers = (w: ReturnType<typeof accordion>) => w.findAll(".v-accordion__header");

describe("VAccordion", () => {
  it("renders one panel per item", () => {
    expect(accordion().findAll(".v-accordion__panel")).toHaveLength(3);
  });

  it("renders titles, subtitles and content", () => {
    const w = accordion();
    expect(w.find(".v-accordion__title").text()).toBe("Shipping");
    expect(w.find(".v-accordion__subtitle").text()).toBe("Carriers");
    expect(w.find(".v-accordion__text").text()).toBe("Ships today.");
  });

  it("omits the subtitle element when the item has none", () => {
    const w = accordion({ items: [ITEMS[1]] });
    expect(w.find(".v-accordion__subtitle").exists()).toBe(false);
  });

  it("renders nothing at all for an empty list", () => {
    expect(accordion({ items: [] }).findAll(".v-accordion__panel")).toHaveLength(0);
  });

  describe("single mode", () => {
    it("opens a panel on click", async () => {
      const w = accordion({ modelValue: [] });
      await headers(w)[0].trigger("click");
      expect(w.emitted("update:modelValue")?.[0]).toEqual([["shipping"]]);
    });

    it("closes the panel when clicked again", async () => {
      const w = accordion({ modelValue: ["shipping"] });
      await headers(w)[0].trigger("click");
      expect(w.emitted("update:modelValue")?.[0]).toEqual([[]]);
    });

    it("replaces the open panel rather than adding to it", async () => {
      const w = accordion({ modelValue: ["shipping"] });
      await headers(w)[1].trigger("click");
      expect(w.emitted("update:modelValue")?.[0]).toEqual([["returns"]]);
    });
  });

  describe("multiple mode", () => {
    it("adds to the open set", async () => {
      const w = accordion({ modelValue: ["shipping"], multiple: true });
      await headers(w)[1].trigger("click");
      expect(w.emitted("update:modelValue")?.[0]).toEqual([["shipping", "returns"]]);
    });

    it("removes just the clicked panel", async () => {
      const w = accordion({ modelValue: ["shipping", "returns"], multiple: true });
      await headers(w)[0].trigger("click");
      expect(w.emitted("update:modelValue")?.[0]).toEqual([["returns"]]);
    });
  });

  it("emits change alongside the model update", async () => {
    const w = accordion({ modelValue: [] });
    await headers(w)[0].trigger("click");
    expect(w.emitted("change")?.[0]).toEqual([["shipping"]]);
  });

  describe("disabled", () => {
    it("disables the button of a disabled item", () => {
      expect(headers(accordion())[2].attributes("disabled")).toBeDefined();
      expect(headers(accordion())[0].attributes("disabled")).toBeUndefined();
    });

    it("emits nothing when a disabled item is clicked", async () => {
      const w = accordion({ modelValue: [] });
      await headers(w)[2].trigger("click");
      expect(w.emitted("update:modelValue")).toBeUndefined();
      expect(w.emitted("change")).toBeUndefined();
    });

    it("a disabled accordion disables every item", async () => {
      const w = accordion({ modelValue: [], disabled: true });
      for (const header of headers(w)) {
        expect(header.attributes("disabled")).toBeDefined();
      }
      await headers(w)[0].trigger("click");
      expect(w.emitted("update:modelValue")).toBeUndefined();
    });

    it("marks disabled panels with their own class", () => {
      const panels = accordion().findAll(".v-accordion__panel");
      expect(panels[2].classes()).toContain("v-accordion__panel--disabled");
      expect(panels[0].classes()).not.toContain("v-accordion__panel--disabled");
    });
  });

  describe("accessibility", () => {
    it("wires aria-expanded to the open state", () => {
      const w = accordion({ modelValue: ["returns"] });
      expect(headers(w).map(h => h.attributes("aria-expanded"))).toEqual(["false", "true", "false"]);
    });

    it("pairs each header with its region through ids", () => {
      const w = accordion();
      const header = headers(w)[0];
      const region = w.findAll(".v-accordion__content")[0];

      expect(header.attributes("aria-controls")).toBe(region.attributes("id"));
      expect(region.attributes("aria-labelledby")).toBe(header.attributes("id"));
      expect(region.attributes("role")).toBe("region");
    });

    it("derives ids from useId, so two accordions in one app never collide", () => {
      // A fresh `mount` is a fresh app, and useId's counter restarts with it —
      // comparing two separate mounts would compare two "v-0"s and prove
      // nothing. Both instances have to live in the same app.
      const Host = defineComponent({
        components: { VAccordion },
        setup: () => ({ items: ITEMS }),
        template: "<div><VAccordion :items /><VAccordion :items /></div>",
      });
      const w = mount(Host, { global: { stubs } });
      const [first, second] = w.findAll(".v-accordion").map(a => a.attributes("id"));

      expect(first).toBeTruthy();
      expect(second).toBeTruthy();
      expect(first).not.toBe(second);
    });

    it("uses real buttons, typed to avoid submitting a form", () => {
      for (const header of headers(accordion())) {
        expect(header.element.tagName).toBe("BUTTON");
        expect(header.attributes("type")).toBe("button");
      }
    });
  });

  describe("appearance", () => {
    it.each(VARIANTS)("applies the %s variant class", (variant) => {
      expect(accordion({ variant }).classes()).toContain(`v-accordion--${variant}`);
    });

    it("marks the open panel as active", () => {
      const panels = accordion({ modelValue: ["returns"] }).findAll(".v-accordion__panel");
      expect(panels[1].classes()).toContain("v-accordion__panel--active");
      expect(panels[0].classes()).not.toContain("v-accordion__panel--active");
    });

    it.each([
      [{ flat: true }, "v-accordion--flat"],
      [{ disabled: true }, "v-accordion--disabled"],
    ])("%o adds %s", (props, expected) => {
      expect(accordion(props).classes()).toContain(expected);
    });
  });

  describe("slots", () => {
    it("lets a global header slot replace the default markup", () => {
      const w = accordion({}, { header: "<b class='custom-header'>Custom</b>" });
      expect(w.findAll(".custom-header")).toHaveLength(3);
      expect(w.find(".v-accordion__title").exists()).toBe(false);
    });

    it("lets a per-item header slot win over the global one", () => {
      const w = accordion({}, {
        header: "<b class='global'>G</b>",
        "header-returns": "<b class='specific'>S</b>",
      });
      expect(w.findAll(".specific")).toHaveLength(1);
      expect(w.findAll(".global")).toHaveLength(2);
    });

    it("does the same for content", () => {
      const w = accordion({}, {
        content: "<b class='global-c'>G</b>",
        "content-shipping": "<b class='specific-c'>S</b>",
      });
      expect(w.findAll(".specific-c")).toHaveLength(1);
      expect(w.findAll(".global-c")).toHaveLength(2);
      expect(w.find(".v-accordion__text").exists()).toBe(false);
    });
  });
});
