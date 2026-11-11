import { nextTick } from "vue";

import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import VDrawer from "../../../src/components/overlay/VDrawer.vue";
import VModal from "../../../src/components/overlay/VModal.vue";
import { useModalRegisterer } from "../../../src/composables/useModalRegister";

/**
 * A modal surface has to take focus when it opens, keep Tab inside, close on Escape and give
 * focus back to whatever opened it. Before useDialogFocus none of that happened: focus stayed on
 * the trigger behind the backdrop, so the Escape handler on the dialog never even received the
 * key (reviewer audit, R-A11Y-06).
 */

const stubs = { Icon: true };
const registry = useModalRegisterer();

let trigger: HTMLButtonElement;

beforeEach(() => {
  registry.modals.value.clear();
  trigger = document.createElement("button");
  trigger.textContent = "Open";
  document.body.appendChild(trigger);
  trigger.focus();
});

afterEach(() => {
  trigger.remove();
});

const flush = async () => {
  await nextTick();
  await nextTick();
};

describe.each([
  ["VModal", VModal, ".v-modal__container"],
  ["VDrawer", VDrawer, ".v-drawer__container"],
] as const)("%s", (_name, Component, containerSelector) => {
  const mountDialog = (props: Record<string, unknown> = {}) => mount(Component, {
    props: { id: "dlg", title: "Edit product", ...props },
    slots: { default: "<input class='field'>" },
    global: { stubs },
    attachTo: document.body,
  });

  it("is announced as a modal dialog named by its title", async () => {
    const w = mountDialog();
    registry.open("dlg");
    await flush();

    const dialog = w.find(containerSelector);
    expect(dialog.attributes("role")).toBe("dialog");
    expect(dialog.attributes("aria-modal")).toBe("true");
    const labelledBy = dialog.attributes("aria-labelledby");
    expect(labelledBy && document.getElementById(labelledBy)?.textContent?.trim())
      .toBe("Edit product");
    w.unmount();
  });

  it("moves focus into itself when it opens", async () => {
    const w = mountDialog();
    registry.open("dlg");
    await flush();

    expect(w.find(containerSelector).element.contains(document.activeElement)).toBe(true);
    w.unmount();
  });

  it("closes on Escape once open, with no click first", async () => {
    const w = mountDialog();
    registry.open("dlg");
    await flush();

    document.activeElement?.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await flush();
    expect(w.emitted("close")).toHaveLength(1);
    w.unmount();
  });

  it("returns focus to the trigger when it closes", async () => {
    const w = mountDialog();
    registry.open("dlg");
    await flush();
    registry.close("dlg");
    await flush();

    expect(document.activeElement).toBe(trigger);
    w.unmount();
  });

  it("wraps Tab from the last focusable element back to the first", async () => {
    const w = mountDialog();
    registry.open("dlg");
    await flush();

    const focusables = w.find(containerSelector).element
      .querySelectorAll<HTMLElement>("button, input");
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    last?.focus();
    last?.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true }));

    expect(document.activeElement).toBe(first);
    w.unmount();
  });
});
