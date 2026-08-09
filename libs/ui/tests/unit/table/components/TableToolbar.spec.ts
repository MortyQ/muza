import { h } from "vue";

import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import VButton from "../../../../src/components/base/VButton.vue";
import VIcon from "../../../../src/components/base/VIcon.vue";
import VInput from "../../../../src/components/inputs/VInput.vue";
import VFloating from "../../../../src/components/overlay/VFloating.vue";
import TableEmptyState from "../../../../src/components/table/components/TableEmptyState.vue";
import TableTitleBlock from "../../../../src/components/table/components/TableTitleBlock.vue";
import TableToolbar from "../../../../src/components/table/components/TableToolbar.vue";
import type { ToolbarConfig } from "../../../../src/components/table/types/toolbar";

/**
 * The toolbar resolves three shorthand-or-object configs (search, export, and
 * the action flags) and arbitrates between two slot sources: the named slots a
 * caller passes directly, and the ones VTable injects under `tableSlots` to
 * avoid drilling them through. The injected one wins, and that precedence is
 * the part worth pinning — it decides whose markup a consumer actually sees.
 */

const stubs = { Icon: true };

function toolbar(config?: ToolbarConfig, options = {}) {
  return mount(TableToolbar, { props: { config }, global: { stubs }, ...options });
}

const buttonWithText = (w: ReturnType<typeof toolbar>, text: string) =>
  w.findAllComponents(VButton).find(b => b.props("text") === text);

