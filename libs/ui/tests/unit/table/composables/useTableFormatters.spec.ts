import { describe, expect, it, vi } from "vitest";

import {
  formatCellValue,
  useTableFormatters,
} from "../../../../src/components/table/composables/useTableFormatters";
import type { Column, ColumnFormatOptions } from "../../../../src/components/table/types";

/**
 * `formatCellValue` is a dispatcher, not a formatter: the arithmetic lives in
 * `@muzakit/utils`. What is tested here is which branch a given `column.format`
 * lands in and in what order the branches are tried — a column carrying two
 * options must resolve deterministically, and the guards distinguishing
 * "absent" from "false" from "0" are where that determinism is easy to lose.
 *
 * A handful of end-to-end values are asserted alongside, so a dispatch that
 * reaches the wrong formatter cannot pass by claiming the right branch.
 */

const col = (format?: ColumnFormatOptions): Column =>
  ({ key: "value", label: "Value", format });

describe("formatCellValue", () => {
  describe("no formatting configured", () => {
    it("returns the value untouched when the column has no format", () => {
      expect(formatCellValue(42, col())).toBe(42);
      expect(formatCellValue("raw", col())).toBe("raw");
    });

    it("returns the value untouched when format is an empty object", () => {
      expect(formatCellValue(42, col({}))).toBe(42);
    });

    it("passes null and undefined straight through when unformatted", () => {
      expect(formatCellValue(null, col())).toBeNull();
      expect(formatCellValue(undefined, col())).toBeUndefined();
    });
  });

  describe("custom formatter", () => {
    it("is used when present", () => {
      const format = { formatter: (v: unknown) => `<${v}>` };
      expect(formatCellValue("x", col(format))).toBe("<x>");
    });

    it("receives the value and the whole row", () => {
      const formatter = vi.fn(() => "out");
      const row = { id: 1, value: 7 };

      formatCellValue(7, col({ formatter }), row);
      expect(formatter).toHaveBeenCalledWith(7, row);
    });

    it("receives undefined for the row when none is passed", () => {
      const formatter = vi.fn(() => "out");
      formatCellValue(7, col({ formatter }));
      expect(formatter).toHaveBeenCalledWith(7, undefined);
    });

    it("wins over every other option on the same column", () => {
      const format = {
        formatter: () => "custom",
        currency: true,
        percentage: true,
        number: "compact",
        date: "short",
        fileSize: true,
      } as ColumnFormatOptions;

      expect(formatCellValue(1000, col(format))).toBe("custom");
    });

    it("may return a number", () => {
      expect(formatCellValue("12", col({ formatter: v => Number(v) }))).toBe(12);
    });
  });

  describe("currency", () => {
    it("defaults to USD for `true`", () => {
      expect(formatCellValue(1250, col({ currency: true }))).toBe("$1,250");
    });

    it("takes a currency code", () => {
      expect(formatCellValue(1250, col({ currency: "EUR" }))).toBe("€1,250");
    });

    it("takes an object with decimals", () => {
      expect(formatCellValue(1250.5, col({ currency: { code: "USD", decimals: 2 } })))
        .toBe("$1,250.50");
    });

    it("puts the sign before the symbol for negatives", () => {
      expect(formatCellValue(-42, col({ currency: true }))).toBe("-$42");
    });

    it("formats zero rather than treating it as absent", () => {
      expect(formatCellValue(0, col({ currency: true }))).toBe("$0");
    });

    it("is skipped when explicitly false", () => {
      // `currency: false` must fall through to the next branch, not format as
      // USD — the guard checks `!== false` as well as `!== undefined`.
      expect(formatCellValue(0.5, col({ currency: false, percentage: true }))).toBe("0.50%");
    });

    it("falls through to the raw value when it is the only option and false", () => {
      expect(formatCellValue(7, col({ currency: false }))).toBe(7);
    });
  });

  describe("percentage", () => {
    it("treats the value as already-percent by default", () => {
      expect(formatCellValue(15, col({ percentage: true }))).toBe("15.00%");
    });

    it("multiplies a ratio when asked", () => {
      expect(formatCellValue(0.15, col({ percentage: { multiplier: true } }))).toBe("15.00%");
    });

    it("honours a decimals override", () => {
      expect(formatCellValue(15.456, col({ percentage: { decimals: 1 } }))).toBe("15.5%");
    });

    it("runs even when set to false, because the guard only checks for undefined", () => {
      // Documented as-is rather than asserted as intent: `percentage` is tested
      // with `!== undefined` alone, unlike `currency`. A future fix that makes
      // the two guards agree will land here first.
      expect(formatCellValue(15, col({ percentage: false }))).toBe("15.00%");
    });

    it("is reached only when there is no currency", () => {
      expect(formatCellValue(15, col({ currency: true, percentage: true }))).toBe("$15");
    });
  });

  describe("number", () => {
    it("formats with a bare type keyword", () => {
      expect(formatCellValue(1500, col({ number: "compact" }))).toBe("1.5K");
    });

    it("formats with an object", () => {
      expect(formatCellValue(1500.456, col({ number: { type: "decimal", decimals: 2 } })))
        .toBe("1,500.46");
    });

    it("is reached only when currency and percentage are absent", () => {
      expect(formatCellValue(1500, col({ percentage: true, number: "compact" })))
        .toBe("1,500.00%");
    });
  });

  describe("date", () => {
    it("formats with a bare format keyword", () => {
      expect(formatCellValue("2024-03-01T00:00:00.000Z", col({ date: "short" })))
        .toMatch(/2024/);
    });

    it("formats with an object", () => {
      const out = formatCellValue("2024-03-01T00:00:00.000Z", col({ date: { format: "short" } }));
      expect(out).toMatch(/2024/);
    });
  });

  describe("boolean", () => {
    it("returns text plus a tone class", () => {
      expect(formatCellValue(true, col({ boolean: {} })))
        .toEqual({ text: "Yes", class: "text-success" });
      expect(formatCellValue(false, col({ boolean: {} })))
        .toEqual({ text: "No", class: "text-danger" });
    });

    it("takes custom labels", () => {
      expect(formatCellValue(true, col({ boolean: { trueText: "On", falseText: "Off" } })))
        .toMatchObject({ text: "On" });
    });

    it("omits the class when colouring is off", () => {
      expect(formatCellValue(true, col({ boolean: { colored: false } })))
        .toEqual({ text: "Yes" });
    });
  });

  describe("file size", () => {
    it("formats bytes", () => {
      expect(formatCellValue(2048, col({ fileSize: true }))).toBe("2 KB");
    });

    it("honours decimals", () => {
      expect(formatCellValue(1536, col({ fileSize: { decimals: 2 } }))).toBe("1.5 KB");
    });

    it("is last in the chain", () => {
      expect(formatCellValue(2048, col({ number: "default", fileSize: true }))).toBe("2,048");
    });
  });

  describe("priority order end to end", () => {
    const value = 1000;
    const cases: [string, ColumnFormatOptions, unknown][] = [
      ["formatter over currency", { formatter: () => "F", currency: true }, "F"],
      ["currency over percentage", { currency: true, percentage: true }, "$1,000"],
      ["percentage over number", { percentage: true, number: "compact" }, "1,000.00%"],
      ["number over date", { number: "compact", date: "short" }, "1K"],
      ["date over boolean", { date: "short", boolean: {} }, expect.any(String)],
      ["boolean over fileSize", { boolean: {}, fileSize: true }, { text: "Yes", class: "text-success" }],
    ];

    it.each(cases)("%s", (_name, format, expected) => {
      expect(formatCellValue(value, col(format))).toEqual(expected);
    });
  });
});

describe("useTableFormatters", () => {
  it("exposes the dispatcher plus every individual formatter", () => {
    const api = useTableFormatters();

    expect(api.formatCellValue).toBe(formatCellValue);
    for (const key of [
      "formatCurrency",
      "formatPercentage",
      "formatNumber",
      "formatDate",
      "formatBoolean",
      "formatFileSize",
    ] as const) {
      expect(typeof api[key], key).toBe("function");
    }
  });

  it("is stateless — two calls hand back the same functions", () => {
    expect(useTableFormatters().formatCurrency).toBe(useTableFormatters().formatCurrency);
  });
});
