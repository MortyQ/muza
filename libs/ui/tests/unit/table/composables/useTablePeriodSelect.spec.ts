import { nextTick, ref } from "vue";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  useTablePeriodSelect,
  type PeriodDateRange,
  type PeriodGranularity,
  type PeriodOption,
} from "../../../../src/components/table/composables/useTablePeriodSelect";
import { withScope } from "../../../setup/scope";

/**
 * Two of the three generators stop at "today", so every assertion here would
 * drift with the wall clock. The clock is pinned to 2024-07-01 for the whole
 * file — a test that passes in June and fails in July is worse than no test.
 */

const NOW = new Date("2024-07-01T00:00:00.000Z");
const RANGE: PeriodDateRange = { since: "2024-04-01", until: "2024-07-31" };

function setup(
  granularity: PeriodGranularity = "MONTH",
  dateRange: PeriodDateRange = RANGE,
  includeSummary = false,
) {
  const onPeriodChange = vi.fn();
  const gran = ref(granularity);
  const range = ref(dateRange);

  const { result } = withScope(() => useTablePeriodSelect({
    granularity: gran,
    dateRange: range,
    includeSummary,
    onPeriodChange,
  }));

  return { ...result, gran, range, onPeriodChange };
}

const labels = (options: PeriodOption[]) => options.map(o => o.label);
const values = (options: PeriodOption[]) => options.map(o => o.value);

