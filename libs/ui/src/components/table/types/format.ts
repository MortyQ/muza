export type CurrencyFormatter = "USD" | "EUR" | "GBP" | "UAH" | string;
export type DateFormatter = "short" | "long" | "time" | "datetime" | string;
export type NumberFormatter = "default" | "compact" | "chart" | "percent" | "decimal";

export interface ColumnFormatOptions {
  /** `true` defaults to USD; `"EUR"` picks a code; the object form sets decimals too */
  currency?: boolean | CurrencyFormatter | { code?: CurrencyFormatter, decimals?: number }
  percentage?: boolean | { decimals?: number, multiplier?: boolean }
  number?: NumberFormatter | { type?: NumberFormatter, decimals?: number }
  date?: DateFormatter | { format?: DateFormatter, locale?: string }
  boolean?: { trueText?: string, falseText?: string, colored?: boolean }
  fileSize?: boolean | { decimals?: number }
  /** Takes precedence over every option above */
  formatter?: (value: unknown, row?: Record<string, unknown>) => string | number
}
