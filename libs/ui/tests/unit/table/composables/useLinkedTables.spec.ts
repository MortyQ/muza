import { isRef, nextTick, ref, type EffectScope } from "vue";

import { afterEach, describe, expect, it, vi } from "vitest";

import { useLinkedTables } from "../../../../src/components/table/composables/useLinkedTables";
import type {
  HighlightCoordinate,
  LinkedTablesOptions,
} from "../../../../src/components/table/types";
import { withScope } from "../../../setup/scope";

/**
 * The registry behind this composable is a module-level Map, which makes every
 * test in this file capable of poisoning the next one: an entry that outlives
 * its test keeps answering broadcasts under an id a later test reuses. Each
 * table is therefore created inside its own scope and every scope is stopped in
 * `afterEach` — `onScopeDispose` is what removes the registry entry, so a
 * forgotten `stop()` is a leak, not just untidiness.
 */

const scopes: EffectScope[] = [];

afterEach(() => {
  scopes.forEach(scope => scope.stop());
  scopes.length = 0;
  vi.restoreAllMocks();
});

function table(id: string, linked: string[], options?: LinkedTablesOptions) {
  const { result, scope } = withScope(() => useLinkedTables(id, linked, options));
  scopes.push(scope);
  return result;
}

/** A scroll container with writable scroll offsets — jsdom has no layout. */
function scrollEl(x = 0, y = 0): HTMLElement {
  const el = document.createElement("div");
  el.scrollLeft = x;
  el.scrollTop = y;
  return el;
}

const frame = () => new Promise(resolve => requestAnimationFrame(() => resolve(null)));

