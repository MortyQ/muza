import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import VSelect from "../../../../src/components/inputs/VSelect.vue";
import TablePeriodSelect from "../../../../src/components/table/components/TablePeriodSelect.vue";
import type {
  PeriodDateRange,
  PeriodGranularity,
} from "../../../../src/components/table/composables/useTablePeriodSelect";

/**
 * A thin wrapper over `useTablePeriodSelect` — the option generation is covered
 * against the composable directly. What this file covers is the wiring: props
 * reaching the composable as refs (so a filter change upstream actually
 * regenerates the list), and one `change` payload carrying all three things a
 * caller needs to fire a request.
 *
 * The clock is pinned because two of the three generators stop at "today".
 */

const NOW = new Date("2024-07-01T00:00:00.000Z");
const RANGE: PeriodDateRange = { since: "2024-04-01", until: "2024-07-31" };

const stubs = { Icon: true };

function periodSelect(props: Record<string, unknown> = {}) {
  return mount(TablePeriodSelect, {
    props: { granularity: "MONTH" as PeriodGranularity, dateRange: RANGE, ...props },
    global: { stubs },
  });
}

const options = (w: ReturnType<typeof periodSelect>) =>
  (w.findComponent(VSelect).props("options") as { label: string, value: string }[]);

describe("TablePeriodSelect", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("the select", () => {
    it("feeds the generated options through", () => {
      expect(options(periodSelect()).map(o => o.label))
        .toEqual(["All Months", "July 2024", "June 2024", "May 2024", "April 2024"]);
    });

    it("preselects the catch-all", () => {
      expect(periodSelect().findComponent(VSelect).props("modelValue"))
        .toMatchObject({ value: "all" });
    });

    it("is not searchable — the list is short and generated", () => {
      expect(periodSelect().findComponent(VSelect).props("searchable")).toBe(false);
    });

    it("closes on select", () => {
      expect(periodSelect().findComponent(VSelect).props("closeOnSelect")).toBe(true);
    });

    it("uses the default placeholder", () => {
      expect(periodSelect().findComponent(VSelect).props("placeholder")).toBe("Select period");
    });

    it("takes a custom placeholder", () => {
      expect(periodSelect({ placeholder: "Pick a month" })
        .findComponent(VSelect).props("placeholder")).toBe("Pick a month");
    });

    it("applies the default width class", () => {
      expect(periodSelect().findComponent(VSelect).classes()).toContain("w-40");
    });

    it("takes a custom width class", () => {
      expect(periodSelect({ widthClass: "w-64" }).findComponent(VSelect).classes())
        .toContain("w-64");
    });
  });

  describe("includeSummary", () => {
    it("is off by default", () => {
      expect(options(periodSelect()).map(o => o.value)).not.toContain("summary");
    });

    it("adds the option when on", () => {
      expect(options(periodSelect({ includeSummary: true }))[1])
        .toEqual({ label: "Summary", value: "summary" });
    });
  });

  describe("reacting to its props", () => {
    it("regenerates the options when granularity changes", async () => {
      const w = periodSelect();
      await w.setProps({ granularity: "DAY" });

      expect(options(w)[0].label).toBe("All Days");
    });

    it("regenerates the options when the range changes", async () => {
      const w = periodSelect();
      await w.setProps({ dateRange: { since: "2024-01-01", until: "2024-02-28" } });

      expect(options(w).map(o => o.label).slice(1))
        .toEqual(["February 2024", "January 2024"]);
    });
  });

  describe("the change event", () => {
    it("carries the selection, the request params and the grouping flag", async () => {
      const w = periodSelect();
      await w.findComponent(VSelect).vm.$emit("select", { label: "June 2024", value: "2024-06-01" });

      expect(w.emitted("change")![0][0]).toEqual({
        selected: { label: "June 2024", value: "2024-06-01" },
        requestParams: { period: { since: "2024-06-01", until: "2024-06-30" } },
        isGroupByDate: true,
      });
    });

    it("reports empty params for the catch-all", async () => {
      const w = periodSelect();
      await w.findComponent(VSelect).vm.$emit("select", { label: "All Months", value: "all" });

      expect(w.emitted("change")![0][0]).toMatchObject({ requestParams: {} });
    });

    it("turns grouping off for Summary", async () => {
      const w = periodSelect({ includeSummary: true });
      await w.findComponent(VSelect).vm.$emit("select", { label: "Summary", value: "summary" });

      expect(w.emitted("change")![0][0]).toMatchObject({ isGroupByDate: false });
    });

    it("fires when a prop change resets the selection", async () => {
      const w = periodSelect();
      await w.findComponent(VSelect).vm.$emit("select", { label: "June 2024", value: "2024-06-01" });
      const before = w.emitted("change")!.length;

      await w.setProps({ granularity: "WEEK" });

      expect(w.emitted("change")!.length).toBeGreaterThan(before);
      expect(w.emitted("change")!.at(-1)![0]).toMatchObject({ requestParams: {} });
    });
  });

  describe("the exposed state", () => {
    it("hands the parent the selection and its derived values", async () => {
      const w = periodSelect();
      await w.findComponent(VSelect).vm.$emit("select", { label: "June 2024", value: "2024-06-01" });

      const exposed = w.vm as unknown as {
        selectedPeriod: { value: string }
        periodRequestParams: { period?: { since: string } }
        isGroupByDate: boolean
      };

      expect(exposed.selectedPeriod.value).toBe("2024-06-01");
      expect(exposed.periodRequestParams.period?.since).toBe("2024-06-01");
      expect(exposed.isGroupByDate).toBe(true);
    });
  });
});
