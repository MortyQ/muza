import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  readColumnState,
  writeColumnState,
  type SavedColumnState,
} from "../../../../src/components/table/utils/columnState";
import tableStorage from "../../../../src/components/table/utils/storage";

/**
 * Three call sites write this shape and three read it. The pair exists so they
 * cannot drift apart again — and so the set-type-then-read ordering, which is
 * load-bearing because the storage singleton is module-global, lives in one
 * place instead of being re-derived correctly two times out of three.
 */

const STATE: SavedColumnState = {
  visible: ["id", "name"],
  order: ["name", "id", "revenue"],
  fixed: { id: "left" },
  labels: { name: "Product" },
};

describe("readColumnState / writeColumnState", () => {
  beforeEach(() => {
    tableStorage.setStorageType("localStorage");
    localStorage.clear();
    sessionStorage.clear();
  });

  it("round-trips the full shape", async () => {
    await writeColumnState("orders", STATE);
    expect(await readColumnState("orders")).toEqual(STATE);
  });

  it("returns null when nothing was ever written", async () => {
    expect(await readColumnState("orders")).toBeNull();
  });

  it("persists a state with no optional fields", async () => {
    const minimal: SavedColumnState = { visible: ["id"], order: ["id"] };
    await writeColumnState("orders", minimal);

    const read = await readColumnState("orders");
    expect(read).toEqual(minimal);
    expect(read).not.toHaveProperty("labels");
  });

  it("persists exactly what it is handed, adding no defaults", async () => {
    // TableColumnSetup writes without `labels`, TableColumnPicker writes with —
    // neither shape may be normalized into the other on the way through.
    await writeColumnState("setup", { visible: ["id"], order: ["id"] });
    await writeColumnState("picker", { visible: ["id"], order: ["id"], labels: { id: "ID" } });

    expect(Object.keys((await readColumnState("setup"))!)).toEqual(["visible", "order"]);
    expect(Object.keys((await readColumnState("picker"))!)).toEqual(["visible", "order", "labels"]);
  });

  it("keeps separate keys separate", async () => {
    await writeColumnState("orders", STATE);
    await writeColumnState("invoices", { visible: ["total"], order: ["total"] });

    expect((await readColumnState("orders"))?.visible).toEqual(["id", "name"]);
    expect((await readColumnState("invoices"))?.visible).toEqual(["total"]);
  });

  describe("storage type argument", () => {
    it("switches the singleton before writing", async () => {
      await writeColumnState("orders", STATE, "sessionStorage");

      expect(tableStorage.getStorageType()).toBe("sessionStorage");
      expect(sessionStorage.getItem("orders")).not.toBeNull();
      expect(localStorage.getItem("orders")).toBeNull();
    });

    it("switches the singleton before reading", async () => {
      sessionStorage.setItem("orders", JSON.stringify(STATE));

      expect(await readColumnState("orders", "sessionStorage")).toEqual(STATE);
      expect(tableStorage.getStorageType()).toBe("sessionStorage");
    });

    it("leaves the current type alone when omitted", async () => {
      tableStorage.setStorageType("sessionStorage");
      await writeColumnState("orders", STATE);

      expect(tableStorage.getStorageType()).toBe("sessionStorage");
      expect(sessionStorage.getItem("orders")).not.toBeNull();
    });

    it("reads back what a differently-typed write put somewhere else as null", async () => {
      // Two tables on one page may legitimately use different backends; the
      // singleton means the last switch wins, and this is the trap that causes.
      await writeColumnState("orders", STATE, "sessionStorage");
      expect(await readColumnState("orders", "localStorage")).toBeNull();
    });
  });

  it("lets a read failure propagate instead of swallowing it", async () => {
    // Deliberate: the three call sites log differently and one falls through to
    // a default. Centralizing the try/catch here would erase that difference.
    const boom = new Error("backend down");
    vi.spyOn(tableStorage, "getTableConfig").mockRejectedValueOnce(boom);

    await expect(readColumnState("orders")).rejects.toBe(boom);
    vi.restoreAllMocks();
  });

  it("lets a write failure propagate", async () => {
    const boom = new Error("backend down");
    vi.spyOn(tableStorage, "setTableConfig").mockRejectedValueOnce(boom);

    await expect(writeColumnState("orders", STATE)).rejects.toBe(boom);
    vi.restoreAllMocks();
  });
});
