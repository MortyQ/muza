import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import TablePagination from "../../../../src/components/table/components/TablePagination.vue";

/**
 * The page-number window is the whole of this component: seven or fewer pages
 * render flat, and beyond that the list gains one or two ellipses depending on
 * where the current page sits. Off-by-one there produces a control that skips a
 * page or offers one that does not exist, and every guard around `goToPage`
 * exists to stop that becoming a request.
 */

function pagination(props: Record<string, unknown> = {}) {
  return mount(TablePagination, {
    props: { page: 1, pageSize: 10, total: 100, ...props },
  });
}

const pageButtons = (w: ReturnType<typeof pagination>) =>
  w.findAll(".v-table-pagination-controls .v-table-pagination-btn")
    .slice(1, -1)
    .map(b => b.text());

const window = (w: ReturnType<typeof pagination>) =>
  w.findAll(".v-table-pagination-controls > *")
    .filter(el => !el.attributes("aria-label"))
    .map(el => (el.classes().includes("v-table-pagination-ellipsis") ? "…" : el.text()));

const prev = (w: ReturnType<typeof pagination>) => w.find("[aria-label=\"Previous page\"]");
const next = (w: ReturnType<typeof pagination>) => w.find("[aria-label=\"Next page\"]");

describe("TablePagination", () => {
  describe("the range readout", () => {
    it("shows the first page's range", () => {
      expect(pagination().find(".v-table-pagination-info").text())
        .toBe("Showing 1–10 of 100");
    });

    it("shows a middle page's range", () => {
      expect(pagination({ page: 4 }).find(".v-table-pagination-info").text())
        .toBe("Showing 31–40 of 100");
    });

    it("stops the last page's range at the total", () => {
      expect(pagination({ page: 3, pageSize: 40 }).find(".v-table-pagination-info").text())
        .toBe("Showing 81–100 of 100");
    });

    it("shows a zero start for an empty result set", () => {
      expect(pagination({ total: 0 }).find(".v-table-pagination-info").text())
        .toBe("Showing 0–0 of 0");
    });

    it("groups thousands", () => {
      expect(pagination({ page: 200, pageSize: 25, total: 12345 })
        .find(".v-table-pagination-info").text())
        .toBe("Showing 4,976–5,000 of 12,345");
    });
  });

  describe("the page window", () => {
    it("lists every page when there are seven or fewer", () => {
      expect(pageButtons(pagination({ total: 70 }))).toEqual(["1", "2", "3", "4", "5", "6", "7"]);
    });

    it("lists a single page for a single page of results", () => {
      expect(pageButtons(pagination({ total: 5 }))).toEqual(["1"]);
    });

    it("rounds a partial page up", () => {
      expect(pageButtons(pagination({ total: 61 })))
        .toEqual(["1", "2", "3", "4", "5", "6", "7"]);
    });

    it("shows one trailing ellipsis near the start", () => {
      expect(window(pagination({ page: 2, total: 200 })))
        .toEqual(["1", "2", "3", "4", "…", "20"]);
    });

    it("keeps the near-start shape up to page 3", () => {
      expect(window(pagination({ page: 3, total: 200 })))
        .toEqual(["1", "2", "3", "4", "…", "20"]);
    });

    it("shows one leading ellipsis near the end", () => {
      expect(window(pagination({ page: 19, total: 200 })))
        .toEqual(["1", "…", "17", "18", "19", "20"]);
    });

    it("shows two ellipses in the middle", () => {
      expect(window(pagination({ page: 10, total: 200 })))
        .toEqual(["1", "…", "9", "10", "11", "…", "20"]);
    });

    it("marks the current page", () => {
      const active = pagination({ page: 3, total: 70 })
        .findAll(".v-table-pagination-btn--active");

      expect(active).toHaveLength(1);
      expect(active[0].text()).toBe("3");
    });

    it("renders no page button for an empty result set", () => {
      expect(pageButtons(pagination({ total: 0 }))).toEqual([]);
    });
  });

  describe("navigation", () => {
    it("emits the requested page and the current size", async () => {
      const w = pagination({ page: 1, total: 70 });
      await w.findAll(".v-table-pagination-btn")[3].trigger("click");

      expect(w.emitted("page-change")![0]).toEqual([{ page: 3, pageSize: 10 }]);
    });

    it("steps back", async () => {
      const w = pagination({ page: 4 });
      await prev(w).trigger("click");
      expect(w.emitted("page-change")![0]).toEqual([{ page: 3, pageSize: 10 }]);
    });

    it("steps forward", async () => {
      const w = pagination({ page: 4 });
      await next(w).trigger("click");
      expect(w.emitted("page-change")![0]).toEqual([{ page: 5, pageSize: 10 }]);
    });

    it("emits nothing for the page it is already on", async () => {
      const w = pagination({ page: 3, total: 70 });
      await w.findAll(".v-table-pagination-btn")[3].trigger("click");
      expect(w.emitted("page-change")).toBeUndefined();
    });

    it("disables `previous` on the first page", () => {
      expect(prev(pagination({ page: 1 })).attributes("disabled")).toBeDefined();
    });

    it("disables `next` on the last page", () => {
      expect(next(pagination({ page: 10 })).attributes("disabled")).toBeDefined();
    });

    it("disables both when there is nothing to page through", () => {
      const w = pagination({ total: 0 });
      expect(prev(w).attributes("disabled")).toBeDefined();
      expect(next(w).attributes("disabled")).toBeDefined();
    });

    it("emits nothing when stepping past either end", async () => {
      const first = pagination({ page: 1 });
      await prev(first).trigger("click");
      expect(first.emitted("page-change")).toBeUndefined();

      const last = pagination({ page: 10 });
      await next(last).trigger("click");
      expect(last.emitted("page-change")).toBeUndefined();
    });
  });

  describe("loading", () => {
    it("disables every control", () => {
      const w = pagination({ page: 4, loading: true });
      for (const button of w.findAll(".v-table-pagination-btn")) {
        expect(button.attributes("disabled")).toBeDefined();
      }
    });

    it("emits nothing on a page click", async () => {
      const w = pagination({ page: 1, total: 70, loading: true });
      await w.findAll(".v-table-pagination-btn")[3].trigger("click");
      expect(w.emitted("page-change")).toBeUndefined();
    });

    it("disables the size selector too", () => {
      const w = pagination({ showSizeChanger: true, loading: true });
      expect(w.find("select").attributes("disabled")).toBeDefined();
    });
  });

  describe("page size", () => {
    it("hides the selector by default", () => {
      expect(pagination().find(".v-table-pagination-size").exists()).toBe(false);
    });

    it("shows it when asked", () => {
      expect(pagination({ showSizeChanger: true }).find("select").exists()).toBe(true);
    });

    it("offers the default sizes", () => {
      const options = pagination({ showSizeChanger: true })
        .findAll("option").map(o => o.text());
      expect(options).toEqual(["10", "25", "50", "100"]);
    });

    it("offers custom sizes", () => {
      const options = pagination({ showSizeChanger: true, pageSizeOptions: [5, 15] })
        .findAll("option").map(o => o.text());
      expect(options).toEqual(["5", "15"]);
    });

    it("preselects the current size", () => {
      const select = pagination({ showSizeChanger: true, pageSize: 25 }).find("select");
      expect((select.element as HTMLSelectElement).value).toBe("25");
    });

    it("resets to page 1 when the size changes", async () => {
      // A page-4-of-25 view has no meaningful counterpart at 100 per page.
      const w = pagination({ page: 4, showSizeChanger: true });
      await w.find("select").setValue("50");

      expect(w.emitted("page-change")![0]).toEqual([{ page: 1, pageSize: 50 }]);
    });

    it("emits nothing when the size is unchanged", async () => {
      const w = pagination({ showSizeChanger: true, pageSize: 25 });
      await w.find("select").setValue("25");
      expect(w.emitted("page-change")).toBeUndefined();
    });

    it("labels the selector", () => {
      const w = pagination({ showSizeChanger: true });
      expect(w.find("label").attributes("for")).toBe("pagination-size");
      expect(w.find("select").attributes("id")).toBe("pagination-size");
    });
  });
});
