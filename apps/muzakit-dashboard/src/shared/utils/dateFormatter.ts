import { DateTime } from "luxon";

export const formatDate = (
  value: unknown,
  options?: string | { format?: string, locale?: string },
): string => {
  if (!value) return "";

  let dateTime: DateTime;

  if (value instanceof Date) {
    dateTime = DateTime.fromJSDate(value).toUTC();
  }
  else if (typeof value === "string") {
    // Try parsing as ISO first (most common for API)
    const isoDate = DateTime.fromISO(value, { zone: "utc" });
    if (isoDate.isValid) {
      dateTime = isoDate;
    }
    else {
      // Fallback for other string formats using JS Date
      const appDate = new Date(value);
      if (isNaN(appDate.getTime())) return String(value);
      dateTime = DateTime.fromJSDate(appDate).toUTC();
    }
  }
  else if (typeof value === "number") {
    dateTime = DateTime.fromMillis(value).toUTC();
  }
  else {
    return String(value);
  }

  const format = typeof options === "string" ? options : options?.format ?? "short";

  switch (format) {
    case "short":
      return dateTime.toFormat("MM/dd/yyyy");

    case "long":
      return dateTime.toFormat("MMMM dd, yyyy");

    case "time":
      return dateTime.toFormat("h:mm:ss a");

    case "datetime":
      return dateTime.toFormat("MM/dd/yyyy h:mm:ss a");

    default:
      return dateTime.toFormat(format);
  }
};
