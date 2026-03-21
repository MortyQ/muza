import { DateTime } from "luxon";
import type { LocationQuery, LocationQueryValue } from "vue-router";

import { formatDate } from "@/shared/utils/dateFormatter";

// ==================== Granularity ====================

/** Granularity values for data aggregation */
export type GranularityValue = "MONTH" | "WEEK" | "DAY";
export const ALL_GRANULARITY_VALUES: GranularityValue[] = ["MONTH", "WEEK", "DAY"];

// ==================== Granularity Modifiers ====================

/**
 * Granularity modifier keys for route configuration.
 * Explicit union — mirrors the keys of FILTERS.granularity.routeModifiers.
 * Update both when adding a new modifier.
 */
export type GranularityModifier
  = | "granularity"
    | "granularity:withoutDay"
    | "granularity:withoutWeek"
    | "granularity:withoutMonth"
    | "granularity:onlyMonth"
    | "granularity:onlyWeek"
    | "granularity:onlyDay";

// ==================== Types ====================

/**
 * Describes how a single filter maps between store state and URL query params.
 *
 * Add a new filter in one block — state, URL sync, reset and visibility
 * are all derived automatically.
 */
export interface FilterDefinition<T> {
  /** Property key in store state */
  key: string
  /** Factory — MUST return a new value on each call (used for reset). */
  defaultValue: () => T
  /** State → URL. Return undefined for a key to remove it from the URL. */
  toQuery: (value: T) => Record<string, string | undefined>
  /** URL → State. Return undefined to leave the current state unchanged. */
  fromQuery: (query: LocationQuery) => T | undefined
  /** Permission key required to show this filter. null = always visible. */
  permission?: string | null
  /**
     * If true, changing this filter cancels pending API requests via maybeAbort().
     * Set true for filters that invalidate in-flight data (dateRange, granularity).
     * Set false/omit for additive filters (search).
     */
  abortsRequests?: boolean
  /**
     * Whether this filter is shown when route.meta.filters is not specified.
     * Filters with showByDefault: false must be explicitly enabled per route.
     */
  showByDefault?: boolean
  /**
     * Route modifier map for filters that support per-route value restrictions.
     * Key = modifier suffix (e.g. "withoutDay"), Value = allowed values.
     * Used with route.meta.filters.show (e.g. "granularity:withoutDay").
     */
  routeModifiers?: Record<string, unknown[]>
}

export function defineFilter<T>(def: FilterDefinition<T>): FilterDefinition<T> {
  return def;
}

// ==================== Private utilities ====================

const DEFAULT_GRANULARITY: GranularityValue = "MONTH";
const VALID_GRANULARITY: GranularityValue[] = ["MONTH", "WEEK", "DAY"];

function parseDateRangeISO(since: string, until: string): [Date, Date] | null {
  try {
    const s = DateTime.fromISO(since, { zone: "utc" });
    const u = DateTime.fromISO(until, { zone: "utc" });
    if (s.isValid && u.isValid) {
      return [s.toJSDate(), u.toJSDate()];
    }
  }
  catch (e) {
    console.error("Failed to parse date range:", e);
  }
  return null;
}

export function getDefaultDateRange(): [Date, Date] {
  const today = DateTime.utc().startOf("day");
  return [today.minus({ months: 3 }).toJSDate(), today.toJSDate()];
}

function isValidGranularity(val: string): val is GranularityValue {
  return (VALID_GRANULARITY as string[]).includes(val);
}

function coerceString(v: LocationQueryValue | LocationQueryValue[]): string | undefined {
  const raw = Array.isArray(v) ? v[0] : v;
  return raw ?? undefined;
}

// ==================== Filter Registry ====================

