import { nextTick, ref } from "vue";

import { describe, expect, it, vi } from "vitest";

import { useTableSort } from "../../../../src/components/table/composables/useTableSort";
import type {
  Column,
  SortConfig,
  SortItem,
} from "../../../../src/components/table/types";
import { withScope } from "../../../setup/scope";
import { makeColumns, makeRows, type TableRow } from "../../../setup/table";

/**
 * Sorting has two entirely separate jobs behind one click handler: keep the
 * `SortItem[]` that drives the header indicators, and either reorder the rows
 * (front) or ask the caller to refetch (server). The state machine is
 * none → asc → desc → none per column, and in multi-sort mode each column keeps
 * its own place in the list — that ordering is the tiebreak order, so losing it
 * silently changes results rather than breaking anything visible.
 */

interface SetupOptions {
  sort?: SortConfig
  sortState?: SortItem[]
  columns?: Column<TableRow>[]
  data?: TableRow[]
  page?: number
  pageSize?: number
}

function setup({ sort, sortState, columns, data, page, pageSize }: SetupOptions = {}) {
  const onRequest = vi.fn();
  const onSort = vi.fn();
  const onUpdateSortState = vi.fn();

  const cols = ref(columns ?? makeColumns({ status: { sortable: true } }));
  const rows = ref(data ?? makeRows());
  const state = sortState ? ref(sortState) : undefined;

  const { result } = withScope(() => useTableSort<TableRow>({
    sort,
    sortState: state,
    columns: cols,
    data: rows,
    page: ref(page),
    pageSize: ref(pageSize),
    onRequest,
    onSort,
    onUpdateSortState,
  }));

  return { ...result, cols, rows, state, onRequest, onSort, onUpdateSortState };
}

const column = (key: string, sortable = true): Column<TableRow> =>
  ({ key, label: key, sortable });

const names = (rows: TableRow[]) => rows.map(r => r.name);

