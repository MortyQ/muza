import { computed, reactive, ref, toRefs } from "vue";

import { useAbortController } from "@ametie/vue-muza-use";
import { defineStore } from "pinia";
import { type LocationQuery, useRouter } from "vue-router";

import { usePermissions } from "@/shared/composables/usePermissions";
import {
  ALL_FILTERS,
  DEFAULT_FILTERS,
  FILTERS,
  type FilterKey,
  type FilterState,
  type GranularityValue,
  parseGranularityOptions,
} from "@/shared/config/global-filter/filterRegistry";

export const useGlobalFiltersStore = defineStore("globalFilters", () => {
  const { abort: abortPendingRequests } = useAbortController();
  const router = useRouter();
  const { hasPermission } = usePermissions();

  // ==================== Abort guard ====================

  let isSyncingFromUrl = false;

  const maybeAbort = () => {
    if (!isSyncingFromUrl) abortPendingRequests();
  };

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

  const visibleFilters = computed<FilterKey[]>(() => {
    const meta = router.currentRoute.value.meta?.filters;
    if (!meta) return DEFAULT_FILTERS;
    if (meta.show) {
      return meta.show.map(f => (f.startsWith("granularity") ? "granularity" : f)) as FilterKey[];
    }
    if (meta.hide) return ALL_FILTERS.filter(f => !meta.hide!.includes(f));
    return DEFAULT_FILTERS;
  });

  const allowedGranularityValues = computed<GranularityValue[]>(() => {
    const meta = router.currentRoute.value.meta?.filters;
    return parseGranularityOptions(meta?.show) ?? ["MONTH", "WEEK", "DAY"];
  });

  const isFilterVisible = (filter: FilterKey): boolean => {
    if (!visibleFilters.value.includes(filter)) return false;
    const requiredPermission = FILTERS[filter]?.permission;
    if (requiredPermission) {
      type Permission = Parameters<typeof hasPermission>[0];
      return hasPermission(requiredPermission as Permission);
    }
    return true;
  };

  // ==================== State (registry-driven) ====================

  /**
     * Flag indicating if filters are fully initialized from URL.
     * Other components should wait for this before making API calls.
     */
  const isInitialized = ref(false);

  /**
     * Reactive state — shape and initial values are derived from FilterRegistry.
     * Adding a new filter to FILTERS automatically adds it here.
     */
  const state = reactive(
    Object.fromEntries(
      Object.entries(FILTERS).map(([key, def]) => [key, def.defaultValue()]),
    ),
  ) as FilterState;

  // ==================== Registry API ====================

  /**
     * Serialize current state → URL query params.
     * Used by useGlobalFiltersSync to push state to URL.
     */
  function toQuery(): Record<string, string | undefined> {
    const result: Record<string, string | undefined> = {};
    for (const def of Object.values(FILTERS)) {
      const key = def.key as keyof FilterState;
      Object.assign(result, def.toQuery(state[key] as never));
    }
    return result;
  }

  /**
     * Deserialize URL query params → state.
     * Used by useGlobalFiltersSync on initial load and browser navigation.
     */
  function applyQuery(query: LocationQuery) {
    for (const def of Object.values(FILTERS)) {
      const key = def.key as keyof FilterState;
      const parsed = def.fromQuery(query);
      if (parsed !== undefined) {
        (state as Record<string, unknown>)[key] = parsed;
      }
    }
  }

  // ==================== Generic setter ====================

  /**
     * Type-safe generic setter for any filter.
     * Automatically calls maybeAbort() if the filter has abortsRequests: true.
     */
  function set<K extends keyof FilterState>(key: K, value: FilterState[K]): void {
    if (FILTERS[key as keyof typeof FILTERS]?.abortsRequests) maybeAbort();
    (state as Record<string, unknown>)[key] = value;
  }

  // ==================== Named setters (keep abort semantics) ====================

  /** Update date range. Guard: requires exactly 2 elements. */
  const setDateRange = (range: [Date, Date] | Date[]): void => {
    if (range.length === 2) set("dateRange", [range[0], range[1]]);
  };

  /** Set granularity. */
  const setGranularity = (value: GranularityValue): void => set("granularity", value);

  /** Set search terms. */
  const setSearch = (values: string[]): void => set("search", values);

  /** Clear search terms. */
  const clearSearch = (): void => set("search", []);

  /**
     * Reset all filters to their defaultValues.
     * URL updates automatically via the reactive watcher in useGlobalFiltersSync.
     */
  const resetAllFilters = () => {
    for (const def of Object.values(FILTERS)) {
      const key = def.key as keyof FilterState;
      (state as Record<string, unknown>)[key] = def.defaultValue();
    }
  };

  /** Mark filters as initialized (called by useGlobalFiltersSync after first URL parse). */
  const setInitialized = () => {
    isInitialized.value = true;
  };

  // ==================== Getters ====================

  /**
     * Formatted date range for API calls.
     * Derived from registry toQuery — single source of truth.
     */
  const formattedDateRange = computed<{ since: string, until: string }>(() => {
    const { since = "", until = "" } = FILTERS.dateRange.toQuery(state.dateRange);
    return { since, until };
  });

  /**
     * All active filter values — use as watch dependency for data reloads.
     * @example
     * watch(() => filtersStore.filters, () => { loadData(); });
     */
  const filters = computed(() => toQuery());

  // ==================== Store API ====================

  return {
    // Filter state — all properties auto-exposed, incl. future filters
    ...toRefs(state),

    // Meta
    isInitialized,

    // Getters
    formattedDateRange,
    filters,

    // Filter Visibility
    isFilterVisible,
    allowedGranularityValues,

    // Registry API
    toQuery,
    applyQuery,

    // Setters
    set,
    setDateRange,
    setGranularity,
    setSearch,
    clearSearch,
    resetAllFilters,
    setInitialized,
    withoutAbort,
  };
});
