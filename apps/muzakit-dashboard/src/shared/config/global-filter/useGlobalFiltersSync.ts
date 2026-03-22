import { watch } from "vue";

import { type LocationQuery, useRoute, useRouter } from "vue-router";

import { useGlobalFiltersStore } from "@/shared/store/useGlobalFiltersStore";

// ==================== Singleton ====================

interface SyncApi {
  syncFromUrl: (query: LocationQuery) => void
}

/**
 * Module-level singleton.
 * Created on the FIRST call to useGlobalFiltersSync() (from MasterLayout).
 * All subsequent calls return the same instance.
 *
 * Reset on HMR via import.meta.hot.dispose to prevent stale watchers.
 */
let _instance: SyncApi | null = null;

/**
 * Composable for syncing global filters store ↔ URL query params.
 *
 * Store → URL: automatic via watcher on store.toQuery().
 * URL → Store: via syncFromUrl(), called on init and browser back/forward.
 *
 * ⚠️  Must be called exactly ONCE — in the root layout (MasterLayout).
 *      Every subsequent call returns the cached singleton.
 */
export function useGlobalFiltersSync(): SyncApi {
  if (_instance) return _instance;

  const store = useGlobalFiltersStore();
  const route = useRoute();
  const router = useRouter();

  // Lives in closure — no module-level leakage between HMR cycles
  let isUpdatingUrl = false;

  // ==================== URL → Store ====================

  /**
     * Apply URL query params to store state.
     * Each filter's fromQuery() handles its own parsing — zero parsing logic here.
     */
  function syncFromUrl(query: LocationQuery) {
    isUpdatingUrl = true;
    try {
      store.withoutAbort(() => store.applyQuery(query));
    }
    finally {
      isUpdatingUrl = false;
      store.setInitialized();
    }
  }

  // ==================== Store → URL ====================

  /**
     * Push current store state to URL.
     * Removes keys whose toQuery() returned undefined.
     */
  async function syncToUrl() {
    const updates = store.toQuery();
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

  // ==================== Watchers (registered exactly once) ====================

  // Store → URL: reactive auto-sync via registry toQuery()
  watch(
    () => store.toQuery(),
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

  _instance = { syncFromUrl };
  return _instance;
}

// Reset singleton on HMR so stale watchers don't accumulate after hot reload
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    _instance = null;
  });
}
