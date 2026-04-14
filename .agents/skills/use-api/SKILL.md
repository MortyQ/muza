# Skill: Vue Muza Use API Layer

## Metadata

| Field | Value |
|---|---|
| **name** | `use-api` |
| **description** | Feature-scoped API layer pattern built on `@ametie/vue-muza-use`. Generates and refactors typed composable wrappers for HTTP requests in Vue 3 apps. |
| **version** | 1.0 |
| **applies_to** | `**/api/use*.ts`, `**/*.vue`, `**/*.ts` (when dealing with HTTP requests) |

## Auto-Activation Triggers

Apply this skill automatically when any of the following is true:

- The task involves creating or editing a file matching `*/api/use*.ts`
- The code imports or mentions `useApiPost`, `useApiGet`, `useApiPut`, `useApiDelete`, `useApiPatch`
- The code imports from `@ametie/vue-muza-use`
- The user asks to: "create an API layer", "add a request", "fetch data from", "add a download", "create a composable for API", "wrap an endpoint"
- The component directly calls `useApi*` — this is a violation, suggest refactoring to a feature wrapper

---

## Role

You are a senior Vue 3 / TypeScript / frontend architecture assistant.
Your job is to generate and refactor feature-scoped API layers built on top of `@ametie/vue-muza-use`.

You must optimize for:
- clean architecture,
- typed API wrappers,
- composable-based usage,
- real-world Vue app patterns,
- minimal duplication,
- predictable naming,
- production-ready code.

Do not write raw HTTP logic directly in components when a feature API layer is appropriate.

---

## Core idea

This codebase uses a feature API wrapper pattern:

- Components do not call `useApiPost` / `useApiGet` directly.
- Components call a feature composable like `useSalesAndTraffic()`.
- That composable returns typed request factories such as:
  - `fetchBrandSalesTable`
  - `downloadBrandSalesTable`
  - `fetchTopProductSalesTable`
  - `downloadTopProductSalesTable`
- Those factories internally call `useApi*` with:
  - explicit URL,
  - explicit response typing,
  - optional request typing when needed.

All runtime request behavior is passed from the component into the returned factory call:
- `data`
- `watch`
- `immediate`
- `debounce`
- `responseType`
- `onSuccess`
- `onError`
- `poll`
- `retry`
- `skipErrorNotification`

---

## Required file structure

```
/feature/<FeatureName>/api/use<FeatureName>.ts
```

Example:

```
/feature/salesAndTraffic/api/useSalesAndTraffic.ts
```

This file exports one composable that returns all request factories for that domain.

---

## Naming rules

| Prefix | Purpose |
|---|---|
| `fetch...` | data reads |
| `download...` | blob / file exports |
| `save...` | create actions |
| `update...` / `edit...` | mutation / update actions |
| `delete...` | delete actions |

Prefer descriptive domain names. Avoid vague names like `requestData`, `loadStuff`, `handleApi`.

---

## API layer pattern

### Correct pattern

```ts
import { useApiPost, UseApiOptions } from "@ametie/vue-muza-use";

import { BrandSalesRow, TopProductSalesRow } from "@/features/salesAndTraffic/types";
import { PaginatedResponse } from "@/shared/types/table";

export default () => {
  const fetchBrandSalesTable = (
    options?: UseApiOptions<PaginatedResponse<BrandSalesRow>>,
  ) => {
    return useApiPost("/sales", options);
  };

  const downloadBrandSalesTable = (
    options?: UseApiOptions<Blob>,
  ) => {
    return useApiPost("/sales/export-brand-details", options);
  };

  const fetchTopProductSalesTable = (
    options?: UseApiOptions<PaginatedResponse<TopProductSalesRow>>,
  ) => {
    return useApiPost("/sales/brand-products", { ...options });
  };

  const downloadTopProductSalesTable = (
    options?: UseApiOptions<Blob>,
  ) => {
    return useApiPost("/sales/export-product-details", options);
  };

  return {
    fetchBrandSalesTable,
    downloadBrandSalesTable,
    fetchTopProductSalesTable,
    downloadTopProductSalesTable,
  };
};
```

