import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it } from "vitest";

import VModal from "../../../src/components/overlay/VModal.vue";
import { useModalRegisterer } from "../../../src/composables/useModalRegister";

const stubs = { Icon: true };

beforeEach(() => {
  useModalRegisterer().modals.value.clear();
});

/**
 * Teleport is stubbed globally in the unit setup, which keeps the dialog inline
 * and reachable from the wrapper. Portalling itself is browser behaviour.
 */
function modal(props: Record<string, unknown> = {}, slots: Record<string, string> = {}) {
  const id = String(props.id ?? "test-modal");
  const w = mount(VModal, { props: { id, ...props }, slots, global: { stubs } });
  return Object.assign(w, {
    async open() {
      useModalRegisterer().open(id);
      await w.vm.$nextTick();
      return w;
    },
  });
}

describe("VModal", () => {
  it("renders nothing while closed", () => {
    expect(modal().find(".v-modal__backdrop").exists()).toBe(false);
  });

  it("appears once the registry opens its id", async () => {
    const w = await modal().open();
    expect(w.find(".v-modal__backdrop").exists()).toBe(true);
  });

  it("takes its stacking order from the registry, as a custom property", async () => {
    const w = await modal().open();
    const style = w.find(".v-modal__backdrop").attributes("style") ?? "";
    expect(style).toContain("--v-modal-z");
    expect(style).not.toMatch(/(^|;)\s*z-index:/);
  });

  describe("header", () => {
    it("renders the title", async () => {
      const w = await modal({ title: "Confirm deletion" }).open();
      expect(w.find(".v-modal__title").text()).toBe("Confirm deletion");
    });

    it("keeps the header for the close button alone", async () => {
      const w = await modal().open();
      expect(w.find(".v-modal__header").exists()).toBe(true);
    });

    it("drops the header entirely when there is nothing in it", async () => {
      const w = await modal({ showCloseButton: false }).open();
      expect(w.find(".v-modal__header").exists()).toBe(false);
    });

    it("labels the close button", async () => {
      const w = await modal().open();
      expect(w.find(".v-modal__close-btn").attributes("aria-label")).toBe("Close modal");
    });
  });

  describe("closing", () => {
    it("closes from the close button and says so", async () => {
      const w = await modal().open();
      await w.find(".v-modal__close-btn").trigger("click");

      expect(w.emitted("close")).toHaveLength(1);
      expect(w.find(".v-modal__backdrop").exists()).toBe(false);
    });

    it("closes on a backdrop click", async () => {
      const w = await modal().open();
      await w.find(".v-modal__backdrop").trigger("click");
      expect(w.emitted("close")).toHaveLength(1);
    });

    it("ignores a backdrop click when told to", async () => {
      const w = await modal({ closeOnBackdrop: false }).open();
      await w.find(".v-modal__backdrop").trigger("click");
      expect(w.emitted("close")).toBeUndefined();
    });

    it("does not close when the click started inside the dialog", async () => {
      const w = await modal().open();
      await w.find(".v-modal__container").trigger("click");
      expect(w.emitted("close")).toBeUndefined();
    });

    it("closes on Escape", async () => {
      const w = await modal().open();
      await w.find(".v-modal__backdrop").trigger("keydown", { key: "Escape" });
      expect(w.emitted("close")).toHaveLength(1);
    });

    it("ignores Escape when told to", async () => {
      const w = await modal({ closeOnEscape: false }).open();
      await w.find(".v-modal__backdrop").trigger("keydown", { key: "Escape" });
      expect(w.emitted("close")).toBeUndefined();
    });

    it("ignores other keys", async () => {
      const w = await modal().open();
      await w.find(".v-modal__backdrop").trigger("keydown", { key: "Enter" });
      expect(w.emitted("close")).toBeUndefined();
    });
  });

  describe("footer actions", () => {
    it("renders no footer by default", async () => {
      const w = await modal().open();
      expect(w.find(".v-modal__footer").exists()).toBe(false);
    });

    it("`true` gives the default pair of buttons", async () => {
      const w = await modal({ footerActions: true }).open();
      const labels = w.findAll(".v-modal__footer-actions button").map(b => b.text());
      expect(labels).toEqual(["Cancel", "Confirm"]);
    });

    it("takes overrides for the labels", async () => {
      const w = await modal({
        footerActions: { confirmText: "Delete", cancelText: "Keep" },
      }).open();
      const labels = w.findAll(".v-modal__footer-actions button").map(b => b.text());
      expect(labels).toEqual(["Keep", "Delete"]);
    });

    it("can hide either button", async () => {
      const w = await modal({ footerActions: { showCancel: false } }).open();
      expect(w.findAll(".v-modal__footer-actions button").map(b => b.text()))
        .toEqual(["Confirm"]);
    });

    it("confirm emits without closing, so the parent decides", async () => {
      const w = await modal({ footerActions: true }).open();
      await w.findAll(".v-modal__footer-actions button")[1].trigger("click");

      expect(w.emitted("confirm")).toHaveLength(1);
      expect(w.emitted("close")).toBeUndefined();
      expect(w.find(".v-modal__backdrop").exists()).toBe(true);
    });

    it("cancel closes", async () => {
      const w = await modal({ footerActions: true }).open();
      await w.findAll(".v-modal__footer-actions button")[0].trigger("click");
      expect(w.emitted("close")).toHaveLength(1);
    });

    it("loading disables cancel and puts confirm in its loading state", async () => {
      const w = await modal({ footerActions: true, loading: true }).open();
      const [cancel, confirm] = w.findAll(".v-modal__footer-actions button");
      expect(cancel.attributes("disabled")).toBeDefined();
      expect(confirm.attributes("aria-busy")).toBe("true");
    });

    it("a footer slot replaces the built-in actions", async () => {
      const w = await modal({ footerActions: true }, { footer: "<b class='custom-footer'>x</b>" })
        .open();
      expect(w.find(".custom-footer").exists()).toBe(true);
      expect(w.find(".v-modal__footer-actions").exists()).toBe(false);
    });
  });

  it.each(["sm", "md", "lg", "xl", "2xl", "3xl", "full"] as const)(
    "maxWidth %s reaches the container",
    async (maxWidth) => {
      const w = await modal({ maxWidth }).open();
      expect(w.find(".v-modal__container").classes()).toContain(`v-modal__container--${maxWidth}`);
    },
  );

  it("renders the default slot as content", async () => {
    const w = await modal({}, { default: "<p class='body'>Are you sure?</p>" }).open();
    expect(w.find(".v-modal__content .body").exists()).toBe(true);
  });

  it("two modals with different ids stay independent", async () => {
    const first = await modal({ id: "first" }).open();
    const second = modal({ id: "second" });

    expect(first.find(".v-modal__backdrop").exists()).toBe(true);
    expect(second.find(".v-modal__backdrop").exists()).toBe(false);
  });
});
