import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import VLoader, { type LoaderVariant } from "../../../src/components/feedback/VLoader.vue";

const VARIANTS: LoaderVariant[] = ["primary", "secondary", "success", "warning", "danger", "info"];

function loader(props: Record<string, unknown> = {}, slots: Record<string, string> = {}) {
  return mount(VLoader, { props, slots });
}

describe("VLoader", () => {
  it("announces itself as a status region", () => {
    const w = loader();
    expect(w.attributes("role")).toBe("status");
    expect(w.attributes("aria-label")).toBe("Loading");
  });

  it.each(["sm", "md", "lg"] as const)("applies the %s size to the spinner", (size) => {
    expect(loader({ size }).find(".v-loader").classes()).toContain(`v-loader--${size}`);
  });

  it.each(VARIANTS)("applies the %s variant to the spinner", (variant) => {
    expect(loader({ variant }).find(".v-loader").classes()).toContain(`v-loader--${variant}`);
  });

  it("adds no variant class when none is given", () => {
    const classes = loader().find(".v-loader").classes();
    for (const variant of VARIANTS) {
      expect(classes).not.toContain(`v-loader--${variant}`);
    }
  });

  it("keeps the size and variant classes on the spinner, not the container", () => {
    const w = loader({ size: "lg", variant: "danger" });
    expect(w.classes()).not.toContain("v-loader--lg");
    expect(w.classes()).toContain("v-loader-container");
  });

  describe("fullscreen", () => {
    it("is off by default", () => {
      expect(loader().classes()).not.toContain("v-loader--fullscreen");
    });

    it("marks the container when on", () => {
      expect(loader({ fullscreen: true }).classes()).toContain("v-loader--fullscreen");
    });
  });

  describe("message", () => {
    it("renders none by default", () => {
      expect(loader().find(".v-loader-message").exists()).toBe(false);
    });

    it("renders the message when given", () => {
      expect(loader({ message: "Loading products" }).find(".v-loader-message").text())
        .toBe("Loading products");
    });

    it("treats an empty message as absent", () => {
      expect(loader({ message: "" }).find(".v-loader-message").exists()).toBe(false);
    });

    it("lets the default slot replace it", () => {
      const w = loader({ message: "Loading" }, { default: "<b class='custom'>Almost there</b>" });
      expect(w.find(".custom").text()).toBe("Almost there");
      expect(w.find(".v-loader-message").exists()).toBe(false);
    });
  });
});