describe("useTablePeriodSelect", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("the leading options", () => {
    it.each([
      ["MONTH", "All Months"],
      ["WEEK", "All Weeks"],
      ["DAY", "All Days"],
    ] as [PeriodGranularity, string][])("labels the catch-all for %s", (gran, label) => {
      expect(setup(gran).periodOptions.value[0]).toEqual({ label, value: "all" });
    });

    it("omits Summary by default", () => {
      expect(values(setup().periodOptions.value)).not.toContain("summary");
    });

    it("puts Summary second when asked for", () => {
      const { periodOptions } = setup("MONTH", RANGE, true);
      expect(periodOptions.value[1]).toEqual({ label: "Summary", value: "summary" });
    });

    it("selects the catch-all on creation", () => {
      const { selectedPeriod } = setup();
      expect(selectedPeriod.value.value).toBe("all");
    });

    it("exposes the catch-all as the default", () => {
      const { defaultPeriod, periodOptions } = setup();
      expect(defaultPeriod.value).toEqual(periodOptions.value[0]);
    });
  });

  describe("month options", () => {
    it("covers every month the range touches", () => {
      const { periodOptions } = setup("MONTH");
      expect(labels(periodOptions.value).slice(1))
        .toEqual(["July 2024", "June 2024", "May 2024", "April 2024"]);
    });

    it("uses the first of the month as the value", () => {
      expect(values(setup("MONTH").periodOptions.value)[1]).toBe("2024-07-01");
    });

    it("goes newest first", () => {
      const [first, second] = values(setup("MONTH").periodOptions.value).slice(1);
      expect(first > second).toBe(true);
    });

    it("includes the month a partial range starts in", () => {
      const { periodOptions } = setup("MONTH", { since: "2024-04-17", until: "2024-05-02" });
      expect(labels(periodOptions.value).slice(1)).toEqual(["May 2024", "April 2024"]);
    });

    it("does not stop at today, unlike weeks and days", () => {
      // A month is selectable as soon as it starts, so July is offered on 1 July.
      expect(labels(setup("MONTH").periodOptions.value)).toContain("July 2024");
    });

    it("yields a single month for a range inside one", () => {
      const { periodOptions } = setup("MONTH", { since: "2024-05-02", until: "2024-05-20" });
      expect(labels(periodOptions.value).slice(1)).toEqual(["May 2024"]);
    });
  });

  describe("day options", () => {
    it("stops before today", () => {
      const { periodOptions } = setup("DAY", { since: "2024-06-28", until: "2024-07-05" });
      expect(values(periodOptions.value).slice(1))
        .toEqual(["2024-06-30", "2024-06-29", "2024-06-28"]);
    });

    it("formats as MM/dd/yyyy", () => {
      const { periodOptions } = setup("DAY", { since: "2024-06-28", until: "2024-06-29" });
      expect(labels(periodOptions.value)[1]).toBe("06/29/2024");
    });

    it("offers nothing but the catch-all for a range that is entirely in the future", () => {
      const { periodOptions } = setup("DAY", { since: "2024-08-01", until: "2024-08-05" });
      expect(periodOptions.value).toHaveLength(1);
    });
  });

  describe("week options", () => {
    it("lists Sundays, newest first, stopping before today", () => {
      const { periodOptions } = setup("WEEK", { since: "2024-06-01", until: "2024-07-31" });
      const listed = values(periodOptions.value).slice(1);

      expect(listed)
        .toEqual(["2024-06-30", "2024-06-23", "2024-06-16", "2024-06-09", "2024-06-02"]);
      for (const value of listed) {
        expect(new Date(`${value}T00:00:00Z`).getUTCDay()).toBe(0);
      }
    });

    it("offers nothing but the catch-all for a range shorter than a week", () => {
      const { periodOptions } = setup("WEEK", { since: "2024-06-25", until: "2024-06-27" });
      expect(periodOptions.value).toHaveLength(1);
    });
  });

  describe("periodRequestParams", () => {
    it("is empty for the catch-all", () => {
      expect(setup().periodRequestParams.value).toEqual({});
    });

    it("is empty for Summary", () => {
      const { handlePeriodChange, periodRequestParams } = setup("MONTH", RANGE, true);
      handlePeriodChange({ label: "Summary", value: "summary" });
      expect(periodRequestParams.value).toEqual({});
    });

    it("spans the whole month for MONTH", () => {
      const { handlePeriodChange, periodRequestParams } = setup("MONTH");
      handlePeriodChange({ label: "June 2024", value: "2024-06-01" });

      expect(periodRequestParams.value)
        .toEqual({ period: { since: "2024-06-01", until: "2024-06-30" } });
    });

    it("handles a 31-day month", () => {
      const { handlePeriodChange, periodRequestParams } = setup("MONTH");
      handlePeriodChange({ label: "May 2024", value: "2024-05-01" });
      expect(periodRequestParams.value.period?.until).toBe("2024-05-31");
    });

    it("spans seven days for WEEK", () => {
      const { handlePeriodChange, periodRequestParams } = setup("WEEK");
      handlePeriodChange({ label: "06/30/2024", value: "2024-06-30" });

      expect(periodRequestParams.value)
        .toEqual({ period: { since: "2024-06-30", until: "2024-07-06" } });
    });

    it("spans a single day for DAY", () => {
      const { handlePeriodChange, periodRequestParams } = setup("DAY");
      handlePeriodChange({ label: "06/29/2024", value: "2024-06-29" });

      expect(periodRequestParams.value)
        .toEqual({ period: { since: "2024-06-29", until: "2024-06-29" } });
    });
  });

  describe("handlePeriodChange", () => {
    it("stores the selection", () => {
      const { handlePeriodChange, selectedPeriod } = setup();
      const option = { label: "June 2024", value: "2024-06-01" };

      handlePeriodChange(option);
      expect(selectedPeriod.value).toEqual(option);
    });

    it("keeps grouping on for a real period", () => {
      const { handlePeriodChange, isGroupByDate } = setup();
      handlePeriodChange({ label: "June 2024", value: "2024-06-01" });
      expect(isGroupByDate.value).toBe(true);
    });

    it("turns grouping off for Summary", () => {
      const { handlePeriodChange, isGroupByDate } = setup("MONTH", RANGE, true);
      handlePeriodChange({ label: "Summary", value: "summary" });
      expect(isGroupByDate.value).toBe(false);
    });

    it("turns grouping back on when moving off Summary", () => {
      const { handlePeriodChange, isGroupByDate } = setup("MONTH", RANGE, true);
      handlePeriodChange({ label: "Summary", value: "summary" });
      handlePeriodChange({ label: "All Months", value: "all" });
      expect(isGroupByDate.value).toBe(true);
    });

    it("reports the params alongside the grouping flag", () => {
      const { handlePeriodChange, onPeriodChange } = setup();
      onPeriodChange.mockClear();

      handlePeriodChange({ label: "June 2024", value: "2024-06-01" });
      expect(onPeriodChange).toHaveBeenCalledWith(
        { period: { since: "2024-06-01", until: "2024-06-30" } },
        true,
      );
    });

    it("reports params computed from the new selection, not the old one", () => {
      const { handlePeriodChange, onPeriodChange } = setup();
      handlePeriodChange({ label: "June 2024", value: "2024-06-01" });
      handlePeriodChange({ label: "May 2024", value: "2024-05-01" });

      expect(onPeriodChange.mock.calls.at(-1)![0].period.since).toBe("2024-05-01");
    });
  });

  describe("resetPeriod", () => {
    it("goes back to the catch-all", () => {
      const { handlePeriodChange, resetPeriod, selectedPeriod } = setup();
      handlePeriodChange({ label: "June 2024", value: "2024-06-01" });

      resetPeriod();
      expect(selectedPeriod.value.value).toBe("all");
    });

    it("turns grouping back on", () => {
      const { handlePeriodChange, resetPeriod, isGroupByDate } = setup("MONTH", RANGE, true);
      handlePeriodChange({ label: "Summary", value: "summary" });

      resetPeriod();
      expect(isGroupByDate.value).toBe(true);
    });

    it("reports empty params", () => {
      const { resetPeriod, onPeriodChange } = setup();
      onPeriodChange.mockClear();

      resetPeriod();
      expect(onPeriodChange).toHaveBeenCalledWith({}, true);
    });
  });

  describe("reacting to the filters above it", () => {
    it("rebuilds the options when granularity changes", async () => {
      const { gran, periodOptions } = setup("MONTH");
      gran.value = "DAY";
      await nextTick();

      expect(periodOptions.value[0].label).toBe("All Days");
    });

    it("resets the selection when granularity changes", async () => {
      const { gran, handlePeriodChange, selectedPeriod } = setup("MONTH");
      handlePeriodChange({ label: "June 2024", value: "2024-06-01" });

      gran.value = "DAY";
      await nextTick();
      expect(selectedPeriod.value.value).toBe("all");
    });

    it("resets the selection when the range changes", async () => {
      const { range, handlePeriodChange, selectedPeriod } = setup("MONTH");
      handlePeriodChange({ label: "June 2024", value: "2024-06-01" });

      range.value = { since: "2024-01-01", until: "2024-03-31" };
      await nextTick();
      expect(selectedPeriod.value.value).toBe("all");
    });

    it("notices a mutation inside the range object", async () => {
      const { range, handlePeriodChange, selectedPeriod } = setup("MONTH");
      handlePeriodChange({ label: "June 2024", value: "2024-06-01" });

      range.value.until = "2024-06-30";
      await nextTick();
      expect(selectedPeriod.value.value).toBe("all");
    });

    it("tells the caller to refetch after a reset", async () => {
      const { gran, onPeriodChange } = setup("MONTH");
      onPeriodChange.mockClear();

      gran.value = "WEEK";
      await nextTick();
      expect(onPeriodChange).toHaveBeenCalledWith({}, true);
    });
  });

  it("works without a callback", () => {
    const gran = ref<PeriodGranularity>("MONTH");
    const range = ref(RANGE);
    const { result } = withScope(() =>
      useTablePeriodSelect({ granularity: gran, dateRange: range }));

    expect(() => result.handlePeriodChange({ label: "x", value: "2024-06-01" })).not.toThrow();
    expect(result.selectedPeriod.value.value).toBe("2024-06-01");
  });
});
