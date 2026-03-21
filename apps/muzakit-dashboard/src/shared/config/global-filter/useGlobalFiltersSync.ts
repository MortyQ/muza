import { watch } from "vue";

import { DateTime } from "luxon";
import { type LocationQuery, type LocationQueryValue, useRoute, useRouter } from "vue-router";

import { useGlobalFiltersStore } from "@/shared/store/useGlobalFiltersStore";

type QueryParam = LocationQueryValue | LocationQueryValue[];

/**
 * Parse comma-separated string to array
 */
function parseArrayParam(param?: QueryParam): string[] {
  const value = Array.isArray(param) ? param[0] : param;
  if (!value) return [];
  return value.split(",").filter(Boolean);
}

/**
 * Parse ISO date strings to Date objects
 * Returns null if invalid or missing
 */
function parseDateRange(since?: QueryParam, until?: QueryParam): [Date, Date] | null {
  const sinceStr = Array.isArray(since) ? since[0] : since;
  const untilStr = Array.isArray(until) ? until[0] : until;

  if (!sinceStr || !untilStr) return null;

  try {
    const sinceDate = DateTime.fromISO(sinceStr, { zone: "utc" });
    const untilDate = DateTime.fromISO(untilStr, { zone: "utc" });

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
 * Composable for syncing global filters store with URL query params.
 *
 * Provides explicit functions to update URL — no automatic watchers for Store → URL.
 * Only browser navigation (back/forward) triggers URL → Store sync.
 *
 * Usage:
 * const { updateDateRange, updateGranularity, updateSearch } = useGlobalFiltersSync();
 *
 * // After user changes date picker:
 * store.setDateRange(newRange);
 * updateDateRange();
 *
 * // After user changes granularity:
 * store.setGranularity(value);
 * updateGranularity();
 */

// Global singleton flag to prevent circular URL updates
let isUpdatingUrl = false;

// Track if watch is already registered (prevent multiple watches)
let isWatchRegistered = false;

export function useGlobalFiltersSync() {
  const store = useGlobalFiltersStore();
  const route = useRoute();
  const router = useRouter();

  /**
     * Helper to update URL without triggering the watch
     */
  async function updateUrlSilently(updateFn: () => Promise<void>) {
    isUpdatingUrl = true;
    try {
      await updateFn();
    }
    finally {
      isUpdatingUrl = false;
    }
  }

  // ==================== URL → Store (Init & Browser Navigation) ====================

  /**
     * Update store from URL query params.
     * Called on init and browser navigation (back/forward).
     * Uses withoutAbort to prevent cancelling requests during URL sync.
     */
  function syncFromUrl(query: LocationQuery) {
    store.withoutAbort(() => {
      // Date range
      const range = parseDateRange(query.since, query.until);
      if (range) {
        store.setDateRange(range);
      }

      // Granularity
      const granularityParam = Array.isArray(query.granularity)
        ? query.granularity[0]
        : query.granularity;
      if (granularityParam && ["MONTH", "WEEK", "DAY"].includes(granularityParam)) {
        store.setGranularity(granularityParam as "MONTH" | "WEEK" | "DAY");
      }

      // Search
      const searchItems = parseArrayParam(query.search);
      store.setSearch(searchItems);

      // Future filters:
      // if (query.project_id) store.setProjectId(query.project_id);
      // if (query.status) store.setStatus(query.status);
    });
  }

  // ==================== Store → URL (Explicit Updates) ====================

  /**
     * Update date range in URL.
     * Call this after user changes the date picker.
     */
  async function updateDateRange() {
    await updateUrlSilently(async () => {
      await router.replace({
        query: {
          ...route.query,
          since: store.formattedDateRange.since,
          until: store.formattedDateRange.until,
        },
      });
    });
  }

  /**
     * Update granularity in URL.
     * Call this after user changes granularity filter.
     * Default "MONTH" is omitted from URL.
     */
  async function updateGranularity() {
    await updateUrlSilently(async () => {
      const value = store.granularity;
      if (value === "MONTH") {
        const { granularity: _granularity, ...restQuery } = route.query;
        await router.replace({ query: restQuery });
      }
      else {
        await router.replace({
          query: {
            ...route.query,
            granularity: value,
          },
        });
      }
    });
  }

  /**
     * Update search in URL.
     * Call this after user changes search filter.
     * Empty search removes param from URL.
     */
  async function updateSearch() {
    await updateUrlSilently(async () => {
      const items = store.search;
      if (items.length === 0) {
        const { search: _search, ...restQuery } = route.query;
        await router.replace({ query: restQuery });
      }
      else {
        await router.replace({
          query: {
            ...route.query,
            search: items.join(","),
          },
        });
      }
    });
  }

  /**
     * Clear all URL query params (used on full filter reset).
     */
  const resetAllFilters = async () => {
    await updateUrlSilently(async () => {
      await router.replace({ query: {} });
    });
  };

  // ==================== Watchers (Only for Browser Navigation) ====================

  /**
     * Sync URL → Store on browser back/forward navigation.
     * This is the ONLY watcher — no automatic Store → URL sync.
     * Only registered ONCE (first call to useGlobalFiltersSync).
     */
  if (!isWatchRegistered) {
    isWatchRegistered = true;
    watch(
      () => route.query,
      (newQuery) => {
        if (isUpdatingUrl) return;
        if (!store.isInitialized) return;
        syncFromUrl(newQuery);
      },
    );
  }

  return {
    updateDateRange,
    updateGranularity,
    updateSearch,
    resetAllFilters,
  };
}
