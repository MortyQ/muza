import { DateTime } from "luxon";

export type CurrencyCode = "USD" | "EUR" | "GBP" | "UAH" | "JPY" | "CNY" | (string & {});
export type NumberFormatterType = "default" | "compact" | "chart" | "percent" | "decimal";
export type DateFormatterType = "short" | "long" | "time" | "datetime" | (string & {});

export interface BooleanFormatResult {
  text: string
  class?: string
}

export const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  UAH: "₴",
  JPY: "¥",
  CNY: "¥",
};

export const isNil = (value: unknown): value is null | undefined => {
  return value === null || value === undefined;
};

export const truncateString = (str: string, maxLength: number): string => {
  if (str.length <= maxLength) return str;
  return `${str.slice(0, maxLength)}...`;
};

const BYTE_UNITS = [
  "Bytes",
  "KB",
  "MB",
  "GB",
  "TB",
];

const toByteString = (bytes: number, decimals: number): string => {
  if (bytes === 0) return "0 Bytes";

  const dm = decimals < 0 ? 0 : decimals;
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const unit = BYTE_UNITS[Math.min(i, BYTE_UNITS.length - 1)];

  return `${parseFloat((bytes / Math.pow(1024, i)).toFixed(dm))} ${unit}`;
};

export const formatBytes = (bytes: number, decimals = 2): string => {
  return toByteString(bytes, decimals);
};

export const getFileExtension = (filename: string): string => {
  return filename.slice((filename.lastIndexOf(".") - 1 >>> 0) + 2);
};

export const isImageFile = (filename: string): boolean => {
  const ext = getFileExtension(filename).toLowerCase();
  return [
    "jpg",
    "jpeg",
    "png",
    "gif",
    "webp",
    "svg",
    "bmp",
  ].includes(ext);
};

export const formatCurrency = (
  value: unknown,
  options: string | { code?: CurrencyCode, decimals?: number, format?: "default" | "compact" | "chart" } = "USD",
): string => {
  if (isNil(value)) return "";

  const numValue = Number(value);
  if (isNaN(numValue)) return String(value);

  let code = "USD";
  let decimals: number | undefined;
  let format: "default" | "compact" | "chart" | undefined;

  if (typeof options === "string") {
    // A bare string is either a format keyword or a currency code
    if (options === "compact" || options === "chart" || options === "default") {
      format = options;
    }
    else {
      code = options;
    }
  }
  else {
    code = options.code ?? "USD";
    decimals = options.decimals;
    format = options.format;
  }

  const symbol = CURRENCY_SYMBOLS[code] ?? code;
  const isNegative = numValue < 0;
  const absValue = Math.abs(numValue);

  let formatted: string;

  if (format === "compact" || format === "chart") {
    formatted = new Intl.NumberFormat("en-US", {
      notation: "compact",
      compactDisplay: "short",
      minimumFractionDigits: decimals ?? (format === "chart" ? 1 : 0),
      maximumFractionDigits: decimals ?? 1,
    }).format(absValue);
  }
  else {
    formatted = absValue.toLocaleString("en-US", {
      minimumFractionDigits: decimals ?? 0,
      maximumFractionDigits: decimals ?? 0,
    });
  }

  return isNegative ? `-${symbol}${formatted}` : `${symbol}${formatted}`;
};

/**
 * Returns text plus an optional colour class so callers can render a tone
 * without re-deriving the boolean. Classes are design-system utilities
 * (`text-success` / `text-danger`), not raw colours.
 */
export const formatBoolean = (
  value: unknown,
  options?: { trueText?: string, falseText?: string, colored?: boolean },
): BooleanFormatResult => {
  if (isNil(value)) return { text: "" };

  const boolValue = Boolean(value);
  const text = boolValue ? options?.trueText ?? "Yes" : options?.falseText ?? "No";

  if (options?.colored ?? true) {
    return { text, class: boolValue ? "text-success" : "text-danger" };
  }

  return { text };
};