describe("useLinkedTables", () => {
  describe("the bindings object", () => {
    it("carries everything VTable needs under v-bind", () => {
      const { link } = table("a", ["b"]);
      expect(Object.keys(link).sort())
        .toEqual(["highlightSync", "onUpdate:page", "page", "scrollSync"]);
    });

    it("keeps resetState out of the bindings", () => {
      // It would otherwise be spread onto VTable as an unknown prop.
      expect(table("a", ["b"]).link).not.toHaveProperty("resetState");
    });

    it("starts on page 1", () => {
      expect(table("a", ["b"]).link.page).toBe(1);
    });

    it("honours initialPage", () => {
      expect(table("a", ["b"], { initialPage: 4 }).link.page).toBe(4);
    });

    it("keeps scrollPosition a real Ref inside the reactive wrapper", () => {
      // `reactive()` unwraps nested refs, which would hand VTable a plain value
      // and leave its `watch(scrollSync.scrollPosition)` permanently silent.
      // `markRaw` on the controller is what prevents that.
      expect(isRef(table("a", ["b"]).link.scrollSync.scrollPosition)).toBe(true);
    });
  });

  describe("registration", () => {
    it("ignores its own id in the linked list", () => {
      const a = table("a", ["a", "b"]);
      const b = table("b", ["a"], { paginationMode: "reset" });

      a.link["onUpdate:page"](3);
      expect(a.link.page).toBe(3);
      expect(b.link.page).toBe(1);
    });

    it("keeps namespaced tables apart from bare ones", () => {
      const bare = table("a", ["b"]);
      const scoped = table("b", ["a"], { namespace: "reports", paginationMode: "reset" });

      bare.link["onUpdate:page"](5);
      expect(scoped.link.page).toBe(1);
    });

    it("links tables that share a namespace", () => {
      const a = table("a", ["b"], { namespace: "reports" });
      const b = table("b", ["a"], { namespace: "reports", paginationMode: "reset" });

      a.link["onUpdate:page"](5);
      expect(b.link.page).toBe(1);
    });

    it("deregisters on scope disposal", () => {
      const { result, scope } = withScope(() => useLinkedTables("gone", []));
      const b = table("b", ["gone"], { paginationMode: "reset" });
      scope.stop();

      // Re-registering the same id must not warn about a duplicate, which it
      // would if the disposed entry were still in the Map.
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      table("gone", []);
      expect(warn).not.toHaveBeenCalled();

      void result;
      void b;
    });

    it("warns on a duplicate id", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      table("dup", []);
      table("dup", []);

      expect(warn).toHaveBeenCalledWith(expect.stringContaining("Duplicate ID"));
    });

    it("warns when called outside an effect scope", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      useLinkedTables("orphan", []);

      expect(warn).toHaveBeenCalledWith(expect.stringContaining("effect scope"));
    });
  });

  describe("pagination — sync", () => {
    const sync = (total: number): LinkedTablesOptions =>
      ({ paginationMode: "sync", totalPages: ref(total) });

    it("moves a linked table to the same page", () => {
      const a = table("a", ["b"], sync(10));
      const b = table("b", ["a"], sync(10));

      a.link["onUpdate:page"](4);
      expect(b.link.page).toBe(4);
    });

    it("clamps to the linked table's own page count", () => {
      const a = table("a", ["b"], sync(10));
      const b = table("b", ["a"], sync(3));

      a.link["onUpdate:page"](8);
      expect(b.link.page).toBe(3);
    });

    it("updates its own page first", () => {
      const a = table("a", ["b"], sync(10));
      table("b", ["a"], sync(10));

      a.link["onUpdate:page"](4);
      expect(a.link.page).toBe(4);
    });

    it("reaches every linked table", () => {
      const a = table("a", ["b", "c"], sync(10));
      const b = table("b", ["a"], sync(10));
      const c = table("c", ["a"], sync(10));

      a.link["onUpdate:page"](2);
      expect([b.link.page, c.link.page]).toEqual([2, 2]);
    });

    it("does nothing to a table that never declared a page count", () => {
      const a = table("a", ["b"], sync(10));
      const b = table("b", ["a"], { paginationMode: "sync" } as LinkedTablesOptions);

      a.link["onUpdate:page"](4);
      expect(b.link.page).toBe(1);
    });
  });

  describe("pagination — reset and independent", () => {
    it("sends a `reset` table back to page 1", () => {
      const a = table("a", ["b"]);
      const b = table("b", ["a"], { paginationMode: "reset", initialPage: 7 });

      a.link["onUpdate:page"](4);
      expect(b.link.page).toBe(1);
    });

    it("leaves an `independent` table alone", () => {
      const a = table("a", ["b"]);
      const b = table("b", ["a"], { initialPage: 7 });

      a.link["onUpdate:page"](4);
      expect(b.link.page).toBe(7);
    });

    it("defaults to independent", () => {
      const a = table("a", ["b"]);
      const b = table("b", ["a"]);

      a.link["onUpdate:page"](4);
      expect(b.link.page).toBe(1);
    });

    it("lets each table choose its own mode", () => {
      const a = table("a", ["b", "c"]);
      const b = table("b", ["a"], { paginationMode: "reset", initialPage: 7 });
      const c = table("c", ["a"], { initialPage: 7 });

      a.link["onUpdate:page"](4);
      expect([b.link.page, c.link.page]).toEqual([1, 7]);
    });
  });

  describe("scroll sync", () => {
    it("writes the position onto every linked container", async () => {
      const a = table("a", ["b"]);
      const b = table("b", ["a"]);
      const elA = scrollEl();
      const elB = scrollEl();

      a.link.scrollSync.register(elA);
      b.link.scrollSync.register(elB);

      a.link.scrollSync.onScroll(120, 40);
      await frame();

      expect([elB.scrollLeft, elB.scrollTop]).toEqual([120, 40]);
    });

    it("collapses several scroll events into one write per frame", async () => {
      const a = table("a", ["b"]);
      const b = table("b", ["a"]);
      const elB = scrollEl();
      b.link.scrollSync.register(elB);
      a.link.scrollSync.register(scrollEl());

      a.link.scrollSync.onScroll(10, 0);
      a.link.scrollSync.onScroll(20, 0);
      a.link.scrollSync.onScroll(30, 0);
      expect(elB.scrollLeft).toBe(0);

      await frame();
      expect(elB.scrollLeft).toBe(30);
    });

    it("does not echo back to the table that scrolled", async () => {
      // The DOM write on B fires B's own scroll handler; without the guard that
      // handler writes back to A and the two oscillate.
      const a = table("a", ["b"]);
      const b = table("b", ["a"]);
      const elA = scrollEl();
      const elB = scrollEl();
      a.link.scrollSync.register(elA);
      b.link.scrollSync.register(elB);

      a.link.scrollSync.onScroll(120, 0);
      await frame();

      b.link.scrollSync.onScroll(elB.scrollLeft, elB.scrollTop);
      await frame();

      expect(elA.scrollLeft).toBe(0);
    });

    it("skips a target that is already at the position", async () => {
      const a = table("a", ["b"]);
      const b = table("b", ["a"]);
      const elB = scrollEl(120, 40);
      b.link.scrollSync.register(elB);
      a.link.scrollSync.register(scrollEl());

      const raf = vi.spyOn(globalThis, "requestAnimationFrame");
      a.link.scrollSync.onScroll(120, 40);
      expect(raf).not.toHaveBeenCalled();
    });

    it("ignores a linked table with no container yet", async () => {
      const a = table("a", ["b"]);
      table("b", ["a"]);
      a.link.scrollSync.register(scrollEl());

      expect(() => a.link.scrollSync.onScroll(10, 10)).not.toThrow();
      await frame();
    });

    it("catches a late-mounting table up to its sibling", () => {
      const a = table("a", ["b"]);
      const b = table("b", ["a"]);
      a.link.scrollSync.register(scrollEl(200, 60));

      const elB = scrollEl();
      b.link.scrollSync.register(elB);

      expect([elB.scrollLeft, elB.scrollTop]).toEqual([200, 60]);
    });

    it("catches up from the first sibling that has a container", () => {
      const a = table("a", ["b", "c"]);
      table("b", ["a"]);
      const c = table("c", ["a"]);
      c.link.scrollSync.register(scrollEl(90, 10));

      const elA = scrollEl();
      a.link.scrollSync.register(elA);
      expect(elA.scrollLeft).toBe(90);
    });

    it("stops syncing after unregister", async () => {
      const a = table("a", ["b"]);
      const b = table("b", ["a"]);
      const elB = scrollEl();
      a.link.scrollSync.register(scrollEl());
      b.link.scrollSync.register(elB);

      b.link.scrollSync.unregister();
      a.link.scrollSync.onScroll(120, 40);
      await frame();

      expect(elB.scrollLeft).toBe(0);
    });
  });

  describe("highlight sync", () => {
    const coord: HighlightCoordinate = { rowId: 3, columnKey: "revenue" };

    it("delivers a broadcast to every linked table", () => {
      const a = table("a", ["b", "c"]);
      const b = table("b", ["a"]);
      const c = table("c", ["a"]);
      const onB = vi.fn();
      const onC = vi.fn();
      b.link.highlightSync.register(onB);
      c.link.highlightSync.register(onC);

      a.link.highlightSync.broadcast(coord);

      expect(onB).toHaveBeenCalledWith(coord);
      expect(onC).toHaveBeenCalledWith(coord);
    });

    it("does not deliver to the broadcaster", () => {
      const a = table("a", ["b"]);
      table("b", ["a"]);
      const onA = vi.fn();
      a.link.highlightSync.register(onA);

      a.link.highlightSync.broadcast(coord);
      expect(onA).not.toHaveBeenCalled();
    });

    it("stops a re-broadcast from bouncing back", () => {
      const a = table("a", ["b"]);
      const b = table("b", ["a"]);
      const onA = vi.fn();

      a.link.highlightSync.register(onA);
      // B re-broadcasts whatever it receives, as a naive VTable would.
      b.link.highlightSync.register(c => b.link.highlightSync.broadcast(c));

      a.link.highlightSync.broadcast(coord);
      expect(onA).not.toHaveBeenCalled();
    });

    it("ignores a table that has not registered a receiver", () => {
      const a = table("a", ["b"]);
      table("b", ["a"]);
      expect(() => a.link.highlightSync.broadcast(coord)).not.toThrow();
    });

    it("stops delivering after unregister", () => {
      const a = table("a", ["b"]);
      const b = table("b", ["a"]);
      const onB = vi.fn();
      b.link.highlightSync.register(onB);
      b.link.highlightSync.unregister();

      a.link.highlightSync.broadcast(coord);
      expect(onB).not.toHaveBeenCalled();
    });
  });

  describe("resetState", () => {
    it("returns every linked table to page 1", () => {
      const a = table("a", ["b"], { initialPage: 5 });
      const b = table("b", ["a"], { initialPage: 5 });

      a.resetState();
      expect([a.link.page, b.link.page]).toEqual([1, 1]);
    });

    it("takes an explicit page", () => {
      const a = table("a", ["b"]);
      const b = table("b", ["a"]);

      a.resetState(3);
      expect([a.link.page, b.link.page]).toEqual([3, 3]);
    });

    it("ignores the pagination mode", () => {
      // A manual reset is not navigation; even an independent table follows.
      const a = table("a", ["b"]);
      const b = table("b", ["a"], { initialPage: 9 });

      a.resetState();
      expect(b.link.page).toBe(1);
    });

    it("scrolls every container back to the origin", () => {
      const a = table("a", ["b"]);
      const b = table("b", ["a"]);
      const elA = scrollEl(50, 50);
      const elB = scrollEl(80, 80);
      a.link.scrollSync.register(elA);
      b.link.scrollSync.register(elB);

      a.resetState();
      expect([elA.scrollLeft, elA.scrollTop, elB.scrollLeft, elB.scrollTop])
        .toEqual([0, 0, 0, 0]);
    });

    it("clears the stored scroll position", () => {
      const a = table("a", ["b"]);
      a.link.scrollSync.scrollPosition.value = { x: 10, y: 10 };

      a.resetState();
      expect(a.link.scrollSync.scrollPosition.value).toBeNull();
    });

    it("clears every table's highlight in the same pass", () => {
      const a = table("a", ["b"]);
      const b = table("b", ["a"]);
      const onA = vi.fn();
      const onB = vi.fn();
      a.link.highlightSync.register(onA);
      b.link.highlightSync.register(onB);

      a.resetState();
      const cleared = { rowId: null, columnKey: null };
      expect(onA).toHaveBeenCalledWith(cleared);
      expect(onB).toHaveBeenCalledWith(cleared);
    });

    it("is safe with no containers and no receivers", () => {
      expect(() => table("a", ["b"]).resetState()).not.toThrow();
    });
  });

  describe("resetOn", () => {
    it("resets when the watched value changes", async () => {
      const filters = ref("a");
      const a = table("a", ["b"], { resetOn: filters, initialPage: 5 });
      const b = table("b", ["a"], { initialPage: 5 });

      filters.value = "b";
      await nextTick();

      expect([a.link.page, b.link.page]).toEqual([1, 1]);
    });

    it("accepts a getter", async () => {
      const filters = ref({ brand: "a" });
      const a = table("a", [], { resetOn: () => filters.value.brand, initialPage: 5 });

      filters.value = { brand: "b" };
      await nextTick();
      expect(a.link.page).toBe(1);
    });

    it("does not reset while the value holds", async () => {
      const filters = ref("a");
      const a = table("a", [], { resetOn: filters });
      a.link["onUpdate:page"](5);

      filters.value = "a";
      await nextTick();
      expect(a.link.page).toBe(5);
    });

    it("registers no watcher when omitted", async () => {
      const a = table("a", []);
      a.link["onUpdate:page"](5);
      await nextTick();
      expect(a.link.page).toBe(5);
    });
  });

  it("works as a lone table with no links", () => {
    const a = table("solo", []);
    expect(() => {
      a.link["onUpdate:page"](3);
      a.link.scrollSync.onScroll(10, 10);
      a.link.highlightSync.broadcast({ rowId: 1, columnKey: "x" });
      a.resetState();
    }).not.toThrow();
  });
});
