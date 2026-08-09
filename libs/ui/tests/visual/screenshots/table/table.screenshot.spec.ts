import { describe, expect, it } from "vitest";

import DeltaIndicator from "../../../../src/components/table/components/DeltaIndicator.vue";
import DeltaValue from "../../../../src/components/table/components/DeltaValue.vue";
import TableEmptyState from "../../../../src/components/table/components/TableEmptyState.vue";
import TableHeaderCheckbox from "../../../../src/components/table/components/TableHeaderCheckbox.vue";
import TablePagination from "../../../../src/components/table/components/TablePagination.vue";
import TableTitleBlock from "../../../../src/components/table/components/TableTitleBlock.vue";
import TableToolbar from "../../../../src/components/table/components/TableToolbar.vue";
import VTable from "../../../../src/components/table/VTable.vue";
import { stage } from "../../../setup/stage";
import {
  makeColumns,
  makeFixedColumns,
  makeGroupedColumns,
  makeRows,
  makeTotalRow,
} from "../../../setup/table";
import { THEME_CASES } from "../../../setup/theme";

/**
 * Deliberately narrow. A screenshot of a whole table turns every spacing change
 * anywhere into one enormous diff, so the baselines here are per subcomponent on
 * a fixed frame, plus a handful of whole-table shots in one small fixed set
 * (five columns, four rows) for the states that only exist in composition:
 * pinned columns, the total row, the empty state.
 *
 * Widths are constant per component across its variants — a diff should point
 * at what moved, not at the frame that moved with it.
 *
 * The `VTable` import is load-bearing even for the subcomponent shots. The
 * table's stylesheet is a partial set pulled in by VTable's own unscoped
 * `<style>`, so `TablePagination` mounted on its own renders completely
 * unstyled — and a baseline captured that way looks plausible until someone
 * compares it with the app.
 */

