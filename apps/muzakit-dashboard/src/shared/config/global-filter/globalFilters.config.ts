/**
 * Global Filters Configuration
 *
 * Central configuration for all global filter settings.
 * When adding a new filter, update this file and it will work everywhere.
 */

// ==================== Filter Keys ====================

/**
 * Available filter keys for global filters visibility
 */
export type FilterKey
  = | "brands"
    | "channels"
    | "products"
    | "dateRange"
    | "comparison"
    | "granularity";

/**
 * Granularity values that can be excluded via route config
 * Use in route.meta.filters.show as "granularity:withoutDay" etc.
 */
export type GranularityValue = "MONTH" | "WEEK" | "DAY";

/**
 * Granularity modifier keys for route configuration
 * Example: "granularity:withoutDay" will hide the Day option
 */
export type GranularityModifier
  = | "granularity"
    | "granularity:withoutDay"
    | "granularity:withoutWeek"
    | "granularity:withoutMonth"
    | "granularity:onlyMonth"
    | "granularity:onlyWeek"
    | "granularity:onlyDay";

/**
 * Extended filter key that includes granularity modifiers
 */
export type ExtendedFilterKey = Exclude<FilterKey, "granularity"> | GranularityModifier;

// ==================== Filter Configuration ====================

/**
 * All available filters in the system
 */
export const ALL_FILTERS: FilterKey[] = [
  "brands",
  "channels",
  "products",
  "dateRange",
  "comparison",
  "granularity",
];

/**
 * Default filters shown when no route.meta.filters specified
 */
export const DEFAULT_FILTERS: FilterKey[] = [
  "brands",
  "channels",
  "products",
  "dateRange",
  "comparison",
  "granularity",
];

/**
 * URL query parameter names for each filter
 * Used for URL sync and persistence
 */
export const FILTER_URL_PARAMS: Record<FilterKey, string[]> = {
  brands: ["brands"],
  channels: ["channels"],
  products: ["products"],
  dateRange: ["primary_since", "primary_until"],
  comparison: ["secondary_since", "secondary_until"],
  granularity: ["granularity"],
};

/**
 * All URL params that should persist across page navigation
 * Auto-generated from FILTER_URL_PARAMS
 */
export const PERSISTENT_FILTER_PARAMS: string[] = Object.values(FILTER_URL_PARAMS).flat();

/**
 * Permission required for each filter (null = no permission required)
 * Add permission string to restrict filter visibility
 */
export const FILTER_PERMISSIONS: Record<FilterKey, string | null> = {
  brands: null,
  channels: null,
  products: null,
  dateRange: null,
  comparison: null,
  granularity: null,
};

// ==================== Granularity Helpers ====================

/**
 * All available granularity values
 */
export const ALL_GRANULARITY_VALUES: GranularityValue[] = ["MONTH", "WEEK", "DAY"];

/**
 * Parse granularity modifier from route config and return allowed values
 * @param filterKeys - Array of filter keys from route.meta.filters.show
 * @returns Array of allowed granularity values, or null if granularity is not in config
 */
export function parseGranularityOptions(
  filterKeys: ExtendedFilterKey[] | undefined,
): GranularityValue[] | null {
  if (!filterKeys) return ALL_GRANULARITY_VALUES;

  const granularityKey = filterKeys.find(key => key.startsWith("granularity"));
  if (!granularityKey) return null; // granularity not in show list

  if (granularityKey === "granularity") {
    return ALL_GRANULARITY_VALUES;
  }

  const modifier = granularityKey.split(":")[1];

  switch (modifier) {
    case "withoutDay":
      return ["MONTH", "WEEK"];
    case "withoutWeek":
      return ["MONTH", "DAY"];
    case "withoutMonth":
      return ["WEEK", "DAY"];
    case "onlyMonth":
      return ["MONTH"];
    case "onlyWeek":
      return ["WEEK"];
    case "onlyDay":
      return ["DAY"];
    default:
      return ALL_GRANULARITY_VALUES;
  }
}

// ==================== TypeScript Augmentation ====================

/**
 * Filters visibility configuration for route.meta
 */
export interface FiltersVisibilityConfig {
  /** Show only these filters (whitelist) - supports granularity modifiers */
  show?: ExtendedFilterKey[]
  /** Hide these filters (blacklist) */
  hide?: FilterKey[]
}

// Augment vue-router RouteMeta
declare module "vue-router" {
  interface RouteMeta {
    /** Filters visibility configuration */
    filters?: FiltersVisibilityConfig
  }
}
