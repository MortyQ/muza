import { flushPromises } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import { useNavItemTo } from "../../../src/components/navigation-sidebar/composables/useNavItemTo";
import type { SidebarNavItem } from "../../../src/components/navigation-sidebar/types";
import { withRouter } from "../../setup/sidebar";

/**
 * What keeps a brand/channel/date filter alive when the user moves between
 * sections: every nav item's `to` is rewritten on the way out to carry whichever
 * persistent params are currently in the URL.
 *
 * The rule the whole file circles: preserved params are a *floor*, never an
 * override. An item that names a param itself has said something deliberate, and
 * the current URL does not get to overrule it.
 */

async function resolve(
  item: SidebarNavItem,
  persistent: string[] = [],
  url = "/",
) {
  const host = await withRouter(() => useNavItemTo(item, persistent), url);
  return { ...host, to: () => host.result.resolvedTo.value };
}

const ITEM: SidebarNavItem = { id: "products", label: "Products", to: "/catalog/products" };

describe("useNavItemTo", () => {
  describe("when there is nothing to preserve", () => {
    it("passes a string destination through untouched", async () => {
      const { to } = await resolve(ITEM, [], "/?brand=acme");
      expect(to()).toBe("/catalog/products");
    });

    it("passes an object destination through by identity", async () => {
      // Not merely equal — the same object. A copy here would defeat the
      // `v-memo`-shaped comparisons a nav item's RouterLink relies on.
      const destination = { name: "videos" };
      const { to } = await resolve({ id: "v", label: "V", to: destination });
      expect(to()).toBe(destination);
    });

    it("returns undefined for an item that does not navigate", async () => {
      // An `onClick` item renders as a button, and a `to` of undefined is what
      // tells it to.
      const { to } = await resolve({ id: "action", label: "Run import", onClick: () => {} });
      expect(to()).toBeUndefined();
    });

    it("leaves the destination alone when none of the keys are in the URL", async () => {
      const { to } = await resolve(ITEM, ["brand", "channel"], "/?unrelated=1");
      expect(to()).toBe("/catalog/products");
    });
  });

  describe("preserving params", () => {
    it("turns a string destination into a location carrying the params", async () => {
      const { to } = await resolve(ITEM, ["brand"], "/?brand=acme");
      expect(to()).toEqual({ path: "/catalog/products", query: { brand: "acme" } });
    });

    it("takes only the keys it was asked for", async () => {
      const { to } = await resolve(ITEM, ["brand"], "/?brand=acme&page=3");
      expect(to()).toEqual({ path: "/catalog/products", query: { brand: "acme" } });
    });

    it("carries several at once", async () => {
      const { to } = await resolve(ITEM, ["brand", "channel"], "/?brand=acme&channel=amazon");
      expect(to()).toEqual({
        path: "/catalog/products",
        query: { brand: "acme", channel: "amazon" },
      });
    });

    it("skips a key that is absent, without writing undefined into the query", async () => {
      // `{ channel: undefined }` in a query serialises to a bare `?channel`,
      // which is not the same URL as no param at all.
      const { to } = await resolve(ITEM, ["brand", "channel"], "/?brand=acme");
      expect(to()).toEqual({ path: "/catalog/products", query: { brand: "acme" } });
      expect(Object.keys((to() as { query: object }).query)).toEqual(["brand"]);
    });

    it("keeps a param that is present but empty", async () => {
      // `?brand=` is a value — a cleared filter — and dropping it would silently
      // reinstate whatever default the destination page falls back to.
      const { to } = await resolve(ITEM, ["brand"], "/?brand=");
      expect(to()).toEqual({ path: "/catalog/products", query: { brand: "" } });
    });

    it("takes the first of a repeated param", async () => {
      // vue-router hands back an array for `?brand=a&brand=b`; the destination
      // takes one string, so the first wins.
      const { to } = await resolve(ITEM, ["brand"], "/?brand=acme&brand=other");
      expect(to()).toEqual({ path: "/catalog/products", query: { brand: "acme" } });
    });
  });

  describe("object destinations", () => {
    it("merges the params into a named location", async () => {
      const { to } = await resolve(
        { id: "v", label: "V", to: { name: "videos" } },
        ["brand"],
        "/?brand=acme",
      );
      expect(to()).toEqual({ name: "videos", query: { brand: "acme" } });
    });

    it("keeps the rest of the location intact", async () => {
      const { to } = await resolve(
        { id: "v", label: "V", to: { name: "videos", params: { id: "7" }, hash: "#top" } },
        ["brand"],
        "/?brand=acme",
      );
      expect(to()).toEqual({
        name: "videos",
        params: { id: "7" },
        hash: "#top",
        query: { brand: "acme" },
      });
    });

    it("lets the item's own query win a collision", async () => {
      // The item asked for `brand=fixed`; that is a statement about where the
      // link goes, and the ambient filter does not get to rewrite it.
      const { to } = await resolve(
        { id: "p", label: "P", to: { path: "/catalog", query: { brand: "fixed" } } },
        ["brand"],
        "/?brand=acme",
      );
      expect(to()).toEqual({ path: "/catalog", query: { brand: "fixed" } });
    });

    it("merges alongside the item's own unrelated query keys", async () => {
      const { to } = await resolve(
        { id: "p", label: "P", to: { path: "/catalog", query: { tab: "grid" } } },
        ["brand"],
        "/?brand=acme",
      );
      expect(to()).toEqual({ path: "/catalog", query: { brand: "acme", tab: "grid" } });
    });
  });

  describe("reactivity", () => {
    it("re-resolves when the URL's params change", async () => {
      // The composable is called once per nav item at setup; every later filter
      // change has to reach the links through this computed alone.
      const { to, router } = await resolve(ITEM, ["brand"], "/?brand=acme");
      expect(to()).toEqual({ path: "/catalog/products", query: { brand: "acme" } });

      await router.push("/?brand=other");
      await flushPromises();
      expect(to()).toEqual({ path: "/catalog/products", query: { brand: "other" } });
    });

    it("falls back to the bare destination when the param is dropped", async () => {
      const { to, router } = await resolve(ITEM, ["brand"], "/?brand=acme");
      await router.push("/");
      await flushPromises();
      expect(to()).toBe("/catalog/products");
    });
  });
});
