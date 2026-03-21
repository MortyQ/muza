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
 * Store → URL: automatic via watcher. Components only call store.setXxx().
 * URL → Store: via syncFromUrl(), called on init and browser back/forward.
 *
 * Call useGlobalFiltersSync() only ONCE — in root layout.
 */

// Module-level singleton flags
let isUpdatingUrl = false;
let isWatchRegistered = false;

export function useGlobalFiltersSync() {
  const store = useGlobalFiltersStore();
  const route = useRoute();
  const router = useRouter();

  // ==================== URL → Store ====================

  /**
     * Sync store state from URL query params.
     * Handles both initial load and browser back/forward navigation.
     * Sets store.isInitialized = true after first call.
     */
  function syncFromUrl(query: LocationQuery) {
    isUpdatingUrl = true;
    try {
      store.withoutAbort(() => {
        const range = parseDateRange(query.since, query.until);
        if (range) store.setDateRange(range);

        const granularityParam = Array.isArray(query.granularity)
          ? query.granularity[0]
          : query.granularity;
        if (granularityParam && ["MONTH", "WEEK", "DAY"].includes(granularityParam)) {
          store.setGranularity(granularityParam as "MONTH" | "WEEK" | "DAY");
        }

        const searchItems = parseArrayParam(query.search);
        store.setSearch(searchItems);
      });
    }
    finally {
      isUpdatingUrl = false;
      store.setInitialized();
    }
  }

  // ==================== Store → URL (Reactive) ====================

  /**
     * Build URL query object from current store state.
     */
  function buildQuery(): Record<string, string | undefined> {
    const { since, until } = store.formattedDateRange;
    const granularity = store.granularity !== "MONTH" ? store.granularity : undefined;
    const searchItems = store.search;

    return {
      since,
      until,
      granularity,
      search: searchItems.length > 0 ? searchItems.join(",") : undefined,
    };
  }

  /**
     * Push current store state to URL, cleaning up undefined params.
     */
  async function syncToUrl() {
    const updates = buildQuery();
    const mergedQuery = { ...route.query };

    for (const [key, value] of Object.entries(updates)) {
      if (value === undefined) {
        delete mergedQuery[key];
      }
      else {
        mergedQuery[key] = value;
      }
    }

    await router.replace({ query: mergedQuery });
  }

  // ==================== Watchers ====================

  if (!isWatchRegistered) {
    isWatchRegistered = true;

    // Store → URL: reactive auto-sync
    watch(
      () => [store.granularity, store.dateRange, store.search] as const,
      () => {
        if (isUpdatingUrl) return;
        syncToUrl();
      },
      { deep: true },
    );

    // URL → Store: browser back/forward navigation
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
    syncFromUrl,
  };
}