export const FILTERS = {

  dateRange: defineFilter<[Date, Date]>({
    key: "dateRange",
    showByDefault: true,
    permission: null,
    abortsRequests: true,
    defaultValue: getDefaultDateRange,
    toQuery: (v) => {
      const defaultRange = getDefaultDateRange();
      const isDefault
        = formatDate(v[0]) === formatDate(defaultRange[0])
          && formatDate(v[1]) === formatDate(defaultRange[1]);

      if (isDefault) return { since: undefined, until: undefined };

      return {
        since: formatDate(v[0]),
        until: formatDate(v[1]),
      };
    },
    fromQuery: (q) => {
      const since = coerceString(q.since);
      const until = coerceString(q.until);
      if (!since || !until) return undefined;
      return parseDateRangeISO(since, until) ?? undefined;
    },
  }),

  granularity: defineFilter<GranularityValue>({
    key: "granularity",
    showByDefault: false,
    permission: null,
    abortsRequests: true,
    routeModifiers: {
      withoutDay: ["MONTH", "WEEK"],
      withoutWeek: ["MONTH", "DAY"],
      withoutMonth: ["WEEK", "DAY"],
      onlyMonth: ["MONTH"],
      onlyWeek: ["WEEK"],
      onlyDay: ["DAY"],
    } satisfies Record<string, GranularityValue[]>,
    defaultValue: () => DEFAULT_GRANULARITY,
    toQuery: v => ({
      granularity: v === DEFAULT_GRANULARITY ? undefined : v,
    }),
    fromQuery: (q) => {
      const val = coerceString(q.granularity);
      return val && isValidGranularity(val) ? val : undefined;
    },
  }),

  search: defineFilter<string[]>({
    key: "search",
    showByDefault: false,
    permission: null,
    abortsRequests: false,
    defaultValue: () => [],
    toQuery: v => ({
      search: v.length > 0 ? v.join(",") : undefined,
    }),
    fromQuery: (q) => {
      const val = coerceString(q.search);
      return val ? val.split(",").filter(Boolean) : undefined;
    },
  }),

} as const;

// ==================== Derived Types & Constants ====================

export type FilterRegistry = typeof FILTERS;

/**
 * Auto-derived filter keys — never write manually.
 * Automatically includes any new filter added to FILTERS.
 */
export type FilterKey = keyof FilterRegistry;

/**
 * Extended filter key that includes granularity modifiers.
 * Used in route.meta.filters.show configuration.
 */
export type ExtendedFilterKey = Exclude<FilterKey, "granularity"> | GranularityModifier;

/** All filter keys as an array — derived from registry. */
export const ALL_FILTERS = Object.keys(FILTERS) as FilterKey[];

/**
 * Filters shown when route.meta.filters is not specified.
 * Derived from showByDefault — do not edit manually.
 */
export const DEFAULT_FILTERS = (Object.entries(FILTERS) as [FilterKey, FilterDefinition<unknown>][])
  .filter(([, def]) => def.showByDefault)
  .map(([key]) => key);

/**
 * Auto-derived state shape — never write manually.
 * { dateRange: [Date, Date]; granularity: GranularityValue; search: string[] }
 *
 * -readonly strips the modifier inherited from `as const` FILTERS,
 * allowing state mutations inside the store.
 */
export type FilterState = {
  -readonly [K in keyof FilterRegistry]: FilterRegistry[K] extends FilterDefinition<infer V>
    ? V : never;
};

// ==================== Route Utils ====================

/**
 * Parse granularity modifier from route config and return allowed values.
 * Reads allowed values from FILTERS.granularity.routeModifiers — no hardcoded switch.
 *
 * @param filterKeys - Array of filter keys from route.meta.filters.show
 * @returns Array of allowed GranularityValue, or null if granularity not in config
 */
export function parseGranularityOptions(
  filterKeys: ExtendedFilterKey[] | undefined,
): GranularityValue[] | null {
  if (!filterKeys) return ALL_GRANULARITY_VALUES;

  const granularityKey = filterKeys.find(key => key.startsWith("granularity"));
  if (!granularityKey) return null;
  if (granularityKey === "granularity") return ALL_GRANULARITY_VALUES;

  const modifier = granularityKey.split(":")[1];
  const modifiers = FILTERS.granularity.routeModifiers as Record<string, GranularityValue[]>;

  return modifiers[modifier] ?? ALL_GRANULARITY_VALUES;
}
