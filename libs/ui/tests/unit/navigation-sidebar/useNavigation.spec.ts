import { computed, ref } from "vue";

import { flushPromises } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import {
  resetNavigation,
  useNavigation,
} from "../../../src/components/navigation-sidebar/composables/useNavigation";
import type { SidebarNavItem } from "../../../src/components/navigation-sidebar/types";
import { makeNavItems, withRouter } from "../../setup/sidebar";

/**
 * The resolver behind every highlighted row in the sidebar: it flattens the tree
 * once, then answers "is this the current route?" and "is this an ancestor of
 * it?" in O(1). Both questions are asked once per item on every render, which is
 * why the answers are sets and not tree walks.
 *
 * A real memory-history router throughout — the whole unit is *about* matching a
 * route, so a stubbed `useRoute` would leave nothing under test.
 */

async function nav(items: SidebarNavItem[] = makeNavItems(), initial = "/") {
  const source = ref(items);
  const host = await withRouter(() => useNavigation(computed(() => source.value)), initial);
  return { ...host, source };
}

describe("useNavigation", () => {
  describe("matching by path", () => {
    it("finds the item whose `to` is the current path", async () => {
      const { result } = await nav(makeNavItems(), "/catalog/products");
      expect(result.activeItemId.value).toBe("products");
      expect(result.isActive("products")).toBe(true);
    });

    it("matches a root item", async () => {
      const { result } = await nav(makeNavItems(), "/");
      expect(result.activeItemId.value).toBe("home");
    });

    it("holds no one active on a route no item points at", async () => {
      const { result } = await nav(makeNavItems(), "/elsewhere");
      expect(result.activeItemId.value).toBeNull();
      expect(result.activePathIds.value.size).toBe(0);
    });

    it("matches exactly, not by prefix", async () => {
      // `/catalog` is a prefix of `/catalog/products`, and a `startsWith` match
      // would light up the parent as a leaf. The parent gets its highlight from
      // the active *path* instead — see below.
      const { result } = await nav(makeNavItems(), "/catalog/products");
      expect(result.isActive("catalog")).toBe(false);
      expect(result.isOnActivePath("catalog")).toBe(true);
    });
  });

  describe("matching by name", () => {
    it("finds an item whose `to` is a named location", async () => {
      const { result } = await nav(makeNavItems(), "/catalog/media/videos");
      expect(result.activeItemId.value).toBe("videos");
    });

    it("prefers whichever entry the scan reaches first", async () => {
      // Two items can legitimately point at one route (a shortcut duplicated
      // into a second group). The loop breaks on the first hit, so declaration
      // order decides — pinned here so a reordering of the scan is visible.
      const { result } = await nav([
        { id: "first", label: "First", to: "/catalog" },
        { id: "second", label: "Second", to: "/catalog" },
      ], "/catalog");
      expect(result.activeItemId.value).toBe("first");
    });
  });

  describe("the active path", () => {
    it("carries the whole chain from root to the active leaf", async () => {
      const { result } = await nav(makeNavItems(), "/catalog/media/images");
      expect([...result.activePathIds.value]).toEqual(["catalog", "media", "images"]);
    });

    it("answers for every ancestor and no one else", async () => {
      const { result } = await nav(makeNavItems(), "/catalog/media/images");
      expect(result.isOnActivePath("catalog")).toBe(true);
      expect(result.isOnActivePath("media")).toBe(true);
      expect(result.isOnActivePath("images")).toBe(true);
      expect(result.isOnActivePath("products")).toBe(false);
      expect(result.isOnActivePath("home")).toBe(false);
    });

    it("includes the leaf itself, so an active item is also on its own path", async () => {
      const { result } = await nav(makeNavItems(), "/");
      expect([...result.activePathIds.value]).toEqual(["home"]);
      expect(result.isOnActivePath("home")).toBe(true);
    });

    it("counts a navigable parent as the leaf when it is the one matched", async () => {
      const { result } = await nav(makeNavItems(), "/catalog");
      expect(result.activeItemId.value).toBe("catalog");
      expect([...result.activePathIds.value]).toEqual(["catalog"]);
      expect(result.isOnActivePath("products")).toBe(false);
    });
  });

  describe("route changes", () => {
    it("follows a navigation", async () => {
      const { result, router } = await nav(makeNavItems(), "/");
      expect(result.activeItemId.value).toBe("home");

      await router.push("/catalog/products");
      await flushPromises();
      expect(result.activeItemId.value).toBe("products");
      expect([...result.activePathIds.value]).toEqual(["catalog", "products"]);
    });

    it("clears the highlight on the way out of the menu", async () => {
      const { result, router } = await nav(makeNavItems(), "/catalog/products");
      await router.push("/elsewhere");
      await flushPromises();
      expect(result.activeItemId.value).toBeNull();
      expect(result.isOnActivePath("catalog")).toBe(false);
    });

    it("resolves on the first tick, without waiting for a navigation", async () => {
      // `{ immediate: true }` on the watch. Without it the sidebar would paint
      // once with nothing highlighted before settling — a visible flicker on
      // every full page load.
      const { result } = await nav(makeNavItems(), "/catalog/products");
      expect(result.activeItemId.value).toBe("products");
    });
  });

  describe("the item tree changing underneath", () => {
    it("re-resolves when an item gains a `to` that matches", async () => {
      const { result, source, router } = await nav([
        { id: "reports", label: "Reports" },
      ], "/elsewhere");
      expect(result.activeItemId.value).toBeNull();

      source.value = [{ id: "reports", label: "Reports", to: "/elsewhere" }];
      // The lookup is a computed, but the match runs in a watch on the route —
      // so a config change alone does not re-run it until the route moves.
      await router.push("/");
      await router.push("/elsewhere");
      await flushPromises();
      expect(result.activeItemId.value).toBe("reports");
    });

    it("walks a menu that grows a level", async () => {
      const { result, source, router } = await nav([
        { id: "catalog", label: "Catalog", children: [] },
      ], "/");

      source.value = [{
        id: "catalog",
        label: "Catalog",
        children: [{ id: "products", label: "Products", to: "/catalog/products" }],
      }];
      await router.push("/catalog/products");
      await flushPromises();
      expect([...result.activePathIds.value]).toEqual(["catalog", "products"]);
    });
  });

  describe("items it must not trip over", () => {
    it("skips an item with no destination", async () => {
      const { result } = await nav(makeNavItems(), "/");
      expect(result.isActive("action")).toBe(false);
      expect(result.isActive("reports")).toBe(false);
    });

    it("handles an empty menu", async () => {
      const { result } = await nav([], "/");
      expect(result.activeItemId.value).toBeNull();
    });

    it("descends into a branch that is itself not navigable", async () => {
      // `media` has no `to` of its own, so it never enters the lookup as an
      // entry — but it must still appear in its children's ancestor chains.
      const { result } = await nav(makeNavItems(), "/catalog/media/images");
      expect(result.isActive("media")).toBe(false);
      expect(result.isOnActivePath("media")).toBe(true);
    });

    it("ignores an object destination carrying neither name nor path", async () => {
      const { result } = await nav([
        { id: "odd", label: "Odd", to: { params: { id: "1" } } as never },
      ], "/");
      expect(result.activeItemId.value).toBeNull();
    });
  });

  it("keeps two instances on one page apart", async () => {
    // No module-level state: the composable is called once per sidebar, and two
    // of them resolving against different menus must not see each other's match.
    const a = await nav(makeNavItems(), "/catalog/products");
    const b = await nav([{ id: "only", label: "Only", to: "/elsewhere" }], "/catalog/products");

    expect(a.result.activeItemId.value).toBe("products");
    expect(b.result.activeItemId.value).toBeNull();
  });

  it("still exports the deprecated reset as a no-op", async () => {
    // Kept for a consumer that has not migrated. If it ever does something
    // again, this test is where that shows up.
    const { result } = await nav(makeNavItems(), "/catalog/products");
    resetNavigation();
    expect(result.activeItemId.value).toBe("products");
  });
});