describe("TableToolbar", () => {
  describe("title", () => {
    it("renders nothing without a config", () => {
      expect(toolbar().find(".v-toolbar-title").exists()).toBe(false);
    });

    it("renders the configured title", () => {
      expect(toolbar({ title: "Orders" }).find(".v-toolbar-title").text()).toBe("Orders");
    });

    it("renders a subtitle only alongside a title", () => {
      const w = toolbar({ title: "Orders", subtitle: "Last 30 days" });
      expect(w.find(".v-toolbar-subtitle").text()).toBe("Last 30 days");
    });

    it("omits the subtitle when there is none", () => {
      expect(toolbar({ title: "Orders" }).find(".v-toolbar-subtitle").exists()).toBe(false);
    });

    it("lets a title slot replace the configured title", () => {
      const w = toolbar({ title: "Orders" }, { slots: { title: "<b class=\"own\">Mine</b>" } });
      expect(w.find(".own").exists()).toBe(true);
      expect(w.find(".v-toolbar-title").exists()).toBe(false);
    });

    it("prefers the injected slot over the passed one", () => {
      const w = toolbar({ title: "Orders" }, {
        slots: { title: "<b class=\"own\">Mine</b>" },
        global: {
          stubs,
          provide: { tableSlots: { toolbarTitle: () => h("b", { class: "injected" }, "VTable") } },
        },
      });

      expect(w.find(".injected").exists()).toBe(true);
      expect(w.find(".own").exists()).toBe(false);
    });
  });

  describe("search", () => {
    it("renders no field by default", () => {
      expect(toolbar().findComponent(VInput).exists()).toBe(false);
    });

    it("renders a field with a default placeholder for `search: true`", () => {
      const input = toolbar({ search: true }).findComponent(VInput);
      expect(input.exists()).toBe(true);
      expect(input.props("placeholder")).toBe("Search...");
    });

    it("takes a custom placeholder from the object form", () => {
      const input = toolbar({ search: { placeholder: "Find an order" } }).findComponent(VInput);
      expect(input.props("placeholder")).toBe("Find an order");
    });

    it("renders no field for `search: false`", () => {
      expect(toolbar({ search: false }).findComponent(VInput).exists()).toBe(false);
    });

    it("shows the current query", () => {
      const w = mount(TableToolbar, {
        props: { config: { search: true }, search: "widgets" },
        global: { stubs },
      });
      expect(w.findComponent(VInput).props("modelValue")).toBe("widgets");
    });

    it("emits update:search as the user types", async () => {
      const w = toolbar({ search: true });
      await w.findComponent(VInput).vm.$emit("update:modelValue", "wid");

      expect(w.emitted("update:search")![0]).toEqual(["wid"]);
    });

    it("debounces, so a request does not fire per keystroke", () => {
      expect(toolbar({ search: true }).findComponent(VInput).props("debounce")).toBeTruthy();
    });

    it("lets a search slot replace the field", () => {
      const w = toolbar({ search: true }, { slots: { search: "<b class=\"own\" />" } });
      expect(w.find(".own").exists()).toBe(true);
      expect(w.findComponent(VInput).exists()).toBe(false);
    });
  });

  describe("action buttons", () => {
    it("renders none by default", () => {
      expect(toolbar().findAllComponents(VButton)).toHaveLength(0);
    });

    it("renders refresh when enabled", async () => {
      const w = toolbar({ actions: { refresh: true } });
      const button = w.findAllComponents(VButton)[0];

      expect(button.props("icon")).toBe("lucide:refresh-cw");
      await button.vm.$emit("click");
      expect(w.emitted("refresh")).toHaveLength(1);
    });

    it("renders reset-sort when enabled", async () => {
      const w = toolbar({ actions: { resetSort: true } });
      const button = buttonWithText(w, "Reset Sort")!;

      await button.vm.$emit("click");
      expect(w.emitted("reset-sort")).toHaveLength(1);
    });

    it("renders the column-setup slot only when the action is on", () => {
      const slots = { "column-setup": "<div class=\"setup\" />" };
      expect(toolbar({ actions: { columnSetup: true } }, { slots })
        .find(".setup").exists()).toBe(true);
      expect(toolbar({}, { slots }).find(".setup").exists()).toBe(false);
    });

    it("renders an actions slot", () => {
      expect(toolbar({}, { slots: { actions: "<b class=\"own\" />" } })
        .find(".own").exists()).toBe(true);
    });

    it("prefers the injected actions slot", () => {
      const w = toolbar({}, {
        slots: { actions: "<b class=\"own\" />" },
        global: {
          stubs,
          provide: { tableSlots: { toolbarActions: () => h("b", { class: "injected" }) } },
        },
      });

      expect(w.find(".injected").exists()).toBe(true);
      expect(w.find(".own").exists()).toBe(false);
    });
  });

  describe("export", () => {
    it("renders nothing by default", () => {
      expect(buttonWithText(toolbar(), "Export")).toBeUndefined();
    });

    it("renders one button in single mode", async () => {
      const w = toolbar({ actions: { export: "single" } });
      const button = buttonWithText(w, "Export")!;

      await button.vm.$emit("click");
      expect(w.emitted("export")![0]).toEqual(["csv", false]);
    });

    it("carries selectedOnly through from the object form", async () => {
      const w = toolbar({ actions: { export: { mode: "single", selectedOnly: true } } });
      await buttonWithText(w, "Export")!.vm.$emit("click");

      expect(w.emitted("export")![0]).toEqual(["csv", true]);
    });

    it("disables the single button while loading", () => {
      const w = toolbar({ actions: { export: { mode: "single", loading: true } } });
      const button = buttonWithText(w, "Export")!;

      expect(button.props("loading")).toBe(true);
      expect(button.props("disabled")).toBe(true);
    });

    it("renders a dropdown in multi mode", () => {
      const w = toolbar({
        actions: { export: { mode: "multi", formats: [{ label: "CSV", value: "csv" }] } },
      });
      expect(w.findComponent(VFloating).props("items"))
        .toEqual([{ label: "CSV", value: "csv" }]);
    });

    it("emits the chosen format", async () => {
      const w = toolbar({
        actions: {
          export: {
            mode: "multi",
            selectedOnly: true,
            formats: [{ label: "XLSX", value: "xlsx" }],
          },
        },
      });
      await w.findComponent(VFloating).vm.$emit("select", "xlsx");

      expect(w.emitted("export")![0]).toEqual(["xlsx", true]);
    });

    it("stringifies a numeric format value", async () => {
      const w = toolbar({ actions: { export: { mode: "multi", formats: [] } } });
      await w.findComponent(VFloating).vm.$emit("select", 2);

      expect(w.emitted("export")![0][0]).toBe("2");
    });

    it("shows the trigger as loading when any one format is", () => {
      const w = toolbar({
        actions: {
          export: {
            mode: "multi",
            formats: [{ label: "CSV", value: "csv" }, { label: "XLSX", value: "xlsx", loading: true }],
          },
        },
      });

      expect(buttonWithText(w, "Export")!.props("loading")).toBe(true);
    });

    it("renders neither shape for an unknown mode", () => {
      const w = toolbar({ actions: { export: "none" as unknown as "single" } });
      expect(buttonWithText(w, "Export")).toBeUndefined();
      expect(w.findComponent(VFloating).exists()).toBe(false);
    });
  });
});