export const formatPercentage = (
  value: unknown,
  options?: boolean | { decimals?: number, multiplier?: boolean },
): string => {
  if (isNil(value)) return "";

  const numValue = Number(value);
  if (isNaN(numValue)) return String(value);

  const decimals = typeof options === "object" ? options.decimals ?? 2 : 2;
  const multiplier = typeof options === "object" ? options.multiplier ?? false : false;

  // multiplier: true treats the value as a ratio (0.15 → 15%), false as already-percent (15 → 15%)
  const percentValue = multiplier ? numValue * 100 : numValue;

  const formatted = percentValue.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return `${formatted}%`;
};

export interface NumberFormatOptions {
  type?: NumberFormatterType
  decimals?: number
  multiply?: number
}

export const formatNumber = (
  value: unknown,
  options?: NumberFormatterType | NumberFormatOptions,
): string => {
  if (isNil(value)) return "";

  const numValue = Number(value);
  if (isNaN(numValue)) return String(value);

  const type = typeof options === "string" ? options : options?.type ?? "default";
  const decimals = typeof options === "object" ? options.decimals : undefined;
  const multiply = typeof options === "object" ? options.multiply : undefined;

  const finalValue = multiply !== undefined ? numValue * multiply : numValue;

  switch (type) {
    case "compact":
      return new Intl.NumberFormat("en-US", {
        notation: "compact",
        compactDisplay: "short",
        minimumFractionDigits: decimals ?? 0,
        maximumFractionDigits: decimals ?? 1,
      }).format(finalValue);

    case "chart":
      return new Intl.NumberFormat("en-US", {
        notation: "compact",
        compactDisplay: "short",
        minimumFractionDigits: decimals ?? 1,
        maximumFractionDigits: decimals ?? 1,
      }).format(finalValue);

    case "percent":
      return `${finalValue.toLocaleString("en-US", {
        minimumFractionDigits: decimals ?? 2,
        maximumFractionDigits: decimals ?? 2,
      })}%`;

    case "decimal":
      return finalValue.toLocaleString("en-US", {
        minimumFractionDigits: decimals ?? 2,
        maximumFractionDigits: decimals ?? 2,
      });

    default:
      return finalValue.toLocaleString("en-US", {
        minimumFractionDigits: decimals ?? 0,
        maximumFractionDigits: decimals ?? 0,
      });
  }
};

export const formatDate = (
  value: unknown,
  options?: DateFormatterType | { format?: DateFormatterType, locale?: string },
): string => {
  if (!value) return "";

  let dateTime: DateTime;

  if (value instanceof Date) {
    dateTime = DateTime.fromJSDate(value).toUTC();
  }
  else if (typeof value === "string") {
    const isoDate = DateTime.fromISO(value, { zone: "utc" });
    if (isoDate.isValid) {
      dateTime = isoDate;
    }
    else {
      const parsed = new Date(value);
      if (isNaN(parsed.getTime())) return String(value);
      dateTime = DateTime.fromJSDate(parsed).toUTC();
    }
  }
  else if (typeof value === "number") {
    dateTime = DateTime.fromMillis(value).toUTC();
  }
  else {
    return String(value);
  }

  const format = typeof options === "string" ? options : options?.format ?? "short";
  const locale = typeof options === "object" ? options?.locale : undefined;
  const localized = locale ? dateTime.setLocale(locale) : dateTime;

  switch (format) {
    case "short":
      return localized.toFormat("MM/dd/yyyy");

    case "long":
      return localized.toFormat("MMMM dd, yyyy");

    case "time":
      return localized.toFormat("h:mm:ss a");

    case "datetime":
      return localized.toFormat("MM/dd/yyyy h:mm:ss a");

    default:
      return localized.toFormat(format);
  }
};

export const formatFileSize = (
  value: unknown,
  options?: boolean | { decimals?: number },
): string => {
  if (isNil(value)) return "";

  const numValue = Number(value);
  if (isNaN(numValue)) return String(value);

  const decimals = typeof options === "object" ? options.decimals ?? 2 : 2;

  return toByteString(numValue, decimals);
};

/**
 * "TEXT_TEXT" → "Text Text", "some-value" → "Some Value"
 */
export const formatLabel = (value: unknown): string => {
  if (typeof value !== "string") return String(value || "");

  return value
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .split(" ")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};
