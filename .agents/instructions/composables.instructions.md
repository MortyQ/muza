---
applyTo: "**/composables/**/*.ts,**/api/use*.ts"
---

# Composable Rules — muzakit

> Rules for composables in the apps (`apps/muzakit-dashboard`, `apps/muzakit-starter-without-tailwind`)
> and in `libs/ui`. Requests go through `@ametie/vue-muza-use`; the API-wrapper layer itself is
> covered by the `use-api` skill. General composable shape (naming, `MaybeRefOrGetter`, cleanup,
> no top-level side effects) is `vue-syntax` Rule 16.
>
> The apps pin `@ametie/vue-muza-use` **0.6.1**. Rules 4, 6 and 7 below describe that version,
> verified against its `dist/`. If the pin moves, re-check them.
>
> These rules are hard constraints. Every rule is verifiable in code review. Numbering is shared
> with the rule set this file was ported from, so cross-references stay valid; rules that do not
> apply here are kept as stubs.

---

## Rule 1 — A Composable File Contains Logic Only

A composable file holds the composable. Type declarations and static lookup tables live in
sibling files. A 150-line composable where 90 lines are a `Record` of UI copy is a file you
have to scroll past to read the logic.

```
features/<feature>/
  types.ts          ← Use<X>Return + its helper types
  constants.ts      ← static, non-reactive lookup maps
  composables/
    use<X>.ts       ← logic only
  components/
```

**Exception** — when the feature folder already contains a `types/` **directory** (API
contracts), do NOT put a flat `types.ts` beside it. Use `types/composables.ts` instead, and keep
`constants.ts` flat at the feature root.

```
// ✅ correct — no existing types/ dir
features/reports/
  types.ts        → UseReportsReturn, ReportStatusCopy
  constants.ts    → STATUS_COPY
  composables/useReports.ts

// ✅ correct — feature already owns a types/ dir for API contracts
features/auth/
  types/index.ts        → User, LoginPayload   (API contracts)
  types/composables.ts  → UsePasswordStrengthReturn
  constants.ts

// ❌ wrong — flat types.ts sitting next to a types/ directory
features/auth/
  types/index.ts
  types.ts
```

---

## Rule 2 — Static Lookup Maps Are Module-Level Constants

Any `Record<Union, Copy>` that maps an enum-like union to labels, colors, icons, or help text is
**static data**. It must be a module-level `const` in `constants.ts` — never rebuilt inside the
composable, never wrapped in `computed`.

Declaring it inside the composable re-allocates the object on every call and hides the logic.

```ts
// ✅ correct — constants.ts
import type { TagColor } from "@muzakit/ui";

import type { ReportStatus, ReportStatusCopy } from "./types";

export const STATUS_COPY: Record<ReportStatus, ReportStatusCopy> = {
  queued: { label: "Queued", color: "neutral", hint: "Picked up within a minute." },
  running: { label: "Running", color: "info", hint: "Usually under a minute." },
  completed: { label: "Completed", color: "success", hint: "Partial failures are normal." },
  failed: { label: "Failed", color: "danger", hint: "The whole run failed." },
};

// ❌ wrong — rebuilt on every composable call, buried above the logic
export const useReports = () => {
  const statusCopy: Record<ReportStatus, ReportStatusCopy> = { ... };
};
```

Use `Record<Union, T>` — never `Record<string, T>`. The exhaustive form makes TypeScript fail the
build when a new union member is added, which is the entire point.

---

## Rule 3 — Exported Return Interface, Declared in `types.ts`

Every exported composable has a named return interface (`typescript` Rule 5). It is the
composable's contract, so it belongs in `types.ts` where a reader can see the whole surface without
scrolling the implementation.

```ts
// ✅ correct — types.ts
export interface UseReportDraftReturn {
  draft: Ref<string>
  problem: ComputedRef<ReportProblem | null>
  canSave: ComputedRef<boolean>
  save: () => Promise<void>
}

// ✅ correct — composables/useReportDraft.ts
import type { UseReportDraftReturn } from "../types";

export const useReportDraft = (): UseReportDraftReturn => { ... };

// ❌ wrong — inferred return type on an exported composable
export const useReportDraft = () => { ... };
```

---

## Rule 4 — Re-fetching Is the `watch` Option, Not a Hand-Written Watcher

In 0.6.1 `useApi` does **not** track the `url`, `params` or `data` getters on its own: they are
read with `toValue()` at `execute()` time. Re-fetching on a dependency change is the `watch`
option, which re-runs `execute()` whenever a listed source changes. Getters are still the right
shape for `params` / `data` — they make every execution read the current values.

