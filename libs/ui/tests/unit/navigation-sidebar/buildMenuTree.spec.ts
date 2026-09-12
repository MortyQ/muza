import { describe, expect, it } from "vitest";

import {
  buildMenuTree,
  type FlatMenuItem,
} from "../../../src/components/navigation-sidebar/utils/buildMenuTree";

/**
 * Turns a flat list of routes-with-meta into the nested menu the sidebar renders.
 * The grouping key is a `"A/B/C"` string on each route's meta, so an app declares
 * its menu shape route by route and never writes the tree out.
 */

const leaf = (id: string, meta: FlatMenuItem["meta"] = {}): FlatMenuItem => ({
  item: { id, label: id, to: `/${id}` },
  meta,
});

describe("buildMenuTree", () => {
  it("returns an empty tree for an empty list", () => {
    expect(buildMenuTree([])).toEqual([]);
  });

  it("leaves ungrouped items at the root", () => {
    const tree = buildMenuTree([leaf("dash"), leaf("settings")]);
    expect(tree.map(n => n.id)).toEqual(["dash", "settings"]);
    expect(tree[0].children).toBeUndefined();
  });

  describe("grouping", () => {
    it("creates a group node and nests the item under it", () => {
      const tree = buildMenuTree([leaf("q1", { menuGroup: "Analytics" })]);
      expect(tree).toHaveLength(1);
      expect(tree[0].id).toBe("group:Analytics");
      expect(tree[0].label).toBe("Analytics");
      expect(tree[0].children?.map(c => c.id)).toEqual(["q1"]);
    });

    it("puts two items of one group under the same node", () => {
      // The node is looked up by id before being created, which is what keeps
      // twenty routes in one section from producing twenty sections.
      const tree = buildMenuTree([
        leaf("q1", { menuGroup: "Analytics" }),
        leaf("q2", { menuGroup: "Analytics" }),
      ]);
      expect(tree).toHaveLength(1);
      expect(tree[0].children?.map(c => c.id)).toEqual(["q1", "q2"]);
    });

    it("nests as deep as the path has segments", () => {
      const tree = buildMenuTree([leaf("jan", { menuGroup: "Analytics/Q1/Months" })]);
      const analytics = tree[0];
      const q1 = analytics.children?.[0];
      const months = q1?.children?.[0];

      expect(analytics.id).toBe("group:Analytics");
      expect(q1?.id).toBe("group:Analytics/Q1");
      expect(months?.id).toBe("group:Analytics/Q1/Months");
      expect(months?.children?.map(c => c.id)).toEqual(["jan"]);
    });

    it("keys a group by its full path, not its last segment", () => {
      // `Sales/Reports` and `Ops/Reports` are two different sections that happen
      // to share a label; an id of `group:Reports` would merge them.
      const tree = buildMenuTree([
        leaf("a", { menuGroup: "Sales/Reports" }),
        leaf("b", { menuGroup: "Ops/Reports" }),
      ]);
      expect(tree.map(n => n.id).sort()).toEqual(["group:Ops", "group:Sales"]);
      expect(tree.flatMap(n => n.children?.map(c => c.id) ?? []).sort())
        .toEqual(["group:Ops/Reports", "group:Sales/Reports"]);
    });

    it("shares the ancestors of two sibling groups", () => {
      const tree = buildMenuTree([
        leaf("a", { menuGroup: "Analytics/Q1" }),
        leaf("b", { menuGroup: "Analytics/Q2" }),
      ]);
      expect(tree).toHaveLength(1);
      expect(tree[0].children?.map(c => c.id))
        .toEqual(["group:Analytics/Q1", "group:Analytics/Q2"]);
    });

    it("lets a leaf sit beside a group at the same level", () => {
      const tree = buildMenuTree([
        leaf("overview", { menuGroup: "Analytics" }),
        leaf("jan", { menuGroup: "Analytics/Q1" }),
      ]);
      expect(tree[0].children?.map(c => c.id)).toEqual(["overview", "group:Analytics/Q1"]);
    });
  });

  describe("group icons and order", () => {
    it("takes the root group's icon and order from the flat meta fields", () => {
      const tree = buildMenuTree([
        leaf("q1", { menuGroup: "Analytics", menuGroupIcon: "lucide:chart", menuGroupOrder: 2 }),
      ]);
      expect(tree[0].icon).toBe("lucide:chart");
      expect(tree[0].order).toBe(2);
    });

    it("applies those only to the first segment", () => {
      // `menuGroupIcon` names the section, not every level under it — a nested
      // node inheriting it would repeat one glyph down the whole branch.
      const tree = buildMenuTree([
        leaf("jan", { menuGroup: "Analytics/Q1", menuGroupIcon: "lucide:chart" }),
      ]);
      expect(tree[0].icon).toBe("lucide:chart");
      expect(tree[0].children?.[0].icon).toBeUndefined();
    });

    it("lets menuGroupMeta address a segment by name at any depth", () => {
      const tree = buildMenuTree([
        leaf("jan", {
          menuGroup: "Analytics/Q1",
          menuGroupMeta: { Q1: { icon: "lucide:calendar", order: 1 } },
        }),
      ]);
      expect(tree[0].children?.[0].icon).toBe("lucide:calendar");
      expect(tree[0].children?.[0].order).toBe(1);
    });

    it("lets menuGroupMeta win over the flat field on the root segment", () => {
      const tree = buildMenuTree([
        leaf("q1", {
          menuGroup: "Analytics",
          menuGroupIcon: "lucide:chart",
          menuGroupMeta: { Analytics: { icon: "lucide:star" } },
        }),
      ]);
      expect(tree[0].icon).toBe("lucide:star");
    });

    it("defaults a group with no order to the end", () => {
      expect(buildMenuTree([leaf("q1", { menuGroup: "Analytics" })])[0].order).toBe(999);
    });

    it("keeps the meta from whichever item created the node", () => {
      // The node is created once and then only found; a later item carrying a
      // different icon does not restyle a section that already exists.
      const tree = buildMenuTree([
        leaf("a", { menuGroup: "Analytics", menuGroupIcon: "lucide:chart" }),
        leaf("b", { menuGroup: "Analytics", menuGroupIcon: "lucide:star" }),
      ]);
      expect(tree[0].icon).toBe("lucide:chart");
    });
  });

  describe("sorting", () => {
    it("orders roots by `order`", () => {
      const tree = buildMenuTree([
        { item: { id: "c", label: "C", order: 3 }, meta: {} },
        { item: { id: "a", label: "A", order: 1 }, meta: {} },
        { item: { id: "b", label: "B", order: 2 }, meta: {} },
      ]);
      expect(tree.map(n => n.id)).toEqual(["a", "b", "c"]);
    });

    it("sends an item with no order to the end", () => {
      const tree = buildMenuTree([
        { item: { id: "unordered", label: "U" }, meta: {} },
        { item: { id: "first", label: "F", order: 1 }, meta: {} },
      ]);
      expect(tree.map(n => n.id)).toEqual(["first", "unordered"]);
    });

    it("sorts inside a group too", () => {
      const tree = buildMenuTree([
        { item: { id: "b", label: "B", order: 2 }, meta: { menuGroup: "G" } },
        { item: { id: "a", label: "A", order: 1 }, meta: { menuGroup: "G" } },
      ]);
      expect(tree[0].children?.map(c => c.id)).toEqual(["a", "b"]);
    });

    it("sorts at every depth", () => {
      const tree = buildMenuTree([
        { item: { id: "z", label: "Z", order: 2 }, meta: { menuGroup: "A/B" } },
        { item: { id: "y", label: "Y", order: 1 }, meta: { menuGroup: "A/B" } },
      ]);
      expect(tree[0].children?.[0].children?.map(c => c.id)).toEqual(["y", "z"]);
    });

    it("ranks a group against a leaf by the same number", () => {
      const tree = buildMenuTree([
        { item: { id: "leaf", label: "L", order: 5 }, meta: {} },
        { item: { id: "x", label: "X" }, meta: { menuGroup: "Early", menuGroupOrder: 1 } },
      ]);
      expect(tree.map(n => n.id)).toEqual(["group:Early", "leaf"]);
    });
  });

  describe("the shape it returns", () => {
    it("drops `children` on a leaf rather than leaving an empty array", () => {
      // `hasChildren` throughout the sidebar reads `children?.length`, and an
      // empty array would still be falsy — but the chevron logic and the flyout
      // both branch on it, so the absent key is the honest shape.
      const tree = buildMenuTree([leaf("dash")]);
      expect(tree[0]).not.toHaveProperty("children", []);
      expect(tree[0].children).toBeUndefined();
    });

    it("also drops it on an item that declared an empty array", () => {
      const tree = buildMenuTree([{ item: { id: "a", label: "A", children: [] }, meta: {} }]);
      expect(tree[0].children).toBeUndefined();
    });

    it("copies each node rather than handing back the input objects", () => {
      // `sortDeep` spreads on the way out, so a consumer mutating the tree does
      // not reach back into the route records it was built from.
      const input = leaf("dash");
      const tree = buildMenuTree([input]);
      expect(tree[0]).not.toBe(input.item);
      expect(tree[0]).toMatchObject({ id: "dash", label: "dash", to: "/dash" });
    });

    it("carries every field of the original item through", () => {
      const tree = buildMenuTree([{
        item: {
          id: "a",
          label: "A",
          icon: "lucide:home",
          to: "/a",
          badge: 3,
          disabled: true,
          meta: { custom: true },
        },
        meta: { menuGroup: "G" },
      }]);
      expect(tree[0].children?.[0]).toMatchObject({
        icon: "lucide:home",
        to: "/a",
        badge: 3,
        disabled: true,
        meta: { custom: true },
      });
    });
  });
});
