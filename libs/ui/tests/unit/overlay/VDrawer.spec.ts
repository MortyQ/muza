import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it } from "vitest";

import VDrawer from "../../../src/components/overlay/VDrawer.vue";
import { useModalRegisterer } from "../../../src/composables/useModalRegister";

const stubs = { Icon: true };

beforeEach(() => {
  useModalRegisterer().modals.value.clear();
});

function drawer(props: Record<string, unknown> = {}, slots: Record<string, string> = {}) {
  const id = String(props.id ?? "test-drawer");
  const w = mount(VDrawer, { props: { id, ...props }, slots, global: { stubs } });
  return Object.assign(w, {
    async open() {
      useModalRegisterer().open(id);
      await w.vm.$nextTick();
      return w;
    },
  });
}

const backdrop = (w: ReturnType<typeof drawer>) => w.find(".v-drawer__backdrop");

describe("VDrawer", () => {
  it("renders nothing while closed", () => {
    expect(backdrop(drawer()).exists()).toBe(false);
  });

  it("appears once the registry opens its id", async () => {
    const w = await drawer().open();
    expect(backdrop(w).exists()).toBe(true);
  });

  it("takes its stacking order from the registry, as a custom property", async () => {
    const w = await drawer().open();
    const style = backdrop(w).attributes("style") ?? "";
    expect(style).toContain("--v-drawer-z");
    expect(style).not.toMatch(/(^|;)\s*z-index:/);
  });

  describe("keepAlive", () => {
    it("unmounts the content by default, so state is discarded", async () => {
      const w = await drawer({}, { default: "<p class='body'>x</p>" }).open();
      useModalRegisterer().close("test-drawer");
      await w.vm.$nextTick();
      expect(w.find(".body").exists()).toBe(false);
    });

    it("keeps the content mounted but hidden when asked", async () => {
      // The point is that a form inside the drawer keeps what was typed.
      const w = await drawer({ keepAlive: true }, { default: "<p class='body'>x</p>" }).open();
      useModalRegisterer().close("test-drawer");
      await w.vm.$nextTick();

      expect(w.find(".body").exists()).toBe(true);
      expect(backdrop(w).attributes("style")).toContain("display: none");
    });
  });

  describe("closing", () => {
    it("closes from the close button", async () => {
      const w = await drawer().open();
      await w.find(".v-drawer__close-btn").trigger("click");
      expect(w.emitted("close")).toHaveLength(1);
    });

    it("closes on a backdrop click, and can be told not to", async () => {
      const w = await drawer().open();
      await backdrop(w).trigger("click");
      expect(w.emitted("close")).toHaveLength(1);

      const locked = await drawer({ id: "locked", closeOnBackdrop: false }).open();
      await backdrop(locked).trigger("click");
      expect(locked.emitted("close")).toBeUndefined();
    });

    it("does not close from a click inside the panel", async () => {
      const w = await drawer().open();
      await w.find(".v-drawer__container").trigger("click");
      expect(w.emitted("close")).toBeUndefined();
    });

    it("closes on Escape, and can be told not to", async () => {
      const w = await drawer().open();
      await backdrop(w).trigger("keydown", { key: "Escape" });
      expect(w.emitted("close")).toHaveLength(1);

      const locked = await drawer({ id: "locked", closeOnEscape: false }).open();
      await backdrop(locked).trigger("keydown", { key: "Escape" });
      expect(locked.emitted("close")).toBeUndefined();
    });
  });

  describe("appearance", () => {
    it.each(["left", "right"] as const)("position %s", async (position) => {
      const w = await drawer({ position }).open();
      expect(w.find(".v-drawer__container").classes().join(" ")).toContain(position);
    });

    it.each(["sm", "md", "lg", "xl", "full"] as const)("width %s", async (width) => {
      const w = await drawer({ width }).open();
      expect(w.find(".v-drawer__container").classes().join(" ")).toContain(width);
    });

    it.each(["xs", "sm", "md", "lg"] as const)("backdrop blur %s", async (backdropBlur) => {
      const w = await drawer({ backdropBlur }).open();
      expect(backdrop(w).classes()).toContain(`v-drawer__backdrop--blur-${backdropBlur}`);
    });

    it("adds no blur class when blur is off", async () => {
      const w = await drawer({ backdropBlur: "none" }).open();
      expect(backdrop(w).classes().some(c => c.startsWith("v-drawer__backdrop--blur"))).toBe(false);
    });
  });

  describe("slots", () => {
    it("renders title, content and footer", async () => {
      const w = await drawer({ title: "Filters" }, {
        default: "<p class='body'>x</p>",
        footer: "<b class='foot'>y</b>",
      }).open();

      expect(w.find(".v-drawer__title").text()).toBe("Filters");
      expect(w.find(".v-drawer__content .body").exists()).toBe(true);
      expect(w.find(".v-drawer__footer .foot").exists()).toBe(true);
    });

    it("renders no footer without a slot", async () => {
      const w = await drawer().open();
      expect(w.find(".v-drawer__footer").exists()).toBe(false);
    });

    it("drops the header when there is nothing to put in it", async () => {
      const w = await drawer({ showCloseButton: false }).open();
      expect(w.find(".v-drawer__header").exists()).toBe(false);
    });
  });
});