describe("useTableSort", () => {
  describe("sortConfig defaults", () => {
    it("defaults to server-side multi-sort", () => {
      expect(setup().sortConfig.value).toEqual({ type: "server", multiple: true });
    });

    it("honours an explicit type", () => {
      expect(setup({ sort: { type: "front" } }).sortConfig.value.type).toBe("front");
    });

    it("honours multiple: false", () => {
      expect(setup({ sort: { multiple: false } }).sortConfig.value.multiple).toBe(false);
    });

    it("treats an absent `multiple` as true, not falsy", () => {
      expect(setup({ sort: { type: "front" } }).sortConfig.value.multiple).toBe(true);
    });
  });

  describe("initial state", () => {
    it("starts unsorted", () => {
      const { sortState, hasSortedColumns } = setup();
      expect(sortState.value).toEqual([]);
      expect(hasSortedColumns.value).toBe(false);
    });

    it("seeds from a controlled sortState", () => {
      const seed: SortItem[] = [{ field: "name", order: "desc" }];
      expect(setup({ sortState: seed }).sortState.value).toEqual(seed);
    });

    it("follows the controlled prop when it changes", async () => {
      const { sortState, state } = setup({ sortState: [] });
      state!.value = [{ field: "name", order: "asc" }];
      await nextTick();
      expect(sortState.value).toEqual([{ field: "name", order: "asc" }]);
    });

    it("treats a cleared prop as an empty list, not undefined", async () => {
      const { sortState, state } = setup({ sortState: [{ field: "name", order: "asc" }] });
      state!.value = undefined as unknown as SortItem[];
      await nextTick();
      expect(sortState.value).toEqual([]);
    });
  });

  describe("getSortState", () => {
    it("reports an unsorted column", () => {
      expect(setup().getSortState("name"))
        .toEqual({ isSorted: false, order: null, index: -1 });
    });

    it("reports order and position for a sorted column", () => {
      const { handleSortClick, getSortState } = setup();
      handleSortClick(column("name"));
      handleSortClick(column("revenue"));

      expect(getSortState("name")).toEqual({ isSorted: true, order: "asc", index: 0 });
      expect(getSortState("revenue")).toEqual({ isSorted: true, order: "asc", index: 1 });
    });
  });

  describe("the click cycle", () => {
    it("goes none → asc", () => {
      const { handleSortClick, sortState } = setup();
      handleSortClick(column("name"));
      expect(sortState.value).toEqual([{ field: "name", order: "asc" }]);
    });

    it("goes asc → desc", () => {
      const { handleSortClick, sortState } = setup();
      handleSortClick(column("name"));
      handleSortClick(column("name"));
      expect(sortState.value).toEqual([{ field: "name", order: "desc" }]);
    });

    it("goes desc → none", () => {
      const { handleSortClick, sortState } = setup();
      handleSortClick(column("name"));
      handleSortClick(column("name"));
      handleSortClick(column("name"));
      expect(sortState.value).toEqual([]);
    });

    it("wraps back round to asc", () => {
      const { handleSortClick, sortState } = setup();
      for (let i = 0; i < 4; i++) handleSortClick(column("name"));
      expect(sortState.value).toEqual([{ field: "name", order: "asc" }]);
    });

    it("ignores a column that is not sortable", () => {
      const { handleSortClick, sortState, onUpdateSortState } = setup();
      handleSortClick(column("status", false));
      expect(sortState.value).toEqual([]);
      expect(onUpdateSortState).not.toHaveBeenCalled();
    });
  });

  describe("multi-sort", () => {
    it("appends a second column rather than replacing the first", () => {
      const { handleSortClick, sortState } = setup();
      handleSortClick(column("name"));
      handleSortClick(column("revenue"));

      expect(sortState.value).toEqual([
        { field: "name", order: "asc" },
        { field: "revenue", order: "asc" },
      ]);
    });

    it("keeps a column in place when its order changes", () => {
      const { handleSortClick, sortState } = setup();
      handleSortClick(column("name"));
      handleSortClick(column("revenue"));
      handleSortClick(column("name")); // asc → desc

      expect(sortState.value).toEqual([
        { field: "name", order: "desc" },
        { field: "revenue", order: "asc" },
      ]);
    });

    it("removes only the cycled-out column", () => {
      const { handleSortClick, sortState } = setup();
      handleSortClick(column("name"));
      handleSortClick(column("revenue"));
      handleSortClick(column("name"));
      handleSortClick(column("name")); // desc → none

      expect(sortState.value).toEqual([{ field: "revenue", order: "asc" }]);
    });

    it("re-adds a removed column at the end", () => {
      const { handleSortClick, sortState } = setup();
      handleSortClick(column("name"));
      handleSortClick(column("revenue"));
      handleSortClick(column("name"));
      handleSortClick(column("name")); // name out
      handleSortClick(column("name")); // name back, now second

      expect(sortState.value.map(s => s.field)).toEqual(["revenue", "name"]);
    });
  });

  describe("single sort", () => {
    const single = { sort: { multiple: false } as SortConfig };

    it("replaces the previous column", () => {
      const { handleSortClick, sortState } = setup(single);
      handleSortClick(column("name"));
      handleSortClick(column("revenue"));

      expect(sortState.value).toEqual([{ field: "revenue", order: "asc" }]);
    });

    it("still cycles asc → desc → none on one column", () => {
      const { handleSortClick, sortState } = setup(single);
      handleSortClick(column("name"));
      handleSortClick(column("name"));
      expect(sortState.value).toEqual([{ field: "name", order: "desc" }]);

      handleSortClick(column("name"));
      expect(sortState.value).toEqual([]);
    });

    it("restarts at asc for a column that replaced another", () => {
      const { handleSortClick, sortState } = setup(single);
      handleSortClick(column("name"));
      handleSortClick(column("name")); // desc
      handleSortClick(column("revenue"));

      expect(sortState.value).toEqual([{ field: "revenue", order: "asc" }]);
    });
  });

  describe("server mode", () => {
    it("asks for a refetch on every sort click", () => {
      const { handleSortClick, onRequest } = setup({ pageSize: 25 });
      handleSortClick(column("name"));

      expect(onRequest).toHaveBeenCalledWith({
        page: 1,
        pageSize: 25,
        sort: [{ field: "name", order: "asc" }],
      });
    });

    it("always asks for page 1, whatever page the table is on", () => {
      // Sorting reorders the whole result set, so page 4 of the old order is
      // meaningless in the new one.
      const { handleSortClick, onRequest } = setup({ page: 4 });
      handleSortClick(column("name"));
      expect(onRequest.mock.calls[0][0].page).toBe(1);
    });

    it("falls back to a page size of 10", () => {
      const { handleSortClick, onRequest } = setup();
      handleSortClick(column("name"));
      expect(onRequest.mock.calls[0][0].pageSize).toBe(10);
    });

    it("does not emit the front-sort event", () => {
      const { handleSortClick, onSort } = setup();
      handleSortClick(column("name"));
      expect(onSort).not.toHaveBeenCalled();
    });

    it("requests again when the sort is cycled off", () => {
      const { handleSortClick, onRequest } = setup();
      handleSortClick(column("name"));
      handleSortClick(column("name"));
      handleSortClick(column("name"));

      expect(onRequest).toHaveBeenCalledTimes(3);
      expect(onRequest.mock.calls[2][0].sort).toEqual([]);
    });
  });

  describe("front mode", () => {
    const front = { sort: { type: "front" } as SortConfig };

    it("emits the sort payload rather than a request", () => {
      const { handleSortClick, onSort, onRequest } = setup(front);
      handleSortClick(column("name"));

      expect(onRequest).not.toHaveBeenCalled();
      expect(onSort).toHaveBeenCalledWith({
        field: "name",
        order: "asc",
        sortState: [{ field: "name", order: "asc" }],
      });
    });

    it("names the column that was clicked, not the first sorted one", () => {
      const { handleSortClick, onSort } = setup(front);
      handleSortClick(column("name"));
      handleSortClick(column("revenue"));

      expect(onSort.mock.calls[1][0].field).toBe("revenue");
    });

    it("emits nothing when the last sort is cycled off", () => {
      const { handleSortClick, onSort } = setup(front);
      handleSortClick(column("name"));
      handleSortClick(column("name"));
      onSort.mockClear();

      handleSortClick(column("name"));
      expect(onSort).not.toHaveBeenCalled();
    });
  });

  describe("sortedData", () => {
    const front = { sort: { type: "front" } as SortConfig };

    it("is the data untouched in server mode", () => {
      const { sortedData, handleSortClick, rows } = setup();
      handleSortClick(column("name"));
      expect(sortedData.value).toEqual(rows.value);
    });

    it("is the data untouched before anything is sorted", () => {
      expect(names(setup(front).sortedData.value))
        .toEqual(["Alpha", "Bravo", "Charlie", "Delta", "Echo"]);
    });

    it("sorts strings ascending", () => {
      const { handleSortClick, sortedData } = setup({
        ...front,
        data: [
          { ...makeRows()[0], name: "Charlie" },
          { ...makeRows()[1], name: "alpha" },
          { ...makeRows()[2], name: "Bravo" },
        ],
      });
      handleSortClick(column("name"));
      expect(names(sortedData.value)).toEqual(["alpha", "Bravo", "Charlie"]);
    });

    it("sorts strings descending", () => {
      const { handleSortClick, sortedData } = setup(front);
      handleSortClick(column("name"));
      handleSortClick(column("name"));
      expect(names(sortedData.value)[0]).toBe("Echo");
    });

    it("sorts numbers numerically, not lexically", () => {
      const { handleSortClick, sortedData } = setup(front);
      handleSortClick(column("revenue"));
      expect(sortedData.value.map(r => r.revenue)).toEqual([0, 210.75, 830, 1250.5, 4400.25]);
    });

    it("sorts numeric strings numerically too", () => {
      const { handleSortClick, sortedData } = setup({
        ...front,
        data: [
          { ...makeRows()[0], name: "9" },
          { ...makeRows()[1], name: "10" },
          { ...makeRows()[2], name: "2" },
        ],
      });
      handleSortClick(column("name"));
      expect(names(sortedData.value)).toEqual(["2", "9", "10"]);
    });

    it("pushes nulls to the end regardless of direction", () => {
      const data = [
        { ...makeRows()[0], name: "B" },
        { ...makeRows()[1], name: null as unknown as string },
        { ...makeRows()[2], name: "A" },
      ];
      const asc = setup({ ...front, data });
      asc.handleSortClick(column("name"));
      expect(names(asc.sortedData.value)).toEqual(["A", "B", null]);

      const desc = setup({ ...front, data });
      desc.handleSortClick(column("name"));
      desc.handleSortClick(column("name"));
      expect(names(desc.sortedData.value)).toEqual(["B", "A", null]);
    });

    it("breaks ties with the second sort column", () => {
      const data = [
        { ...makeRows()[0], status: "active" as const, revenue: 300 },
        { ...makeRows()[1], status: "active" as const, revenue: 100 },
        { ...makeRows()[2], status: "paused" as const, revenue: 200 },
      ];
      const { handleSortClick, sortedData } = setup({ ...front, data });

      handleSortClick(column("status"));
      handleSortClick(column("revenue"));

      expect(sortedData.value.map(r => [r.status, r.revenue]))
        .toEqual([["active", 100], ["active", 300], ["paused", 200]]);
    });

    it("uses a column's sortValue when it has one", () => {
      const columns = [
        { key: "name", label: "Name", sortable: true, sortValue: (row: TableRow) => -row.revenue },
      ];
      const { handleSortClick, sortedData } = setup({ ...front, columns });

      handleSortClick(column("name"));
      expect(sortedData.value.map(r => r.revenue))
        .toEqual([4400.25, 1250.5, 830, 210.75, 0]);
    });

    it("reads a dotted key as a path", () => {
      const data = [
        { ...makeRows()[0], meta: { rank: 2 } },
        { ...makeRows()[1], meta: { rank: 1 } },
      ] as unknown as TableRow[];
      const columns = [{ key: "meta.rank", label: "Rank", sortable: true }];
      const { handleSortClick, sortedData } = setup({ ...front, data, columns });

      handleSortClick(column("meta.rank"));
      expect(sortedData.value.map(r => (r as { meta: { rank: number } }).meta.rank))
        .toEqual([1, 2]);
    });

    it("treats a broken path as null rather than throwing", () => {
      const columns = [{ key: "missing.deep", label: "X", sortable: true }];
      const { handleSortClick, sortedData } = setup({ ...front, columns });

      expect(() => handleSortClick(column("missing.deep"))).not.toThrow();
      expect(sortedData.value).toHaveLength(5);
    });

    it("restores the original order when sorting is cleared", () => {
      const { handleSortClick, sortedData } = setup(front);
      const original = names(sortedData.value);

      handleSortClick(column("name"));
      handleSortClick(column("name"));
      handleSortClick(column("name")); // back to none

      expect(names(sortedData.value)).toEqual(original);
    });

    it("does not mutate the source array", () => {
      const { handleSortClick, sortedData, rows } = setup(front);
      const before = names(rows.value);

      handleSortClick(column("revenue"));
      expect(sortedData.value).not.toBe(rows.value);
      expect(names(rows.value)).toEqual(before);
    });

    it("keeps the first non-empty data as the original order", async () => {
      // The snapshot is taken once, on the first non-empty load. A later
      // refetch must not become the new "unsorted" order.
      const { rows, handleSortClick, sortedData } = setup({ ...front, data: [] });

      rows.value = makeRows(3);
      await nextTick();
      const first = names(sortedData.value);

      handleSortClick(column("name"));
      handleSortClick(column("name"));
      handleSortClick(column("name"));

      expect(names(sortedData.value)).toEqual(first);
    });
  });

  describe("resetSort", () => {
    it("clears the state and reports it", () => {
      const { handleSortClick, resetSort, sortState, onUpdateSortState } = setup();
      handleSortClick(column("name"));
      onUpdateSortState.mockClear();

      resetSort();
      expect(sortState.value).toEqual([]);
      expect(onUpdateSortState).toHaveBeenCalledWith([]);
    });

    it("requests a refetch in server mode, keeping the current page", () => {
      // Unlike a sort click, a reset restores the order the caller already
      // paged through, so staying put is the right behaviour here.
      const { resetSort, onRequest } = setup({ page: 4, pageSize: 25 });
      resetSort();
      expect(onRequest).toHaveBeenCalledWith({ page: 4, pageSize: 25, sort: [] });
    });

    it("does not request in front mode", () => {
      const { resetSort, onRequest } = setup({ sort: { type: "front" } });
      resetSort();
      expect(onRequest).not.toHaveBeenCalled();
    });

    it("puts front-mode rows back in their original order", () => {
      const { handleSortClick, resetSort, sortedData } = setup({ sort: { type: "front" } });
      const original = names(sortedData.value);

      handleSortClick(column("revenue"));
      resetSort();

      expect(names(sortedData.value)).toEqual(original);
    });

    it("is safe when nothing is sorted", () => {
      const { resetSort, sortState } = setup();
      expect(() => resetSort()).not.toThrow();
      expect(sortState.value).toEqual([]);
    });
  });

  describe("hasSortedColumns", () => {
    it("tracks the state", () => {
      const { handleSortClick, hasSortedColumns } = setup();
      expect(hasSortedColumns.value).toBe(false);

      handleSortClick(column("name"));
      expect(hasSortedColumns.value).toBe(true);

      handleSortClick(column("name"));
      handleSortClick(column("name"));
      expect(hasSortedColumns.value).toBe(false);
    });
  });

  it("works without any callbacks", () => {
    const cols = ref(makeColumns());
    const { result } = withScope(() => useTableSort({ columns: cols }));

    expect(() => result.handleSortClick(column("name"))).not.toThrow();
    expect(result.sortState.value).toEqual([{ field: "name", order: "asc" }]);
  });
});