```ts
// ✅ correct — getter for the payload, `watch` for the trigger
const { data } = fetchReports({
  params: () => ({ status: status.value, limit: limit.value }),
  watch: [status, limit],
  immediate: true,
});

// ❌ wrong — a second, hand-written trigger for what the option already does
const { data, execute } = fetchReports({ params: () => ({ status: status.value }), immediate: true });
watch(status, () => execute());
```

`immediate` defaults to `false`, so a mutation or a manual request is simply created without it and
run with `execute()`.

---

## Rule 5 — Derive State From a Response With `onSuccess`, Not a Watcher

When state is seeded or recomputed from a response body, use the `onSuccess` option. It receives a
typed `AxiosResponse<T>` and fires on every successful response — including polling ticks. A
watcher on the `data` ref is an extra reactive dependency that does the same job.

```ts
// ✅ correct
const { data: report } = fetchReport({
  immediate: true,
  onSuccess: ({ data }) => { draft.value = data.blocks[0]?.text ?? ""; },
});

// ❌ wrong — redundant watcher
const { data: report } = fetchReport({ immediate: true });
watch(report, (value) => {
  if (value) draft.value = value.blocks[0]?.text ?? "";
}, { immediate: true });
```

Prefer a `computed` over both when the value is pure derivation rather than a seeded, editable copy.

---

## Rule 6 — Conditional Requests: `immediate: false` + a Watcher

`useApi` has **no `enabled` option**, and two obvious workarounds are both wrong:

- **Returning `undefined` from the URL getter does not skip the request.** `execute()` throws
  `Error("Request URL is missing")`, which lands in `error.value` — a visible error state, plus the
  global error notification unless `skipErrorNotification` is set.
- **A placeholder id in the URL sends a real request** (`/reports/0` → 404).

The correct pattern is no `immediate`, no `watch` option, and a watcher that calls `execute()`
only once the dependency is non-null.

```ts
// ✅ correct
export const useReport = (id: MaybeRefOrGetter<number | null>): UseReportReturn => {
  const { fetchReport } = useReportsRequest();

  // `?? 0` is unreachable — execute() is never called while the id is null.
  const { data, loading, error, execute } = fetchReport(() => toValue(id) ?? 0);

  watch(() => toValue(id), (value) => {
    if (value === null) return;
    void execute();
  }, { immediate: true });

  return { detail: data, loading, error };
};

// ❌ wrong — errors with "Request URL is missing" whenever the id is null
const { data } = fetchReport(() => (id.value ? `/reports/${id.value}` : undefined));
```

This is the one place a watcher is preferred over `onSuccess` / the `watch` option.

---

## Rule 7 — Stopping a Poll

`poll` accepts a `MaybeRefOrGetter`, but has no enable/disable flag. An interval of `0` stops the
loop, so a reactive getter returning `0` is how a poll is stopped.

The flag driving it must be a **separate `ref`**, not the `data` ref: the `poll` getter is passed
into the same call that produces `data`, so closing over `data` is a temporal dead zone.

```ts
// ✅ correct
const isPolling = ref(false);

const { data: run } = fetchRun(() => toValue(id) ?? 0, {
  poll: () => (toValue(enabled) && isPolling.value ? POLL_INTERVAL_MS : 0),
  onSuccess: ({ data }) => { isPolling.value = ACTIVE_STATUSES.has(data.status); },
});
```

Always prove a poll actually stops on its terminal states. A poll that only stops rendering keeps
hitting the server forever.

---

## Rule 8 — Permission Gates

Not carried over — the source rule named an app-specific helper. In `muzakit-dashboard`, gate on
`hasPermissions` from `@/app/routes/utils/guards` and wrap it in a `computed`; a plain call is
evaluated once and never updates.

---

## Rule 9 — One Composable, One Concern

Split by responsibility, not by screen. A polling loop, a filter set, and a mutation flow are three
concerns even when one screen uses all three.

```ts
// ✅ correct
useReports()        // list + create
useReportPolling()  // one run, polled until terminal

// ❌ wrong — one god-composable per page
useReportsPage()
```

Register cleanup inside the composable that created the effect — never in the calling component.
No side effects at the top level of the composable body: they belong in lifecycle hooks or watchers.

---

## Rule 10 — `useApi` + `VTable`: One Request, Zero Plumbing

Every input the request depends on — filters, page, sort — is a ref read inside the `data` /
`params` getter and listed in `watch`. There is nothing else to wire: no `@request`, no hand-written
re-fetch watcher.

```ts
// ✅ correct
const page = useTablePage([status]);
const sort = ref<SortItem[]>([{ field: "createdAt", order: "desc" }]);

const { loading, data } = fetchReports({
  params: () => ({ status: status.value, page: page.value, sort: sort.value, limit: 50 }),
  watch: [status, page, sort],
  immediate: true,
});
```