describe.each(THEME_CASES)("table components — %s theme", (theme) => {
  describe("TablePagination", () => {
    it.each([
      ["first", 1],
      ["middle", 10],
      ["last", 20],
    ] as [string, number][])("on the %s page", async (name, page) => {
      const frame = await stage(TablePagination, {
        theme,
        props: { page, pageSize: 10, total: 200 },
        width: 720,
      });
      await expect(frame).toMatchScreenshot(`tablepagination-${name}-${theme}`);
    });

    it("with few enough pages to list them all", async () => {
      const frame = await stage(TablePagination, {
        theme,
        props: { page: 2, pageSize: 10, total: 50 },
        width: 720,
      });
      await expect(frame).toMatchScreenshot(`tablepagination-short-${theme}`);
    });

    it("with the size selector", async () => {
      const frame = await stage(TablePagination, {
        theme,
        props: { page: 2, pageSize: 25, total: 200, showSizeChanger: true },
        width: 720,
      });
      await expect(frame).toMatchScreenshot(`tablepagination-sizes-${theme}`);
    });

    it("while loading", async () => {
      const frame = await stage(TablePagination, {
        theme,
        props: { page: 2, pageSize: 10, total: 200, loading: true },
        width: 720,
      });
      await expect(frame).toMatchScreenshot(`tablepagination-loading-${theme}`);
    });
  });

  describe("TableToolbar", () => {
    it("with a title and subtitle", async () => {
      const frame = await stage(TableToolbar, {
        theme,
        props: { config: { title: "Orders", subtitle: "Last 30 days" } },
        width: 720,
      });
      await expect(frame).toMatchScreenshot(`tabletoolbar-title-${theme}`);
    });

    it("with a search field", async () => {
      const frame = await stage(TableToolbar, {
        theme,
        props: { config: { title: "Orders", search: true } },
        width: 720,
      });
      await expect(frame).toMatchScreenshot(`tabletoolbar-search-${theme}`);
    });

    it("with every action", async () => {
      const frame = await stage(TableToolbar, {
        theme,
        props: {
          config: {
            title: "Orders",
            actions: { refresh: true, resetSort: true, export: "single" },
          },
        },
        width: 720,
      });
      await expect(frame).toMatchScreenshot(`tabletoolbar-actions-${theme}`);
    });
  });

  describe("TableEmptyState", () => {
    it("with an icon, a title and a description", async () => {
      const frame = await stage(TableEmptyState, {
        theme,
        props: {
          icon: "lucide:inbox",
          title: "No orders yet",
          description: "Orders will appear here once a customer checks out.",
        },
        width: 480,
      });
      await expect(frame).toMatchScreenshot(`tableemptystate-full-${theme}`);
    });

    it("with a title alone", async () => {
      const frame = await stage(TableEmptyState, {
        theme,
        props: { title: "No results" },
        width: 480,
      });
      await expect(frame).toMatchScreenshot(`tableemptystate-title-${theme}`);
    });
  });

  describe("TableTitleBlock", () => {
    it("with an icon and a title", async () => {
      const frame = await stage(TableTitleBlock, {
        theme,
        props: { icon: "lucide:activity", title: "Intraday analytics" },
        width: 480,
      });
      await expect(frame).toMatchScreenshot(`tabletitleblock-icon-${theme}`);
    });
  });

  describe("TableHeaderCheckbox", () => {
    it.each(["unchecked", "checked", "indeterminate"] as const)("%s", async (state) => {
      const frame = await stage(TableHeaderCheckbox, { theme, props: { state }, width: 120 });
      await expect(frame).toMatchScreenshot(`tableheadercheckbox-${state}-${theme}`);
    });
  });

  describe("DeltaValue", () => {
    it.each([
      ["positive", 12.5],
      ["negative", -8.25],
      ["zero", 0],
    ] as [string, number][])("%s delta", async (name, delta) => {
      const frame = await stage(DeltaValue, {
        theme,
        props: { value: 12450, delta, format: { type: "currency" } },
        width: 240,
      });
      await expect(frame).toMatchScreenshot(`deltavalue-${name}-${theme}`);
    });

    it.each(["sm", "default", "lg"] as const)("size %s", async (size) => {
      const frame = await stage(DeltaValue, {
        theme,
        props: { value: 12450, delta: 12.5, size },
        width: 240,
      });
      await expect(frame).toMatchScreenshot(`deltavalue-${size}-${theme}`);
    });
  });

  describe("the whole table", () => {
    /**
     * Four rows, five columns, virtualization off — a fixed set small enough
     * that a diff stays readable. Virtualization is off deliberately: the
     * render window depends on the scroll position and on how many rows fit,
     * neither of which should be baked into a baseline.
     */
    const props = (extra: Record<string, unknown> = {}) => ({
      columns: makeColumns(),
      data: makeRows(4),
      virtualized: false,
      height: "260px",
      ...extra,
    });

    it("in its default state", async () => {
      const frame = await stage(VTable, { theme, props: props(), width: 720 });
      await expect(frame).toMatchScreenshot(`vtable-default-${theme}`);
    });

    it("with pinned columns on both edges", async () => {
      const frame = await stage(VTable, {
        theme,
        props: props({ columns: makeFixedColumns() }),
        width: 720,
      });
      await expect(frame).toMatchScreenshot(`vtable-fixed-${theme}`);
    });

    it("with a total row", async () => {
      const frame = await stage(VTable, {
        theme,
        props: props({ totalRow: makeTotalRow() }),
        width: 720,
      });
      await expect(frame).toMatchScreenshot(`vtable-total-${theme}`);
    });

    it("with selection enabled", async () => {
      const frame = await stage(VTable, {
        theme,
        props: props({ multiSelect: { enabled: true } }),
        width: 720,
      });
      await expect(frame).toMatchScreenshot(`vtable-selection-${theme}`);
    });

    it("empty", async () => {
      const frame = await stage(VTable, { theme, props: props({ data: [] }), width: 720 });
      await expect(frame).toMatchScreenshot(`vtable-empty-${theme}`);
    });

    it("with a grouped header", async () => {
      const frame = await stage(VTable, {
        theme,
        props: props({ columns: makeGroupedColumns() }),
        width: 720,
      });
      await expect(frame).toMatchScreenshot(`vtable-grouped-${theme}`);
    });
  });

  describe("DeltaIndicator", () => {
    it.each([
      ["positive", 5.5],
      ["negative", -5.5],
      ["zero", 0],
    ] as [string, number][])("%s", async (name, value) => {
      const frame = await stage(DeltaIndicator, {
        theme,
        props: { value, format: { percentage: { decimals: 1 } } },
        width: 160,
      });
      await expect(frame).toMatchScreenshot(`deltaindicator-${name}-${theme}`);
    });

    it("without an arrow", async () => {
      const frame = await stage(DeltaIndicator, {
        theme,
        props: { value: 5.5, showIcon: false },
        width: 160,
      });
      await expect(frame).toMatchScreenshot(`deltaindicator-noicon-${theme}`);
    });
  });
});