describe("TableEmptyState", () => {
  const empty = (props = {}, options = {}) =>
    mount(TableEmptyState, { props, global: { stubs }, ...options });

  it("renders the container even with nothing in it", () => {
    expect(empty().find(".v-table-empty-state").exists()).toBe(true);
  });

  it("omits every optional part by default", () => {
    const w = empty();
    expect(w.find(".v-table-empty-state-icon").exists()).toBe(false);
    expect(w.find(".v-table-empty-state-title").exists()).toBe(false);
    expect(w.find(".v-table-empty-state-description").exists()).toBe(false);
    expect(w.find(".v-table-empty-state-slot").exists()).toBe(false);
  });

  it("renders a title and a description", () => {
    const w = empty({ title: "Nothing here", description: "Adjust your filters." });
    expect(w.find(".v-table-empty-state-title").text()).toBe("Nothing here");
    expect(w.find(".v-table-empty-state-description").text()).toBe("Adjust your filters.");
  });

  it("renders an icon at a fixed size", () => {
    const w = empty({ icon: "lucide:inbox" });
    expect(w.findComponent(VIcon).props("icon")).toBe("lucide:inbox");
    expect(w.findComponent(VIcon).props("size")).toBe(48);
  });

  it("renders slot content in its own wrapper", () => {
    const w = empty({}, { slots: { default: "<button class=\"cta\">Clear filters</button>" } });
    expect(w.find(".v-table-empty-state-slot .cta").exists()).toBe(true);
  });

  it("uses a heading for the title, so it lands in the document outline", () => {
    expect(empty({ title: "Nothing here" }).find("h3").exists()).toBe(true);
  });
});

describe("TableTitleBlock", () => {
  const block = (props = {}, options = {}) =>
    mount(TableTitleBlock, { props, global: { stubs }, ...options });

  it("renders the title", () => {
    expect(block({ title: "Intraday" }).find(".v-table-title-block__title").text())
      .toBe("Intraday");
  });

  it("omits the title element when empty", () => {
    expect(block().find(".v-table-title-block__title").exists()).toBe(false);
  });

  it("renders an icon when given one", () => {
    const w = block({ icon: "lucide:activity" });
    expect(w.findComponent(VIcon).props("icon")).toBe("lucide:activity");
  });

  it("omits the icon when empty", () => {
    expect(block({ title: "Intraday" }).findComponent(VIcon).exists()).toBe(false);
  });

  it("renders slot content in the actions area", () => {
    const w = block({}, { slots: { default: "<div class=\"toggle\" />" } });
    expect(w.find(".v-table-title-block__actions .toggle").exists()).toBe(true);
  });

  it("omits the actions area without a slot", () => {
    expect(block({ title: "Intraday" }).find(".v-table-title-block__actions").exists())
      .toBe(false);
  });

  it("draws a separator only when there is a title and actions", () => {
    const separator = ".v-table-title-block__separator";
    const slots = { default: "<div />" };

    expect(block({ title: "Intraday" }, { slots }).find(separator).exists()).toBe(true);
    expect(block({ title: "Intraday" }).find(separator).exists()).toBe(false);
    expect(block({}, { slots }).find(separator).exists()).toBe(false);
  });
});
