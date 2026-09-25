import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import VButton from "../../../src/components/base/VButton.vue";
import VIcon from "../../../src/components/base/VIcon.vue";
import { mountWithRouter } from "../../setup/mount";

const VARIANTS = [
  "primary", "secondary", "positive", "negative", "warning", "link", "neutral", "info",
] as const;

describe("VButton", () => {
  it("renders text from the prop", () => {
    const w = mount(VButton, { props: { text: "Save" } });
    expect(w.text()).toBe("Save");
  });

  it("prefers the default slot over the text prop", () => {
    const w = mount(VButton, { props: { text: "Save" }, slots: { default: "Publish" } });
    expect(w.text()).toBe("Publish");
    expect(w.text()).not.toContain("Save");
  });

  it.each(VARIANTS)("maps variant %s onto its own modifier class", (variant) => {
    const w = mount(VButton, { props: { variant } });
    expect(w.classes()).toContain(`v-button--${variant}`);
  });

  it("treats `default` as an alias of primary", () => {
    const w = mount(VButton, { props: { variant: "default" } });
    expect(w.classes()).toContain("v-button--primary");
    expect(w.classes()).not.toContain("v-button--default");
  });

  it("renders a button element with the requested type", () => {
    const w = mount(VButton, { props: { type: "submit" } });
    expect(w.element.tagName).toBe("BUTTON");
    expect(w.attributes("type")).toBe("submit");
  });

  it("marks itself icon-only when there is an icon and no label", () => {
    const w = mount(VButton, { props: { icon: "lucide:plus" } });
    expect(w.classes()).toContain("v-button--icon-only");
  });

  it("is not icon-only once a label is present", () => {
    const w = mount(VButton, { props: { icon: "lucide:plus", text: "Add" } });
    expect(w.classes()).not.toContain("v-button--icon-only");
  });

  describe("disabled and loading", () => {
    it("disables the underlying button when disabled", () => {
      const w = mount(VButton, { props: { disabled: true } });
      expect(w.attributes("disabled")).toBeDefined();
      expect(w.classes()).toContain("v-button--disabled");
    });

    it("blocks input while loading, and exposes aria-busy", () => {
      const w = mount(VButton, { props: { loading: true } });
      expect(w.attributes("disabled")).toBeDefined();
      expect(w.attributes("aria-busy")).toBe("true");
    });

    it("marks loading as busy, not as disabled", () => {
      // Both block input; only `disabled` dims. A loading button is busy with
      // what was just asked of it, and dimming it would hide the spinner.
      const w = mount(VButton, { props: { loading: true } });
      expect(w.classes()).toContain("v-button--loading");
      expect(w.classes()).not.toContain("v-button--disabled");
    });

    it("lets disabled win when both are set", () => {
      const w = mount(VButton, { props: { loading: true, disabled: true } });
      expect(w.classes()).toContain("v-button--disabled");
      expect(w.classes()).not.toContain("v-button--loading");
    });

    it("does not set aria-busy when idle", () => {
      const w = mount(VButton, {});
      expect(w.attributes("aria-busy")).toBeUndefined();
    });

    it("emits no click when disabled", async () => {
      const w = mount(VButton, { props: { disabled: true } });
      await w.trigger("click");
      expect(w.emitted("click")).toBeUndefined();
    });

    it("emits a click when enabled", async () => {
      const w = mount(VButton, {});
      await w.trigger("click");
      expect(w.emitted("click")).toHaveLength(1);
    });
  });

  describe("slots", () => {
    it("renders iconLeft in place of the icon prop", () => {
      const w = mount(VButton, {
        props: { text: "Add", icon: "lucide:plus" },
        slots: { iconLeft: "<i class='custom-left' />" },
      });
      expect(w.find(".custom-left").exists()).toBe(true);
    });

    it("renders iconRight only when the slot is provided", () => {
      const without = mount(VButton, { props: { text: "Next" } });
      expect(without.find(".custom-right").exists()).toBe(false);

      const w = mount(VButton, {
        props: { text: "Next" },
        slots: { iconRight: "<i class='custom-right' />" },
      });
      expect(w.find(".custom-right").exists()).toBe(true);
    });
  });

  describe("the chrome", () => {
    // There is one chrome and no prop to choose another, so what is left to
    // assert is the icon size it implies — the rest is scoped SCSS that jsdom
    // never applies.
    it("sizes the icon to fit the 30px track", () => {
      const w = mount(VButton, { props: { icon: "lucide:plus" } });
      expect(w.findComponent(VIcon).props("size")).toBe(15);
    });

    it("hands the same size to the spinner it hands to the icon", () => {
      const w = mount(VButton, { props: { loading: true } });
      const icon = w.findComponent(VIcon);
      expect(icon.props("size")).toBe(15);
      expect(icon.props("loading")).toBe(true);
    });
  });

  describe("size scale", () => {
    it.each(["sm", "md", "lg"] as const)("adds the %s modifier", (size) => {
      expect(mount(VButton, { props: { size } }).classes()).toContain(`v-button--${size}`);
    });

    it("adds no size class when the prop is left off", () => {
      const classes = mount(VButton, {}).classes();
      expect(classes.some(c => /^v-button--(?:sm|md|lg)$/.test(c))).toBe(false);
    });
  });

  describe("router link mode", () => {
    it("renders an anchor pointing at the resolved route", async () => {
      const w = await mountWithRouter(VButton, {
        props: { text: "Go", to: { name: "target" } },
      });
      expect(w.element.tagName).toBe("A");
      expect(w.attributes("href")).toBe("/target");
    });

    it("communicates disabled state through aria, not the disabled attribute", async () => {
      const w = await mountWithRouter(VButton, {
        props: { text: "Go", to: "/target", disabled: true },
      });
      expect(w.attributes("aria-disabled")).toBe("true");
      expect(w.attributes("tabindex")).toBe("-1");
      // An anchor has no `disabled` attribute; setting one would do nothing.
      expect(w.attributes("disabled")).toBeUndefined();
    });

    it("leaves aria-disabled off when enabled", async () => {
      const w = await mountWithRouter(VButton, {
        props: { text: "Go", to: "/target" },
      });
      expect(w.attributes("aria-disabled")).toBeUndefined();
      expect(w.attributes("tabindex")).toBeUndefined();
    });
  });
});
