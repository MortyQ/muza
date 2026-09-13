import { computed, nextTick, ref } from "vue";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { createSidebar } from "../../../src/components/navigation-sidebar/createSidebar";
import { withScope } from "../../setup/scope";
import { makeNavItems } from "../../setup/sidebar";

/**
 * The factory an app calls once, at module scope, to get a sidebar it can drive
 * from anywhere — and the only part of the sidebar that touches `localStorage`.
 *
 * Persistence is written through `watchEffect`, so every case that asserts a
 * write runs inside an `effectScope` and awaits a tick: outside one, the watcher
 * would leak into the next test and keep writing.
 */

const KEY = "ui-sidebar";

function sidebar(options: Parameters<typeof createSidebar>[0]) {
  return withScope(() => createSidebar(options));
}

beforeEach(() => {
  localStorage.clear();
});

describe("createSidebar", () => {
  describe("options", () => {
    it("fills in every optional field", () => {
      const { result } = sidebar({ items: [] });
      expect(result.options).toEqual({
        brandName: "",
        logoUrl: "",
        storageKey: KEY,
        persistCollapse: true,
        persistentQueryParams: [],
      });
    });

    it("keeps what the caller passed", () => {
      const { result } = sidebar({
        items: [],
        brandName: "Muzakit",
        logoUrl: "/logo.svg",
        storageKey: "custom",
        persistCollapse: false,
        persistentQueryParams: ["brand", "channel"],
      });
      expect(result.options).toEqual({
        brandName: "Muzakit",
        logoUrl: "/logo.svg",
        storageKey: "custom",
        persistCollapse: false,
        persistentQueryParams: ["brand", "channel"],
      });
    });

    it("treats an explicit false as a value, not as absent", () => {
      // `??` rather than `||`, which is the difference between honouring
      // `persistCollapse: false` and silently turning it back on.
      expect(sidebar({ items: [], persistCollapse: false }).result.options.persistCollapse)
        .toBe(false);
    });

    it("hands the items through without resolving them", () => {
      // The instance stores the `MaybeRef` as given; unwrapping is
      // `buildSidebarState`'s job, and doing it here would freeze a computed
      // menu at its first value.
      const items = computed(() => makeNavItems());
      expect(sidebar({ items }).result.items).toBe(items);
    });
  });

  describe("state", () => {
    it("starts open, closed and unexpanded", () => {
      const { result } = sidebar({ items: [], persistCollapse: false });
      expect(result.isCollapsed.value).toBe(false);
      expect(result.isMobileOpen.value).toBe(false);
      expect(result.expandedItems.value.size).toBe(0);
    });

    it("toggles collapse and mobile", () => {
      const { result } = sidebar({ items: [], persistCollapse: false });
      result.toggleCollapse();
      expect(result.isCollapsed.value).toBe(true);
      result.toggleMobile();
      expect(result.isMobileOpen.value).toBe(true);
    });

    it("gives two instances independent state", () => {
      // No module-level refs anywhere in the factory — this is the reason it is
      // a factory rather than a singleton composable.
      const a = sidebar({ items: [], persistCollapse: false });
      const b = sidebar({ items: [], persistCollapse: false });
      a.result.toggleCollapse();
      expect(b.result.isCollapsed.value).toBe(false);
    });
  });

  describe("restoring from storage", () => {
    it("comes back collapsed", () => {
      localStorage.setItem(`${KEY}:collapsed`, "true");
      expect(sidebar({ items: [] }).result.isCollapsed.value).toBe(true);
    });

    it("reads only the exact string true", () => {
      localStorage.setItem(`${KEY}:collapsed`, "1");
      expect(sidebar({ items: [] }).result.isCollapsed.value).toBe(false);
    });

    it("comes back with its branches open", () => {
      localStorage.setItem(`${KEY}:expanded`, JSON.stringify(["catalog", "media"]));
      expect([...sidebar({ items: [] }).result.expandedItems.value])
        .toEqual(["catalog", "media"]);
    });

    it("reads from the key it was given", () => {
      localStorage.setItem("custom:collapsed", "true");
      expect(sidebar({ items: [], storageKey: "custom" }).result.isCollapsed.value).toBe(true);
      expect(sidebar({ items: [] }).result.isCollapsed.value).toBe(false);
    });

    it("ignores storage entirely when persistence is off", () => {
      localStorage.setItem(`${KEY}:collapsed`, "true");
      localStorage.setItem(`${KEY}:expanded`, JSON.stringify(["catalog"]));
      const { result } = sidebar({ items: [], persistCollapse: false });
      expect(result.isCollapsed.value).toBe(false);
      expect(result.expandedItems.value.size).toBe(0);
    });

    describe("when what is stored is not what was stored", () => {
      it("falls back on unparseable JSON", () => {
        // A half-written value from a tab killed mid-write, or a key another
        // app happens to share. Either way the sidebar opens rather than throws
        // during setup, which would take the whole app's render down with it.
        localStorage.setItem(`${KEY}:expanded`, "{not json");
        expect(sidebar({ items: [] }).result.expandedItems.value.size).toBe(0);
      });

      it("falls back on valid JSON of the wrong shape", () => {
        localStorage.setItem(`${KEY}:expanded`, JSON.stringify({ catalog: true }));
        expect(sidebar({ items: [] }).result.expandedItems.value.size).toBe(0);
      });

      it("falls back on an absent key", () => {
        expect(sidebar({ items: [] }).result.expandedItems.value.size).toBe(0);
      });

      it("survives storage throwing on read", () => {
        // Safari in private mode, and any browser with site data blocked.
        const spy = vi.spyOn(Storage.prototype, "getItem")
          .mockImplementation(() => { throw new Error("denied"); });
        const { result } = sidebar({ items: [] });
        expect(result.isCollapsed.value).toBe(false);
        expect(result.expandedItems.value.size).toBe(0);
        spy.mockRestore();
      });
    });
  });

  describe("writing to storage", () => {
    it("saves the collapse on change", async () => {
      const { result } = sidebar({ items: [] });
      result.toggleCollapse();
      await nextTick();
      expect(localStorage.getItem(`${KEY}:collapsed`)).toBe("true");
    });

    it("saves the expanded set as an array", async () => {
      const { result } = sidebar({ items: [] });
      result.expandedItems.value = new Set(["catalog"]);
      await nextTick();
      expect(localStorage.getItem(`${KEY}:expanded`)).toBe(JSON.stringify(["catalog"]));
    });

    it("writes once on setup, before anything is touched", async () => {
      // `watchEffect` runs immediately. That is deliberate here: it seeds both
      // keys so a later read never takes the fallback path.
      sidebar({ items: [] });
      await nextTick();
      expect(localStorage.getItem(`${KEY}:collapsed`)).toBe("false");
      expect(localStorage.getItem(`${KEY}:expanded`)).toBe("[]");
    });

    it("writes nothing when persistence is off", async () => {
      const { result } = sidebar({ items: [], persistCollapse: false });
      result.toggleCollapse();
      await nextTick();
      expect(localStorage.getItem(`${KEY}:collapsed`)).toBeNull();
    });

    it("does not save the mobile drawer", async () => {
      // A drawer that reopened itself on the next page load would be a bug, not
      // a restored preference.
      const { result } = sidebar({ items: [] });
      result.toggleMobile();
      await nextTick();
      expect(localStorage.getItem(`${KEY}:mobileOpen`)).toBeNull();
    });

    it("survives storage throwing on write", async () => {
      const spy = vi.spyOn(Storage.prototype, "setItem")
        .mockImplementation(() => { throw new Error("quota exceeded"); });
      const { result } = sidebar({ items: [] });
      expect(() => result.toggleCollapse()).not.toThrow();
      await nextTick();
      expect(result.isCollapsed.value).toBe(true);
      spy.mockRestore();
    });

    it("stops writing once the scope is disposed", async () => {
      // The watchers belong to whatever scope the factory was called in. An app
      // calls it at module scope and never disposes; a test that did not would
      // leak a writer into every later case.
      const { result, scope } = sidebar({ items: [] });
      scope.stop();
      result.isCollapsed.value = true;
      await nextTick();
      expect(localStorage.getItem(`${KEY}:collapsed`)).toBe("false");
    });

    it("round-trips through a second instance", async () => {
      const first = sidebar({ items: [] });
      first.result.expandedItems.value = new Set(["catalog", "media"]);
      first.result.isCollapsed.value = true;
      // The write is a `watchEffect`, so it lands on the next flush — reading
      // it back in the same tick is what a real second page load never does.
      await nextTick();

      const second = sidebar({ items: [] });
      expect(second.result.isCollapsed.value).toBe(true);
      expect([...second.result.expandedItems.value]).toEqual(["catalog", "media"]);
    });

    it("keeps two storage keys apart", async () => {
      const a = sidebar({ items: [], storageKey: "app-a" });
      sidebar({ items: [], storageKey: "app-b" });
      a.result.toggleCollapse();
      await nextTick();
      expect(localStorage.getItem("app-a:collapsed")).toBe("true");
      expect(localStorage.getItem("app-b:collapsed")).toBe("false");
    });
  });

  it("accepts a ref of items and does not touch it", () => {
    const items = ref(makeNavItems());
    const { result } = sidebar({ items });
    expect(result.items).toBe(items);
  });
});
