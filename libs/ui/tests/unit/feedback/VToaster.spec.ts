import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { Toaster } from "vue-sonner";

import VToaster from "../../../src/components/feedback/VToaster.vue";

/**
 * VToaster is a thin configuration wrapper around vue-sonner. Its own contract
 * is exactly the props it pins down, so that is all this asserts — re-testing
 * vue-sonner's rendering would only duplicate its own suite.
 */
describe("VToaster", () => {
  const toaster = () => mount(VToaster, { global: { stubs: { Toaster: true } } })
    .findComponent(Toaster);

  it("renders a Toaster", () => {
    expect(toaster().exists()).toBe(true);
  });

  it("pins the position to top-right", () => {
    expect(toaster().props().position).toBe("top-right");
  });

  it("pins the duration to four seconds", () => {
    expect(toaster().props().duration).toBe(4000);
  });

  it("enables the close button", () => {
    expect(toaster().props().closeButton).toBe(true);
  });

  describe("toast options", () => {
    const options = () => toaster().props().toastOptions as {
      unstyled: boolean
      classes: Record<string, string>
    };

    it("opts out of vue-sonner's own styles", () => {
      // The library's default CSS ignores --ui-* entirely; unstyled is what
      // lets vtoaster.scss own the appearance.
      expect(options().unstyled).toBe(true);
    });

    it("maps every slot onto a local class", () => {
      expect(options().classes).toEqual({
        toast: "toast-custom",
        title: "toast-title",
        description: "toast-description",
        actionButton: "toast-action",
        cancelButton: "toast-cancel",
        closeButton: "toast-close",
        error: "toast-error",
        success: "toast-success",
        warning: "toast-warning",
        info: "toast-info",
      });
    });
  });
});
