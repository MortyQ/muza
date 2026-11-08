import { nextTick } from "vue";

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { render } from "vitest-browser-vue";

import VCard from "../../../src/components/layout/VCard.vue";
import VDrawer from "../../../src/components/overlay/VDrawer.vue";
import VModal from "../../../src/components/overlay/VModal.vue";
import { useModalRegisterer } from "../../../src/composables/useModalRegister";
import { applyTheme } from "../../setup/theme";
import { computed as computedValue, tokenAsValue } from "../../setup/tokens";

/**
 * Headings sit on the type scale and the weight scale, not on literals.
 * The scale is theme-independent, so one theme is enough.
 */

function expectStep(el: Element | null, size: string, weight: string): void {
  if (!el) throw new Error("heading not rendered");
  expect(computedValue(el, "font-size")).toBe(tokenAsValue("font-size", `--ui-text-${size}`));
  expect(computedValue(el, "line-height")).toBe(tokenAsValue("line-height", `--ui-leading-${size}`));
  expect(computedValue(el, "font-weight")).toBe(tokenAsValue("font-weight", `--ui-weight-${weight}`));
}

beforeEach(async () => {
  await applyTheme("light");
  useModalRegisterer().modals.value.clear();
});

afterEach(() => {
  useModalRegisterer().modals.value.clear();
});

describe("type scale — headings", () => {
  it("the weight tokens resolve to three distinct steps", () => {
    const weights = ["regular", "medium", "strong"].map(w =>
      tokenAsValue("font-weight", `--ui-weight-${w}`),
    );
    expect(weights).toEqual(["450", "500", "600"]);
  });

  it("VCard title is lg/strong, its subtitle sm/regular", async () => {
    const screen = render(VCard, { props: { title: "Revenue", subtitle: "This month" } });
    const root = screen.container;
    expectStep(root.querySelector(".v-card__title"), "lg", "strong");
    expectStep(root.querySelector(".v-card__subtitle"), "sm", "regular");
  });

  it.each([
    ["VModal", VModal, ".v-modal__title"],
    ["VDrawer", VDrawer, ".v-drawer__title"],
  ] as const)("%s title is xl/strong", async (_name, component, selector) => {
    const id = `type-scale-${selector}`;
    render(component as never, { props: { id, title: "Edit order" } });
    useModalRegisterer().open(id);
    await nextTick();

    // Teleported to body, so query the document, not the render container.
    await expect.poll(() => document.querySelector(selector)).not.toBeNull();
    expectStep(document.querySelector(selector), "xl", "strong");
  });
});
