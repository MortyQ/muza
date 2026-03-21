/**
 * Vue Router type augmentation for Global Filters.
 * Extends RouteMeta with filters visibility configuration.
 *
 * This file exists solely for router type augmentation — do not add logic here.
 * Filter configuration, DEFAULT_FILTERS and parseGranularityOptions live in filterRegistry.ts.
 */

import type { ExtendedFilterKey, FilterKey } from "./filterRegistry";

// Re-export for consumers who import from this path
export type { ExtendedFilterKey } from "./filterRegistry";

// Filters visibility configuration for route.meta
export interface FiltersVisibilityConfig {
  /** Show only these filters (whitelist) — supports granularity modifiers */
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