```vue
<VTable v-model:sort-state="sort" :columns :data="data?.items ?? []" :loading :pagination />
```

| Concern | Owner | Never |
|---|---|---|
| Page | `useTablePage(resetOn)` — resets and injects itself into VTable | `ref(1)` + reset watcher + `@request` |
| Sort | `v-model:sort-state` on a `ref<SortItem[]>` read in the getter | `@request` → `sortState.value = …` → `execute()` |
| Re-fetch | the `watch` option | `watch(filters, () => execute())` |
| Loading UI | `:loading` — VTable overlays itself | `v-if="loading"` swapping the table for a `VLoader` |

`@request` is a **fallback** for what no other channel carries — a page-size changer, or a table
that owns no page ref at all. If `useTablePage` and `v-model:sort-state` are both in place, there
is nothing left for it and the handler should not exist. See the `vtable` skill for page modes.

**Never replace the table with a page-level loader.** VTable's built-in overlay keeps the header,
toolbar, column widths and scroll position on screen while a request is in flight; `v-if="loading"`
around the table makes the whole thing disappear and reflow on every filter change. This is the
table-shaped case of Rule 13.

---

## Rule 11 — Table Page State Belongs to `useTablePage`, Not to a Watcher

A list composable that feeds a `VTable` must not own its page as a bare `ref(1)` with a reset
watcher. `useTablePage(resetOn)` from `@muzakit/ui` already is that ref:

- it resets to page 1 whenever any `resetOn` source changes;
- it `provide()`s the ref to the child `VTable` (`TABLE_PAGE_KEY`), which writes pagination clicks
  back into it — no `v-model:page`, no page handling in `@request`.

```ts
// ✅ correct — one owner for the page
export const useReports = (): UseReportsReturn => {
  const page = useTablePage([since, until, status]);
  // read `page` in the request getter; it is not returned — the component never touches it
};

// ❌ wrong — a local ref, a reset watcher and an @request handler: three copies of one thing
const page = ref(1);
watch([since, until, status], () => { page.value = 1; });
const onRequest = (payload: RequestPayload) => { page.value = payload.page; };
```

`useTablePage` calls `provide()`, so the composable using it is callable only from a component's
setup, and the `VTable` must be a descendant of that component.

---

## Rule 12 — Caching

Not carried over — `@ametie/vue-muza-use` 0.6.1 has no `cache` option.

---

## Rule 13 — Loading Belongs to the Element, Never to the Page

The page root is layout and nothing else — no `loading`, no `v-if`, no spinner. Every block below
it is mounted from the first frame and reports its own wait: `VTable` takes `:loading` and draws its
own overlay, a stat or chart block renders its own skeleton.

A page-level `<VLoader v-if="loading">` that replaces the content is banned. It throws the whole
layout away and rebuilds it on every filter change, so the screen jumps under the cursor; it makes
independent requests look like one, so a slow lookup hides a summary that has already arrived; and
it hides which part of the screen is actually waiting.

```vue
<!-- ✅ correct — the layout never leaves; each block carries its own wait -->
<UsageTotals :loading :total />
<UsagePricingTable :loading="pricingLoading" :pricing />
<UsageBreakdown :loading :rows />

<!-- ❌ wrong — one spinner for three independent requests, layout discarded on every refetch -->
<VLoader v-if="loading && !total" />
<template v-else>
  <UsageTotals :total />
  …
</template>
```

Never drop `:loading` on the way down either: a component that has a loading state and is not given
one is a block that silently shows stale numbers.

| Element | Its wait |
|---|---|
| `VTable` | `:loading` — built-in overlay, keeps header, toolbar, column widths, scroll position |
| A row-level control (switch, select) | its own cell component with its own write; the flag is that write's `loading`, never the page's |
| Filters in the header | never — a header whose controls vanish on refetch moves under the cursor |

### The one place a full swap is right: a panel whose identity changes

A drawer or detail panel showing "the thing that was clicked" must not paint the previous thing's
body under the new thing's title. But the condition is **not** `loading` — `data` keeps the last
response while the next request is in flight.

Ask whether the body in hand is the one that was asked for:

```ts
// ✅ correct — identity, not activity
const isStale = computed<boolean>(() => detail.value?.id !== selectedId.value);

// ❌ wrong — shows row A under row B's title for a frame while the request for B starts
v-if="loading"
// ❌ wrong — false as soon as *any* body has arrived, including the previous one
v-if="loading && !detail"
```

Order the branches: nothing selected → error → stale (loader) → content. A stale-forever loader is
what an unhandled error looks like, so the error branch must sit above it.
