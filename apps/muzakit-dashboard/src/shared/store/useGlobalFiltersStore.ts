import { computed, ref } from "vue";

import { useAbortController } from "@ametie/vue-muza-use";
import { DateTime } from "luxon";
import { defineStore } from "pinia";
import { useRouter } from "vue-router";

import { usePermissions } from "@/shared/composables/usePermissions";
import {
  ALL_FILTERS,
  DEFAULT_FILTERS,
  FILTER_PERMISSIONS,
  type FilterKey,
  type GranularityValue,
  parseGranularityOptions,
} from "@/shared/config/global-filter/globalFilters.config";
import { useGlobalFiltersSync } from "@/shared/config/global-filter/useGlobalFiltersSync";

export const useGlobalFiltersStore = defineStore("globalFilters", () => {
  const { resetAllFilters: resetAllFiltersURL } = useGlobalFiltersSync();
  const { abort: abortPendingRequests } = useAbortController();
  const router = useRouter();
  const { hasPermission } = usePermissions();

  // Flag to skip abort when syncing from URL (browser navigation)
  let isSyncingFromUrl = false;

  /**
     * Conditionally abort pending requests.
     * Skips abort when syncing from URL to prevent cancelling new requests.
     */
  const maybeAbort = () => {
    if (!isSyncingFromUrl) {
      abortPendingRequests();
    }
  };

  /**
     * Run a function with abort disabled (for URL sync).
     */
  const withoutAbort = (fn: () => void) => {
    isSyncingFromUrl = true;
    try {
      fn();
    }
    finally {
      isSyncingFromUrl = false;
    }
  };

  // ==================== Filter Visibility ====================

  /**
     * Get visible filters based on route.meta configuration.
     * Normalizes granularity modifiers (e.g., "granularity:withoutDay") to base "granularity" key.
     */
  const visibleFilters = computed<FilterKey[]>(() => {
    const meta = router.currentRoute.value.meta?.filters;

    if (!meta) return DEFAULT_FILTERS;
    if (meta.show) {
      return meta.show.map(f => (f.startsWith("granularity") ? "granularity" : f)) as FilterKey[];
    }
    if (meta.hide) return ALL_FILTERS.filter(f => !meta.hide!.includes(f));

    return DEFAULT_FILTERS;
  });

  /**
     * Get allowed granularity values based on route meta configuration.
     */
  const allowedGranularityValues = computed<GranularityValue[]>(() => {
    const meta = router.currentRoute.value.meta?.filters;
    const result = parseGranularityOptions(meta?.show);
    return result ?? ["MONTH", "WEEK", "DAY"];
  });

  /**
     * Check if a specific filter should be visible.
     * Considers both route meta and user permissions.
     */
  const isFilterVisible = (filter: FilterKey): boolean => {
    if (!visibleFilters.value.includes(filter)) return false;

    const requiredPermission = FILTER_PERMISSIONS[filter];
    if (requiredPermission) {
      type Permission = Parameters<typeof hasPermission>[0];
      return hasPermission(requiredPermission as Permission);
    }

    return true;
  };

  // ==================== Helper Functions ====================

  /**
     * Parse ISO date strings to Date objects.
     */
  function parseDateRange(since: string, until: string): [Date, Date] | null {
    try {
      const sinceDate = DateTime.fromISO(since, { zone: "utc" });
      const untilDate = DateTime.fromISO(until, { zone: "utc" });

      if (sinceDate.isValid && untilDate.isValid) {
        return [sinceDate.toJSDate(), untilDate.toJSDate()];
      }
    }
    catch (error) {
      console.error("Failed to parse date range:", error);
    }
    return null;
  }

  /**
     * Get default date range (Last 3 Months).
     */
  const getDefaultRange = (): [Date, Date] => {
    const today = DateTime.utc().startOf("day");
    return [today.minus({ months: 3 }).toJSDate(), today.toJSDate()];
  };

  /**
     * Format Date to ISO string (YYYY-MM-DD), UTC-safe.
     */
  const formatDateToISO = (date: Date): string => {
    return DateTime.fromJSDate(date, { zone: "utc" }).toISODate() || "";
  };

  // ==================== State ====================

  /**
     * Flag indicating if filters are fully initialized from URL.
     * Other components should wait for this before making API calls.
     */
  const isInitialized = ref(false);

  /**
     * Main date range (Last 3 Months by default).
     */
  const dateRange = ref<[Date, Date]>(getDefaultRange());

  /**
     * Granularity for data aggregation.
     */
  type Granularity = "MONTH" | "WEEK" | "DAY";
  const granularity = ref<Granularity>("MONTH");

  /**
     * Generic search terms (ASINs, SKUs, keywords — depends on project).
     */
  const search = ref<string[]>([]);

  // ==================== Getters ====================

  /**
     * Format date range as object for API calls.
     * Returns: { since: "YYYY-MM-DD", until: "YYYY-MM-DD" }
     */
  const formattedDateRange = computed<{ since: string, until: string }>(() => ({
    since: formatDateToISO(dateRange.value[0]),
    until: formatDateToISO(dateRange.value[1]),
  }));

  /**
     * Current granularity for API calls.
     */
  const currentGranularity = computed(() => granularity.value);

  /**
     * All active filter values — use as watch dependency.
     * @example
     * watch(() => filtersStore.filters, () => { loadData(); });
     */
  const filters = computed(() => [
    formattedDateRange.value,
    currentGranularity.value,
    search.value,
  ]);

  // ==================== Actions ====================

  /**
     * Update date range.
     * Aborts pending API requests.
     */
  const setDateRange = (range: [Date, Date] | Date[]) => {
    maybeAbort();
    if (range.length === 2) {
      dateRange.value = [range[0], range[1]];
    }
  };

  /**
     * Set granularity.
     */
  const setGranularity = (value: Granularity) => {
    maybeAbort();
    granularity.value = value;
  };

  /**
     * Set search terms.
     */
  const setSearch = (values: string[]) => {
    search.value = values;
  };

  /**
     * Clear search terms.
     */
  const clearSearch = () => {
    search.value = [];
  };

  /**
     * Reset all filters to default values.
     */
  const resetAllFilters = async () => {
    dateRange.value = getDefaultRange();
    granularity.value = "MONTH";
    search.value = [];
    await resetAllFiltersURL();
  };

  /**
     * Initialize filters — restore state from URL query params.
     * Call this once in DefaultLayout before rendering page content.
     */
  const initFilters = async (query: Record<string, string | undefined>) => {
    if (isInitialized.value) return;

    // Restore date range from URL
    if (query.since && query.until) {
      const range = parseDateRange(query.since, query.until);
      if (range) dateRange.value = range;
    }

    // Restore granularity from URL
    if (query.granularity && (["MONTH", "WEEK", "DAY"] as string[]).includes(query.granularity)) {
      granularity.value = query.granularity as Granularity;
    }

    // Restore search from URL
    if (query.search) {
      search.value = query.search.split(",").filter(Boolean);
    }

    isInitialized.value = true;
  };

  // ==================== Store API ====================

  return {
    // State
    dateRange,
    granularity,
    search,
    isInitialized,

    // Getters
    formattedDateRange,
    currentGranularity,
    filters,

    // Filter Visibility
    isFilterVisible,
    allowedGranularityValues,

    // Actions
    setDateRange,
    setGranularity,
    setSearch,
    clearSearch,
    resetAllFilters,
    initFilters,
    withoutAbort,
  };
});
