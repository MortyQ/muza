import { beforeEach, describe, expect, it, vi } from "vitest";

import tableStorage, {
  createStorageAdapter,
  TableStorageManager,
  type StorageType,
} from "../../../../src/components/table/utils/storage";

/**
 * The storage layer is the only place in the table that survives a reload, so a
 * silent failure here does not surface until a user reopens a page and finds
 * their column layout gone. Every adapter is exercised through the same
 * round-trip, plus the failure paths each one swallows.
 */

const WEB: StorageType[] = ["localStorage", "sessionStorage"];

describe("createStorageAdapter", () => {
  it.each(["indexedDB", "localStorage", "sessionStorage"] as StorageType[])(
    "builds an adapter for %s",
    (type) => {
      const adapter = createStorageAdapter(type);
      expect(typeof adapter.get).toBe("function");
      expect(typeof adapter.set).toBe("function");
      expect(typeof adapter.delete).toBe("function");
      expect(typeof adapter.clear).toBe("function");
    },
  );

  it("defaults to indexedDB when no type is given", async () => {
    const adapter = createStorageAdapter();
    await adapter.set("default-branch", { ok: true });
    expect(await adapter.get("default-branch")).toEqual({ ok: true });
    // A web-storage adapter would have left a readable JSON string behind.
    expect(localStorage.getItem("default-branch")).toBeNull();
  });

  it("throws on an unknown type", () => {
    expect(() => createStorageAdapter("memory" as StorageType))
      .toThrow("Unknown storage type: memory");
  });
});

describe.each(WEB)("%s adapter", (type) => {
  const store = () => (type === "sessionStorage" ? sessionStorage : localStorage);
  const adapter = () => createStorageAdapter(type);

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it("returns null for a key that was never written", async () => {
    expect(await adapter().get("absent")).toBeNull();
  });

  it("round-trips an object", async () => {
    await adapter().set("cfg", { visible: ["a"], order: ["a", "b"] });
    expect(await adapter().get("cfg")).toEqual({ visible: ["a"], order: ["a", "b"] });
  });

  it("stores JSON, not the object reference", async () => {
    await adapter().set("cfg", { visible: ["a"] });
    expect(store().getItem("cfg")).toBe("{\"visible\":[\"a\"]}");
  });

  it("overwrites an existing key", async () => {
    await adapter().set("cfg", { n: 1 });
    await adapter().set("cfg", { n: 2 });
    expect(await adapter().get("cfg")).toEqual({ n: 2 });
  });

  it("deletes a key", async () => {
    await adapter().set("cfg", { n: 1 });
    await adapter().delete("cfg");
    expect(await adapter().get("cfg")).toBeNull();
  });

  it("clears everything", async () => {
    await adapter().set("a", 1);
    await adapter().set("b", 2);
    await adapter().clear();
    expect(await adapter().get("a")).toBeNull();
    expect(await adapter().get("b")).toBeNull();
  });

  it("writes to its own backend, not the other one", async () => {
    await adapter().set("scoped", { n: 1 });
    const other = type === "sessionStorage" ? localStorage : sessionStorage;
    expect(other.getItem("scoped")).toBeNull();
  });

  it("returns null rather than throwing when the stored value is not JSON", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    store().setItem("broken", "{not json");

    expect(await adapter().get("broken")).toBeNull();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it("rejects and warns when the backend is out of quota", async () => {
    const spyError = vi.spyOn(console, "error").mockImplementation(() => {});
    const spyWarn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("full", "QuotaExceededError");
    });

    await expect(adapter().set("cfg", { n: 1 })).rejects.toBeInstanceOf(DOMException);
    expect(spyWarn).toHaveBeenCalledWith(expect.stringContaining("quota"));

    setItem.mockRestore();
    spyError.mockRestore();
    spyWarn.mockRestore();
  });
});

describe("indexedDB adapter", () => {
  const adapter = () => createStorageAdapter("indexedDB", "spec-namespace");

  it("returns null for a key that was never written", async () => {
    expect(await adapter().get("absent")).toBeNull();
  });

  it("round-trips a structured value", async () => {
    await adapter().set("cfg", { visible: ["a"], fixed: { a: "left" } });
    expect(await adapter().get("cfg")).toEqual({ visible: ["a"], fixed: { a: "left" } });
  });

  it("deletes a key", async () => {
    await adapter().set("gone", 1);
    await adapter().delete("gone");
    expect(await adapter().get("gone")).toBeNull();
  });

  it("keeps namespaces apart", async () => {
    await createStorageAdapter("indexedDB", "ns-a").set("k", "a");
    await createStorageAdapter("indexedDB", "ns-b").set("k", "b");

    expect(await createStorageAdapter("indexedDB", "ns-a").get("k")).toBe("a");
    expect(await createStorageAdapter("indexedDB", "ns-b").get("k")).toBe("b");
  });

  it("returns null instead of throwing when the read fails", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const built = adapter();
    // Reaching past the public surface is the only way to simulate a backend
    // fault: idb-keyval owns the connection and offers no injection point.
    const keyv = (built as unknown as { keyv: { get: () => Promise<unknown> } }).keyv;
    vi.spyOn(keyv, "get").mockRejectedValue(new Error("connection lost"));

    expect(await built.get("k")).toBeNull();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe("TableStorageManager", () => {
  beforeEach(() => {
    tableStorage.setStorageType("localStorage");
    localStorage.clear();
  });

  it("is a singleton", () => {
    expect(TableStorageManager.getInstance()).toBe(tableStorage);
    expect(TableStorageManager.getInstance()).toBe(TableStorageManager.getInstance());
  });

  it("reports the type it was switched to", () => {
    tableStorage.setStorageType("sessionStorage");
    expect(tableStorage.getStorageType()).toBe("sessionStorage");
  });

  it("swaps the adapter when the type changes", () => {
    const before = tableStorage.getAdapter();
    tableStorage.setStorageType("sessionStorage");
    expect(tableStorage.getAdapter()).not.toBe(before);
  });

  it("round-trips a table config", async () => {
    await tableStorage.setTableConfig("orders", { visible: ["id"] });
    expect(await tableStorage.getTableConfig("orders")).toEqual({ visible: ["id"] });
  });

  it("returns null for a table that has no config", async () => {
    expect(await tableStorage.getTableConfig("never-saved")).toBeNull();
  });

  it("deletes a table config", async () => {
    await tableStorage.setTableConfig("orders", { visible: ["id"] });
    await tableStorage.deleteTableConfig("orders");
    expect(await tableStorage.getTableConfig("orders")).toBeNull();
  });

  it("clears every config", async () => {
    await tableStorage.setTableConfig("a", 1);
    await tableStorage.setTableConfig("b", 2);
    await tableStorage.clearAllConfigs();
    expect(await tableStorage.getTableConfig("a")).toBeNull();
    expect(await tableStorage.getTableConfig("b")).toBeNull();
  });

  it("writes through whichever adapter is current at write time", async () => {
    await tableStorage.setTableConfig("split", "from-local");
    tableStorage.setStorageType("sessionStorage");
    await tableStorage.setTableConfig("split", "from-session");

    expect(sessionStorage.getItem("split")).toBe("\"from-session\"");
    expect(localStorage.getItem("split")).toBe("\"from-local\"");
  });
});
