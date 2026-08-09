import { describe, expect, it } from "vitest";

import {
  type ListEditorItem,
  listEditorToTextList,
  textListToListEditorItems,
} from "../../../src/components/inputs/VListEditor.utils";

describe("listEditorToTextList", () => {
  it("pulls the text out of each item", () => {
    expect(listEditorToTextList([{ text: "one" }, { text: "two" }])).toEqual(["one", "two"]);
  });

  it("trims surrounding whitespace", () => {
    expect(listEditorToTextList([{ text: "  padded  " }])).toEqual(["padded"]);
  });

  it("drops entries that are empty or whitespace only", () => {
    const items: ListEditorItem[] = [
      { text: "keep" },
      { text: "" },
      { text: "   " },
      { text: "\t\n" },
      { text: "also keep" },
    ];
    expect(listEditorToTextList(items)).toEqual(["keep", "also keep"]);
  });

  it("keeps duplicates — de-duplication is the caller's decision", () => {
    expect(listEditorToTextList([{ text: "same" }, { text: "same" }]))
      .toEqual(["same", "same"]);
  });

  it("preserves inner whitespace", () => {
    expect(listEditorToTextList([{ text: "  two  words  " }])).toEqual(["two  words"]);
  });

  it("ignores extra fields", () => {
    expect(listEditorToTextList([{ text: "one", id: 7, dirty: true }])).toEqual(["one"]);
  });

  it("returns an empty list for an empty input", () => {
    expect(listEditorToTextList([])).toEqual([]);
  });

  it("does not mutate its input", () => {
    const items: ListEditorItem[] = [{ text: "  padded  " }];
    listEditorToTextList(items);
    expect(items[0].text).toBe("  padded  ");
  });
});

describe("textListToListEditorItems", () => {
  it("wraps each string in an item", () => {
    expect(textListToListEditorItems(["one", "two"]))
      .toEqual([{ text: "one" }, { text: "two" }]);
  });

  it("adds no extra fields, which is what an unsaved item looks like", () => {
    const [item] = textListToListEditorItems(["one"]);
    expect(Object.keys(item)).toEqual(["text"]);
  });

  it("passes strings through verbatim, without trimming", () => {
    // The inverse trims; this direction must not, or a round trip would be
    // lossy in a way the caller never asked for.
    expect(textListToListEditorItems(["  padded  "])).toEqual([{ text: "  padded  " }]);
  });

  it("returns an empty list for an empty input", () => {
    expect(textListToListEditorItems([])).toEqual([]);
  });

  it("creates independent objects", () => {
    const [first, second] = textListToListEditorItems(["a", "a"]);
    expect(first).not.toBe(second);
  });
});

describe("round trip", () => {
  it("is stable for already-clean text", () => {
    const texts = ["alpha", "beta", "gamma"];
    expect(listEditorToTextList(textListToListEditorItems(texts))).toEqual(texts);
  });

  it("normalises on the way back out", () => {
    const texts = ["  alpha  ", "", "beta"];
    expect(listEditorToTextList(textListToListEditorItems(texts))).toEqual(["alpha", "beta"]);
  });
});
