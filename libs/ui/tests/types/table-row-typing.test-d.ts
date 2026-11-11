import { describe, expectTypeOf, it } from "vitest";

import type {
  CellContext,
  Column,
  ExpandableRow,
  MultiSelectConfig,
} from "../../src/components/table/types";
import type { TableEmits, TableProps } from "../../src/components/table/types/props";

/**
 * The table's row typing contract (openspec: ui-table-row-typing). Every case here is a
 * compile-time property, which is why it lives in the typecheck project and not in a unit spec.
 */

interface Product extends Record<string, unknown> {
  id: number
  name: string
  price: number
}

describe("a declared row type", () => {
  it("reaches column callbacks", () => {
    const column: Column<Product> = {
      key: "price",
      label: "Price",
      sortValue: row => row.price,
      cellClass: ({ row }) => (row.price > 100 ? "expensive" : undefined),
    };
    expectTypeOf(column.sortValue).parameter(0).toEqualTypeOf<Product>();
  });

  it("rejects a field the row does not have", () => {
    const column: Column<Product> = {
      key: "price",
      label: "Price",
      // @ts-expect-error — `missing` is not a field of Product
      sortValue: row => row.missing,
    };
    expectTypeOf(column).not.toBeAny();
  });

  it("reaches the props and events", () => {
    expectTypeOf<TableProps<Product>["data"]>().toEqualTypeOf<Product[]>();
    expectTypeOf<TableProps<Product>["columns"]>().toEqualTypeOf<Column<Product>[]>();
    expectTypeOf<TableEmits<Product>>().toBeCallableWith("row-click", {
      id: 1, name: "Lamp", price: 10,
    });
  });
});

describe("no row type given", () => {
  it("types the row of an untyped column as a record of unknown", () => {
    expectTypeOf<CellContext["row"]>().not.toBeAny();
    expectTypeOf<CellContext["row"]>().toEqualTypeOf<Record<string, unknown>>();
    expectTypeOf<Parameters<NonNullable<Column["sortValue"]>>[0]>().not.toBeAny();
  });

  it("makes an untyped field unknown until it is narrowed", () => {
    const column: Column = {
      key: "status",
      label: "Status",
      // @ts-expect-error — `status` is unknown, so it has no string methods
      cellClass: ({ row }) => row.status.toUpperCase(),
    };
    expectTypeOf(column).not.toBeAny();
  });
});

describe("assignability", () => {
  it("lets a typed column join an untyped list", () => {
    const typed: Column<Product> = { key: "price", label: "Price", sortValue: row => row.price };
    const list: Column[] = [typed];
    expectTypeOf(list).toEqualTypeOf<Column[]>();
  });

  it("lets a typed selectability check sit on the select config", () => {
    const config: MultiSelectConfig = { enabled: true, isRowSelectable: row => row.id !== 0 };
    expectTypeOf(config.isRowSelectable).not.toBeAny();
  });
});

describe("ExpandableRow", () => {
  interface OrderRow extends ExpandableRow {
    total: number
  }

  it("keeps declared fields typed through an extending interface", () => {
    expectTypeOf<OrderRow["total"]>().toEqualTypeOf<number>();
    expectTypeOf<OrderRow["id"]>().toEqualTypeOf<string | number | undefined>();
  });

  it("reads an undeclared field as unknown", () => {
    expectTypeOf<ExpandableRow["total"]>().not.toBeAny();
    expectTypeOf<ExpandableRow["total"]>().toEqualTypeOf<unknown>();
  });
});
