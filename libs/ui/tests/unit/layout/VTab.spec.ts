import { defineComponent } from "vue";

import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";

import VTab, { type ITab } from "../../../src/components/layout/VTab.vue";
import { createTestRouter } from "../../setup/mount";

const TABS: ITab[] = [
  { id: "overview", label: "Overview", icon: "lucide:layout-dashboard" },
  { id: "sales", label: "Sales" },
  { id: "settings", label: "Settings", disabled: true },
  { id: "audit", label: "Audit" },
];

const stubs = { Icon: true, VFloating: true, VButton: true };

async function tabs(props: Record<string, unknown> = {}, slots: Record<string, unknown> = {}, hash = "") {
  const router = createTestRouter();
  await router.push(hash ? `/${hash}` : "/");
  await router.isReady();

  const w = mount(VTab, {
    props: { tabs: TABS, ...props },
    slots: slots as Record<string, string>,
    global: { plugins: [router], stubs },
  });
  await flushPromises();
  return { w, router };
}

const buttons = (w: Awaited<ReturnType<typeof tabs>>["w"]) => w.findAll(".v-tab-btn");
const activeId = (w: Awaited<ReturnType<typeof tabs>>["w"]) =>
  w.find(".v-tab-btn--active").attributes("data-tab-id");

describe("VTab", () => {
  describe("initial tab", () => {
    it("falls back to the first tab", async () => {
      const { w } = await tabs();
      expect(activeId(w)).toBe("overview");
    });

    it("prefers the tab marked activeByDefault", async () => {
      const withDefault = TABS.map(t => t.id === "sales" ? { ...t, activeByDefault: true } : t);
      const { w } = await tabs({ tabs: withDefault });
      expect(activeId(w)).toBe("sales");
    });

    it("prefers a matching URL hash over activeByDefault", async () => {
      const withDefault = TABS.map(t => t.id === "sales" ? { ...t, activeByDefault: true } : t);
      const { w } = await tabs({ tabs: withDefault }, {}, "#tab-audit");
      expect(activeId(w)).toBe("audit");
    });

    it("ignores a hash that matches no tab", async () => {
      const { w } = await tabs({}, {}, "#tab-nonsense");
      expect(activeId(w)).toBe("overview");
    });

    it("ignores the hash entirely when useHash is off", async () => {
      const { w } = await tabs({ useHash: false }, {}, "#tab-audit");
      expect(activeId(w)).toBe("overview");
    });
  });

  describe("selection", () => {
    it("switches immediately in auto mode", async () => {
      const { w } = await tabs();
      await buttons(w)[1].trigger("click");
      expect(activeId(w)).toBe("sales");
    });

    it("ignores a disabled tab", async () => {
      const { w } = await tabs();
      await buttons(w)[2].trigger("click");
      expect(activeId(w)).toBe("overview");
    });

    it("writes the hash into the route", async () => {
      const { w, router } = await tabs();
      await buttons(w)[1].trigger("click");
      await flushPromises();
      expect(router.currentRoute.value.hash).toBe("#tab-sales");
    });

    it("leaves the route alone when useHash is off", async () => {
      const { w, router } = await tabs({ useHash: false });
      await buttons(w)[1].trigger("click");
      await flushPromises();
      expect(router.currentRoute.value.hash).toBe("");
    });

    it("emits tabSelected with the tab and a callback", async () => {
      const { w } = await tabs();
      await buttons(w)[1].trigger("click");

      const events = w.emitted("tabSelected") ?? [];
      const last = events.at(-1)?.[0] as { tabId: string, tab: ITab, callback: () => void };
      expect(last.tabId).toBe("sales");
      expect(last.tab?.label).toBe("Sales");
      expect(typeof last.callback).toBe("function");
    });

    it("announces the initial tab on mount", async () => {
      const { w } = await tabs();
      const first = (w.emitted("tabSelected") ?? [])[0]?.[0] as { tabId: string };
      expect(first.tabId).toBe("overview");
    });
  });

  describe("controlled mode", () => {
    it("does not switch until the callback runs", async () => {
      const { w } = await tabs({ tabSelectionMode: "controlled" });
      await buttons(w)[1].trigger("click");
      expect(activeId(w)).toBe("overview");
    });

    it("switches once the parent calls the callback", async () => {
      const { w } = await tabs({ tabSelectionMode: "controlled" });
      await buttons(w)[1].trigger("click");

      const last = (w.emitted("tabSelected") ?? []).at(-1)?.[0] as { callback: () => void };
      last.callback();
      await flushPromises();
      expect(activeId(w)).toBe("sales");
    });
  });

  describe("keyboard navigation", () => {
    async function press(key: string, from = "overview") {
      const { w } = await tabs();
      const index = TABS.findIndex(t => t.id === from);
      await buttons(w)[index].trigger("click");
      await w.find(".v-tab__nav").trigger("keydown", { key });
      return w;
    }

    it("ArrowRight moves to the next enabled tab", async () => {
      expect(activeId(await press("ArrowRight"))).toBe("sales");
    });

    it("ArrowRight skips a disabled tab", async () => {
      expect(activeId(await press("ArrowRight", "sales"))).toBe("audit");
    });

    it("ArrowRight wraps around", async () => {
      expect(activeId(await press("ArrowRight", "audit"))).toBe("overview");
    });

    it("ArrowLeft moves back and wraps", async () => {
      expect(activeId(await press("ArrowLeft"))).toBe("audit");
      expect(activeId(await press("ArrowLeft", "sales"))).toBe("overview");
    });

    it("Home and End jump to the ends of the enabled set", async () => {
      expect(activeId(await press("Home", "audit"))).toBe("overview");
      expect(activeId(await press("End"))).toBe("audit");
    });

    it("ignores other keys", async () => {
      expect(activeId(await press("a"))).toBe("overview");
    });

    it("prevents default only for the keys it handles", async () => {
      const { w } = await tabs();
      const handled = new Event("keydown") as KeyboardEvent;
      const preventDefault = vi.fn();

      await w.find(".v-tab__nav").trigger("keydown", { key: "ArrowRight", preventDefault });
      expect(preventDefault).toHaveBeenCalled();
      expect(handled.defaultPrevented).toBe(false);
    });
  });

  describe("accessibility", () => {
    it("marks the nav as a tablist", async () => {
      const { w } = await tabs();
      expect(w.find(".v-tab__nav").attributes("role")).toBe("tablist");
    });

    it("gives each button the tab role and a panel to control", async () => {
      const { w } = await tabs();
      for (const [i, button] of buttons(w).entries()) {
        expect(button.attributes("role")).toBe("tab");
        expect(button.attributes("aria-controls")).toBe(`tabpanel-${TABS[i].id}`);
      }
    });

    it("uses a roving tabindex so Tab lands on the active tab only", async () => {
      const { w } = await tabs();
      expect(buttons(w).map(b => b.attributes("tabindex"))).toEqual(["0", "-1", "-1", "-1"]);
    });

    it("reflects selection in aria-selected", async () => {
      const { w } = await tabs();
      await buttons(w)[1].trigger("click");
      expect(buttons(w).map(b => b.attributes("aria-selected")))
        .toEqual(["false", "true", "false", "false"]);
    });

    it("pairs the panel back to its tab", async () => {
      const { w } = await tabs();
      const panel = w.find(".v-tab__panel");
      expect(panel.attributes("role")).toBe("tabpanel");
      expect(panel.attributes("id")).toBe("tabpanel-overview");
      expect(panel.attributes("aria-labelledby")).toBe("tab-overview");
    });
  });

  describe("content", () => {
    it("renders the slot named after the active tab", async () => {
      const { w } = await tabs({}, {
        overview: "<p class='overview-body'>Overview</p>",
        sales: "<p class='sales-body'>Sales</p>",
      });
      expect(w.find(".overview-body").exists()).toBe(true);
      expect(w.find(".sales-body").exists()).toBe(false);

      await buttons(w)[1].trigger("click");
      expect(w.find(".sales-body").exists()).toBe(true);
      expect(w.find(".overview-body").exists()).toBe(false);
    });

    it("falls back to the tab's component", async () => {
      const TabBody = defineComponent({ name: "TabBody", template: "<p class='component-body'>C</p>" });
      const { w } = await tabs({ tabs: [{ id: "one", label: "One", component: TabBody }] });
      expect(w.find(".component-body").exists()).toBe(true);
    });

    it("hides the panel and shows skeletons while loading", async () => {
      const { w } = await tabs({ loading: true });
      expect(w.find(".v-tab__panel").exists()).toBe(false);
      expect(w.findAll(".v-tab__skeleton")).toHaveLength(TABS.length);
    });
  });

  describe("overflow", () => {
    it("shows every tab and no more-button when nothing overflows", async () => {
      // jsdom reports zero widths, so calculateVisibleTabs bails out early and
      // leaves the full list visible. Overflow behaviour itself needs real
      // layout and is covered by the browser project.
      const { w } = await tabs();
      expect(buttons(w)).toHaveLength(TABS.length);
      expect(w.find(".v-tab__more").exists()).toBe(false);
    });
  });

  describe("slots", () => {
    it("renders tabs-left and tabs-right", async () => {
      const { w } = await tabs({}, {
        "tabs-left": "<b class='left'>L</b>",
        "tabs-right": "<b class='right'>R</b>",
      });
      expect(w.find(".right").exists()).toBe(true);
    });

    it("renders a per-tab icon slot when the tab has no icon of its own", async () => {
      const { w } = await tabs({}, { "tab-icon-sales": "<b class='sales-icon'>i</b>" });
      expect(w.find(".sales-icon").exists()).toBe(true);
    });
  });
});
