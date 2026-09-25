import { computed, defineComponent, ref, type Ref } from "vue";

import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import { SIDEBAR_STATE_KEY } from "../../../src/components/navigation-sidebar/composables/injectionKeys";
import {
  buildSidebarState,
  useSidebarState,
  type SidebarStateProvided,
} from "../../../src/components/navigation-sidebar/composables/useSidebarState";
import { createSidebar } from "../../../src/components/navigation-sidebar/createSidebar";
import type { SidebarNavItem } from "../../../src/components/navigation-sidebar/types";
import { withScope } from "../../setup/scope";
import { makeNavItems } from "../../setup/sidebar";

/**
 * `buildSidebarState` is the half of the pair that owns behaviour; `useSidebarState`
 * is a typed `inject` with one guard. Both are exercised here because they are the
 * two ends of the same seam — the factory runs once in `NavigationSidebar.vue` and
 * every child reaches the result through the consumer.
 *
 * No router: nothing in this file touches a route.
 */

function state(items: SidebarNavItem[] | Ref<SidebarNavItem[]> = makeNavItems()) {
  return withScope(() => buildSidebarState(createSidebar({ items })));
}

describe("buildSidebarState", () => {
  describe("items", () => {
    it("resolves a plain array", () => {
      const items = makeNavItems();
      const { result } = state(items);
      expect(result.resolvedItems.value).toEqual(items);
    });

    it("unwraps a ref, and tracks it", () => {
      // The instance takes `MaybeRef<SidebarNavItem[]>` precisely so an app can
      // hand it a computed over its auth store; a snapshot taken at build time
      // would freeze the menu at whatever the user could see on first paint.
      const items = ref(makeNavItems());
      const { result } = state(items);
      expect(result.resolvedItems.value).toHaveLength(4);

      items.value = [{ id: "solo", label: "Solo" }];
      expect(result.resolvedItems.value).toEqual([{ id: "solo", label: "Solo" }]);
    });

    it("tracks a computed too", () => {
      const all = ref(makeNavItems());
      const visible = computed(() => all.value.filter(i => i.id !== "reports"));
      const { result } = state(visible);
      expect(result.resolvedItems.value.map(i => i.id)).toEqual(["home", "catalog", "action"]);
    });
  });

  describe("collapse", () => {
    it("starts open and flips on toggle", () => {
      const { result } = state();
      expect(result.isCollapsed.value).toBe(false);
      result.toggleCollapse();
      expect(result.isCollapsed.value).toBe(true);
      result.toggleCollapse();
      expect(result.isCollapsed.value).toBe(false);
    });

    it("writes through to the instance's own ref, not a copy", () => {
      // The state object hands out the instance's refs directly, which is what
      // lets an app toggle the sidebar from outside the component tree.
      const instance = createSidebar({ items: makeNavItems() });
      const { result } = withScope(() => buildSidebarState(instance));
      result.toggleCollapse();
      expect(instance.isCollapsed.value).toBe(true);
    });
  });

  describe("expansion", () => {
    it("starts with nothing expanded", () => {
      const { result } = state();
      expect(result.expandedItems.value.size).toBe(0);
      expect(result.isExpanded("catalog")).toBe(false);
    });

    it("toggles an id in and back out", () => {
      const { result } = state();
      result.toggleExpanded("catalog");
      expect(result.isExpanded("catalog")).toBe(true);
      result.toggleExpanded("catalog");
      expect(result.isExpanded("catalog")).toBe(false);
    });

    it("holds several open at once", () => {
      // Accordion behaviour is not the sidebar's — two sibling branches can be
      // open together, and a test that asserted otherwise would be pinning a
      // behaviour the component deliberately does not have.
      const { result } = state();
      result.toggleExpanded("catalog");
      result.toggleExpanded("media");
      expect([...result.expandedItems.value]).toEqual(["catalog", "media"]);
    });

    it("replaces the Set rather than mutating it in place", () => {
      // A `Ref<Set>` does not notify on `add`/`delete`, so every writer
      // reassigns. Identity is the only way to assert that from outside.
      const { result } = state();
      const before = result.expandedItems.value;
      result.toggleExpanded("catalog");
      expect(result.expandedItems.value).not.toBe(before);
    });

    it("drives a computed that reads it", () => {
      // Which is the point of the reassignment above: this computed is what the
      // nav items bind their chevron to.
      const { result } = state();
      const open = computed(() => [...result.expandedItems.value].sort());
      expect(open.value).toEqual([]);
      result.toggleExpanded("catalog");
      expect(open.value).toEqual(["catalog"]);
    });

    it("expandMany opens every id given and leaves the rest open", () => {
      const { result } = state();
      result.toggleExpanded("reports");
      result.expandMany(["catalog", "media"]);
      expect([...result.expandedItems.value].sort()).toEqual(["catalog", "media", "reports"]);
    });

    it("expandMany never closes a branch that is already open", () => {
      // Add-only by contract: the route watcher calls it on every navigation,
      // and a toggle there would shut the branch the reader is standing in.
      const { result } = state();
      result.toggleExpanded("catalog");
      result.expandMany(["catalog"]);
      expect(result.isExpanded("catalog")).toBe(true);
    });

    it("expandMany reassigns once per batch, and not at all for an empty one", () => {
      const { result } = state();
      const before = result.expandedItems.value;
      result.expandMany([]);
      expect(result.expandedItems.value).toBe(before);
      result.expandMany(["catalog", "media"]);
      expect(result.expandedItems.value).not.toBe(before);
    });

    it("expands an id that is in no menu, without complaint", () => {
      // The state is a set of strings; it does not know the tree. Validating
      // against it here would duplicate a check the components already make by
      // simply not rendering a chevron for a childless item.
      const { result } = state();
      result.toggleExpanded("nonexistent");
      expect(result.isExpanded("nonexistent")).toBe(true);
    });
  });

  describe("mobile drawer", () => {
    it("starts closed", () => {
      expect(state().result.isMobileOpen.value).toBe(false);
    });

    it("opens, closes and toggles", () => {
      const { result } = state();
      result.openMobile();
      expect(result.isMobileOpen.value).toBe(true);
      result.closeMobile();
      expect(result.isMobileOpen.value).toBe(false);
      result.toggleMobile();
      expect(result.isMobileOpen.value).toBe(true);
    });

    it("treats open and close as idempotent", () => {
      // `closeMobile` runs on every route change, so it is called far more often
      // than the drawer is actually open.
      const { result } = state();
      result.openMobile();
      result.openMobile();
      expect(result.isMobileOpen.value).toBe(true);
      result.closeMobile();
      result.closeMobile();
      expect(result.isMobileOpen.value).toBe(false);
    });

    it("is independent of the collapse axis", () => {
      // Desktop rail and mobile drawer are two different controls that happen to
      // live on one component; collapsing one must not open the other.
      const { result } = state();
      result.toggleCollapse();
      expect(result.isMobileOpen.value).toBe(false);
      result.toggleMobile();
      expect(result.isCollapsed.value).toBe(true);
    });
  });

  describe("options", () => {
    it("passes the resolved options straight through", () => {
      const instance = createSidebar({
        items: [],
        brandName: "Muzakit",
        persistentQueryParams: ["brand"],
      });
      const { result } = withScope(() => buildSidebarState(instance));
      expect(result.options).toBe(instance.options);
      expect(result.options.brandName).toBe("Muzakit");
      expect(result.options.persistentQueryParams).toEqual(["brand"]);
    });
  });

  it("keeps two instances apart", () => {
    // No module-level state anywhere in the sidebar: two of them on one page
    // (a docs shell rendering a live example, say) must not share a collapse.
    const a = state();
    const b = state();
    a.result.toggleCollapse();
    a.result.toggleExpanded("catalog");

    expect(b.result.isCollapsed.value).toBe(false);
    expect(b.result.isExpanded("catalog")).toBe(false);
  });
});

describe("useSidebarState", () => {
  /** The shape the real state carries; only the injection is under test here. */
  const provided = (): SidebarStateProvided => ({
    ...withScope(() => buildSidebarState(createSidebar({ items: makeNavItems() }))).result,
    activeItemId: computed(() => "home"),
    activePathIds: computed(() => new Set(["home"])),
    isActive: id => id === "home",
    isOnActivePath: id => id === "home",
    onPrefetch: () => {},
  });

  it("returns what the nearest sidebar provided", () => {
    const value = provided();
    let received: SidebarStateProvided | null = null;

    const Child = defineComponent({
      setup() {
        received = useSidebarState();
        return () => null;
      },
    });

    mount(Child, { global: { provide: { [SIDEBAR_STATE_KEY as symbol]: value } } });

    expect(received).toBe(value);
  });

  it("throws a message that names the fix when used outside a sidebar", () => {
    // The alternative is `undefined.isCollapsed` thrown from deep inside a child
    // component, which says nothing about the wrapper being missing.
    expect(() => useSidebarState()).toThrow(/outside of <NavigationSidebar>/);
    expect(() => useSidebarState()).toThrow(/:sidebar=/);
  });
});
