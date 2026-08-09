import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-vue";

import VDrawer from "../../../../src/components/overlay/VDrawer.vue";
import VFloating from "../../../../src/components/overlay/VFloating.vue";
import VModal from "../../../../src/components/overlay/VModal.vue";
import { useModalRegisterer } from "../../../../src/composables/useModalRegister";
import { applyTheme, THEME_CASES } from "../../../setup/theme";

/**
 * Overlays teleport to <body> and cover the viewport, so the shared `stage`
 * helper — which frames a component at a fixed width — does not apply. Each
 * case screenshots the portalled panel itself instead.
 */
const ITEMS = [
  { label: "Rename", value: "rename", icon: "lucide:pencil" },
  { label: "Duplicate", value: "duplicate", icon: "lucide:copy" },
  { label: "Delete", value: "delete", icon: "lucide:trash-2", disabled: true },
];

let counter = 0;
const nextId = () => `screenshot-${++counter}`;

async function settle() {
  await new Promise(resolve => requestAnimationFrame(() => resolve(null)));
  await new Promise(resolve => setTimeout(resolve, 60));
  await document.fonts.ready;
}

describe.each(THEME_CASES)("overlay components — %s theme", (theme) => {
  async function openModal(component: unknown, props: Record<string, unknown>, slots = {}) {
    await applyTheme(theme);
    const id = nextId();
    render(component as never, { props: { id, ...props }, slots });
    useModalRegisterer().open(id);
    await settle();
    return document.querySelector(
      component === VModal ? ".v-modal__container" : ".v-drawer__container",
    ) as HTMLElement;
  }

  describe("VModal", () => {
    it("with a title and footer actions", async () => {
      const panel = await openModal(VModal, {
        title: "Delete product",
        footerActions: { confirmText: "Delete", confirmVariant: "negative" },
      }, { default: "This cannot be undone." });
      await expect(panel).toMatchScreenshot(`vmodal-actions-${theme}`);
    });

    it("bare, without a footer", async () => {
      const panel = await openModal(VModal, { title: "Details" }, { default: "Just some copy." });
      await expect(panel).toMatchScreenshot(`vmodal-bare-${theme}`);
    });

    it("loading", async () => {
      const panel = await openModal(VModal, {
        title: "Saving",
        footerActions: true,
        loading: true,
      }, { default: "Hold on." });
      await expect(panel).toMatchScreenshot(`vmodal-loading-${theme}`);
    });
  });

  describe("VDrawer", () => {
    it.each(["left", "right"] as const)("from the %s", async (position) => {
      const panel = await openModal(VDrawer, { title: "Filters", position }, {
        default: "<p>Narrow the list.</p>",
      });
      await expect(panel).toMatchScreenshot(`vdrawer-${position}-${theme}`);
    });

    it("with a footer", async () => {
      const panel = await openModal(VDrawer, { title: "Filters" }, {
        default: "<p>Narrow the list.</p>",
        footer: "<p>3 filters active</p>",
      });
      await expect(panel).toMatchScreenshot(`vdrawer-footer-${theme}`);
    });
  });

  describe("VFloating", () => {
    it("open dropdown", async () => {
      await applyTheme(theme);
      const host = document.createElement("div");
      host.style.position = "fixed";
      host.style.top = "80px";
      host.style.left = "80px";
      document.body.appendChild(host);

      const screen = render(VFloating, {
        props: { items: ITEMS, placement: "bottom-left", teleport: false },
        slots: { trigger: "<button style='width:120px;height:36px'>Actions</button>" },
      });
      host.append(...Array.from(screen.container.childNodes));

      (host.querySelector(".v-floating-trigger") as HTMLElement).click();
      await settle();

      const panel = host.querySelector(".v-floating-content") as HTMLElement;
      await expect(panel).toMatchScreenshot(`vfloating-dropdown-${theme}`);
    });
  });
});
