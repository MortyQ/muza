import { defineComponent } from "vue";

import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-vue";
import { createMemoryHistory, createRouter } from "vue-router";

import VTab, { type ITab } from "../../../../src/components/layout/VTab.vue";
import { applyTheme } from "../../../setup/theme";

/**
 * VTab moves tabs that do not fit into a dropdown. That calculation reads
 * `offsetWidth` on the container and on every button, so jsdom — where every
 * width is zero — makes the component bail out early and keep the full list.
 * The behaviour only exists in a real engine, which is why it lives here rather
 * than in the unit project.
 */

const MANY: ITab[] = Array.from({ length: 12 }, (_, i) => ({
  id: `tab-${i}`,
  label: `Section number ${i}`,
}));

const FEW: ITab[] = [
  { id: "one", label: "One" },
  { id: "two", label: "Two" },
];

const RouteStub = defineComponent({ name: "RouteStub", template: "<div />" });

function router() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/", component: RouteStub },
      { path: "/:pathMatch(.*)*", component: RouteStub },
    ],
  });
}

async function mountTabs(tabs: ITab[], width: string): Promise<HTMLElement> {
  await applyTheme("light");

  const host = document.createElement("div");
  host.style.width = width;
  document.body.appendChild(host);

  const r = router();
  await r.push("/");
  await r.isReady();

  const screen = render(VTab, { props: { tabs, useHash: false }, global: { plugins: [r] } });
  host.append(...Array.from(screen.container.childNodes));

  // The component waits a tick plus a frame before measuring, then debounces
  // resize recalculations by 100ms.
  await new Promise(resolve => requestAnimationFrame(() => resolve(null)));
  await new Promise(resolve => setTimeout(resolve, 200));

  return host;
}

describe("VTab overflow", () => {
  it("keeps every tab visible when they all fit", async () => {
    const host = await mountTabs(FEW, "1000px");
    expect(host.querySelectorAll(".v-tab-btn")).toHaveLength(2);
    expect(host.querySelector(".v-tab__more")).toBeNull();
  });

  it("moves the tabs that do not fit into a dropdown", async () => {
    const host = await mountTabs(MANY, "400px");
    const visible = host.querySelectorAll(".v-tab-btn:not(.more-button)");

    expect(visible.length).toBeGreaterThan(0);
    expect(visible.length).toBeLessThan(MANY.length);
    expect(host.querySelector(".v-tab__more")).not.toBeNull();
  });

  it("keeps the visible tabs inside the container", async () => {
    const host = await mountTabs(MANY, "400px");
    const containerRight = (host.querySelector(".v-tab__list-wrapper") as HTMLElement)
      .getBoundingClientRect().right;

    for (const button of host.querySelectorAll(".v-tab-btn:not(.more-button)")) {
      // A one-pixel tolerance: sub-pixel layout rounding, not overflow.
      expect(button.getBoundingClientRect().right).toBeLessThanOrEqual(containerRight + 1);
    }
  });

  it("shows more tabs as the container grows", async () => {
    const narrow = await mountTabs(MANY, "400px");
    const wide = await mountTabs(MANY, "1200px");

    const count = (host: HTMLElement) =>
      host.querySelectorAll(".v-tab-btn:not(.more-button)").length;

    expect(count(wide)).toBeGreaterThan(count(narrow));
  });
});