### Important rules
- Keep `useApi*` inside the feature API wrapper — never in components.
- Keep URL and response typing inside the wrapper.
- Keep runtime options in the component.
- Do not duplicate request implementation across components.

---

## Component usage pattern

```ts
const { fetchBrandSalesTable, downloadBrandSalesTable } = useSalesAndTraffic();

const page = useTablePage();
const sort = ref<SortItem[]>([
  { field: "DATE", order: "desc" },
  { field: "SALES", order: "desc" },
]);

const { loading, data } = fetchBrandSalesTable({
  data: () => ({
    ...filterStore.tableRequestParams,
    ...periodState.value.params,
    isGroupByDate: periodState.value.isGroupByDate,
    limit: 10,
    page: page.value,
    sort: sort.value,
  }),
  watch: [sort, page, () => filterStore.tableRequestParams, periodState],
  immediate: true,
});

const { loading: downloadLoading, execute: downloadExecute } = downloadBrandSalesTable({
  data: () => ({
    ...filterStore.tableRequestParams,
    ...periodState.value.params,
    isGroupByDate: periodState.value.isGroupByDate,
    sort: sort.value,
  }),
  responseType: "blob",
  onSuccess: downloadFromResponse,
});
```

Pattern order:
1. feature composable first
2. per-request options in the component
3. destructured state from the return

---

## UseApiOptions guidance

Use `UseApiOptions<Response>` by default.

Only include a request-body generic when it genuinely improves clarity:

```ts
// preferred — second generic only when needed
UseApiOptions<PaginatedResponse<BrandSalesRow>>

// avoid overusing
UseApiOptions<PaginatedResponse<BrandSalesRow>, RequestParams>
```

---

## Real-world scenarios

### 1. Table request
```ts
const { loading, data } = fetchSomethingTable({
  data: () => ({ ...filters.value, page: page.value, sort: sort.value }),
  watch: [page, sort, filters],
  immediate: true,
});
```

### 2. Download request
```ts
const { loading, execute } = downloadSomething({
  data: () => ({ ...filters.value }),
  responseType: "blob",
  onSuccess: downloadFromResponse,
});
```

### 3. Search request
```ts
const { loading, data } = searchSomething({
  data: () => ({ query: searchQuery.value }),
  watch: [searchQuery],
  debounce: 300,
  immediate: true,
});
```

### 4. Save / mutation request
```ts
const { loading, execute } = saveItem({
  data: () => form.value,
  onSuccess: () => router.push("/list"),
});
```

### 5. Polling request
```ts
const { data } = fetchStatus({
  immediate: true,
  poll: 5000,
});
```

### 6. Manual request (no auto-trigger)
```ts
const { loading, execute } = fetchOnDemand({
  data: () => payload.value,
});
// called manually: execute()
```

---

## Forbidden patterns

- Raw axios calls in components
- Repeated request logic across multiple components
- URL hidden inside the component when a feature wrapper exists
- Vague names (`requestData`, `loadStuff`)
- Unnecessary generics on every function
- Request logic without typing
- Same domain requests spread across multiple files without a wrapper

---

## Output style

- Keep it practical, typed, production-ready
- Prefer concise code over verbose abstractions
- Use domain-specific naming
- Do not add unnecessary architecture layers

---

## Example output shape

```ts
// feature/<feature>/api/use<Feature>.ts
export default () => {
  const fetchSomething = (options?: UseApiOptions<ResponseShape>) =>
    useApiPost("/domain/path", options);

  const downloadSomething = (options?: UseApiOptions<Blob>) =>
    useApiPost("/domain/export", options);

  return { fetchSomething, downloadSomething };
};
```

```ts
// component
const { fetchSomething, downloadSomething } = useFeature();

const { loading, data } = fetchSomething({
  watch: [page, filters],
  immediate: true,
  data: () => ({ ...filters.value, page: page.value }),
});
```

---

Always prefer the feature wrapper + runtime options in component architecture.
Never flatten the API layer into components.
