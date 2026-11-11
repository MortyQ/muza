---
applyTo: "**/*.ts,**/*.vue"
---

# TypeScript Rules — muzakit

> These rules are hard constraints. No degradation of type safety is allowed.
> TypeScript strict mode is always on. Every rule is verifiable in code review.

---

## Rule 1 — Strict Mode Always On

`tsconfig.json` must have `"strict": true`. Never disable it, never override individual strict flags.

```json
// ✅ correct
{
  "compilerOptions": {
    "strict": true
  }
}

// ❌ wrong — disabling individual strict flags
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": false,
    "strictNullChecks": false
  }
}
```

---

## Rule 2 — No `any`

`any` is banned. Use `unknown` with a type guard for truly unknown data.
Use proper generics for reusable functions.

```ts
// ✅ correct — unknown + type guard
const processWebhookPayload = (raw: unknown) => {
  if (!isProductPayload(raw)) throw new Error('Unexpected payload')
  return raw.id
}

const isProductPayload = (val: unknown): val is { id: string; name: string } => {
  return typeof val === 'object' && val !== null && 'id' in val
}

// ❌ wrong — any to silence TS
const doSomething = (handler: any) => {
  handler()
}

// ❌ wrong — cast to any to bypass check
const id = (row as any).id
```

---

## Rule 3 — No Regular Enums

Regular TypeScript `enum` is banned — it generates runtime code and hurts tree-shaking.
Use union types or const objects.

```ts
// ✅ correct — union type (preferred when no iteration needed)
type ProductStatus = 'active' | 'inactive' | 'archived'
type MediaType = 'image' | 'video' | 'document'

// ✅ correct — const object with satisfies (when iteration or Object.values() is needed)
const PRODUCT_STATUS = {
  Active: 'active',
  Inactive: 'inactive',
  Archived: 'archived',
} as const satisfies Record<string, string>

type ProductStatus = typeof PRODUCT_STATUS[keyof typeof PRODUCT_STATUS]
// iterate: Object.values(PRODUCT_STATUS)

// ❌ wrong — regular enum
enum ProductStatus {
  Active = 'active',
  Inactive = 'inactive',
  Archived = 'archived',
}

// ❌ wrong — numeric enum
enum Direction { Up, Down, Left, Right }
```

---

## Rule 4 — `import type` for Type-Only Imports

All type-only imports use `import type`. Prevents accidental runtime imports and avoids circular dependency issues.

```ts
// ✅ correct
import type { Ref, ComputedRef } from 'vue'
import type { ApiError } from '@ametie/vue-muza-use'
import type { Column, ExpandableRow } from '@muzakit/ui'
import type { Product, ProductStatus } from '../types'

// ❌ wrong — importing types without `import type`
import { Product, ProductStatus } from '../types'
import { Ref } from 'vue'
```

---

## Rule 5 — Explicit Return Types on Exported Composables

All exported composables must have an explicit return type — either inline or via a named interface.
No exceptions: TypeScript inference, however accurate, is not a substitute for a documented contract.

```ts
// ✅ correct — named interface (preferred for complex returns)
interface UseProductsReturn {
  products: ComputedRef<Product[]>
  total: ComputedRef<number>
  loading: Ref<boolean>
  error: Ref<ApiError | null>
  isEmpty: ComputedRef<boolean>
  refetch: () => void
}

export const useProducts = (): UseProductsReturn => {
  // ...
}

// ✅ correct — inline for simple composables
export const useToggle = (initial = false): { value: Ref<boolean>; toggle: () => void } => {
  const value = ref(initial)
  const toggle = () => { value.value = !value.value }
  return { value, toggle }
}

// ❌ wrong — no return type on exported composable
export const useProducts = () => {
  const { data } = fetchProducts({ immediate: true })
  return { products: computed(() => data.value?.items ?? []) }
}
```

---

## Rule 6 — Nullability: `null` over `undefined` for Intentional Absence

Use `null` when a value is intentionally absent.
Use `undefined` only when a value has never been set or is an optional function param.

```ts
// ✅ correct — intentional absence is null
const selectedProductId = ref<string | null>(null)
const product = ref<Product | null>(null)

// ✅ correct — optional param uses undefined implicitly
const useProducts = (filters?: Ref<ProductFilters>) => { ... }

// ❌ wrong — undefined for state that represents "nothing selected"
const selectedProductId = ref<string | undefined>(undefined)
```

---

## Rule 7 — Non-null Assertion `!`

`!` is allowed **only** when lifecycle guarantees existence — inside `onMounted`, `onUpdated`, or an
`onSuccess` callback.
Never use `!` to silence TypeScript outside of these boundaries.
After a null guard (`if (!x) return`), TypeScript narrows the type automatically — `!` is redundant and banned.

```ts
// ✅ correct — lifecycle guarantees DOM is mounted
onMounted(() => {
  inputRef.value!.focus()
})

// ✅ correct — TypeScript narrows automatically, no ! needed
if (!product.value) return
const name = product.value.name // TS already knows it's non-null here

// ❌ wrong — ! after a guard is redundant and misleading
if (!product.value) return
const name = product.value!.name // banned

// ❌ wrong — no lifecycle guarantee
const id = selectedProduct.value!.id
```

---

## Rule 8 — No `as` Type Assertions to Bypass Checks

`as` is banned for silencing TypeScript. It is allowed only for DOM ref access inside lifecycle hooks where
the type is known by construction. Any other use requires explicit justification in a comment.

```ts
// ✅ correct — narrowing after discriminant check
if (state.status !== 'success') return
const data = state.data // TS knows the type from discriminated union

// ❌ wrong — as to bypass a missing type
const id = (row as any).id

// ❌ wrong — as without a real guarantee
const product = someValue as Product
```

---

## Rule 9 — `interface` vs `type`

Use `interface` for domain entity shapes that may be extended.
Use `type` for unions, intersections, utility type compositions, and mapped types.

```ts
// ✅ correct — interface for domain entities
interface Product {
  id: string
  name: string
  status: ProductStatus
  categories: Category[]
}

// ✅ correct — type for unions, intersections, utility compositions
type ProductStatus = 'active' | 'inactive' | 'archived'
type ProductWithCategory = Product & { primaryCategory: Category }
type PartialProduct = Partial<Pick<Product, 'name' | 'status'>>

// ❌ wrong — type for plain extensible object shape
type Product = {
  id: string
  name: string
}
```

---

## Rule 10 — Generic Constraints

Always constrain generic type parameters when the shape is known.
Unconstrained `<T>` where a shape constraint is possible is banned.

```ts
// ✅ correct
const getById = <T extends { id: string }>(list: T[], id: string): T | undefined => {
    return list.find(item => item.id === id)
}

// ❌ wrong — unconstrained when shape is known
const getById = <T>(list: T[], id: string): T | undefined => {
    return (list as any[]).find(item => item.id === id)
}
```

---

## Rule 11 — Typed Props with `defineProps` Generic Syntax

Generic syntax only, never runtime object syntax — merged into `vue-syntax` Rule 2.

---

## Rule 12 — Typed `computed` with Explicit Generic

When a `computed` return type is ambiguous (nullable, union, complex), provide an explicit generic.

```ts
// ✅ correct — explicit generic prevents silent null escape
const selectedProduct = computed<Product | null>(() =>
  products.value.find(p => p.id === selectedId.value) ?? null
)

// ❌ wrong — inferred as Product | undefined
const selectedProduct = computed(() =>
  products.value.find(p => p.id === selectedId.value)
)
```

---

## Rule 13 — `satisfies` for Validated Literals

Use `satisfies` when you need type validation without widening the inferred type.
Prefer `satisfies` over `as const` alone when the shape must be verified.

```ts
// ✅ correct — satisfies validates shape AND preserves literal types
const ROUTES = {
  products: '/products',
  settings: '/settings',
  dashboard: '/dashboard',
} satisfies Record<string, string>

// ROUTES.products → '/products' (literal), not string

// ✅ correct — const object for enum replacement: see Rule 3

// ✅ correct — satisfies on component config objects
const tableColumns = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'status', label: 'Status', sortable: false },
] satisfies TableColumn[]
// individual entries preserve literal types for `key`

// ❌ wrong — as const alone: no shape validation, TS won't catch wrong values
const ROUTES = {
  products: 42, // TS silent — no validation
} as const
```

---

## Rule 14 — Discriminated Unions for Async State

Model async data as a discriminated union — not as three parallel `ref` variables.
Parallel `isLoading + data + error` refs allow invalid state combinations and force redundant null checks everywhere.

```ts
// ✅ correct — single source of truth, exhaustive narrowing
type AsyncState<T> =
    | { status: 'idle' }
    | { status: 'loading' }
    | { status: 'success'; data: T }
    | { status: 'error'; error: Error }

const state = ref<AsyncState<Product[]>>({status: 'idle'})

// narrowing in template or composable:
if (state.value.status === 'success') {
    console.log(state.value.data) // TS knows `data` exists here
}

// ❌ wrong — invalid combinations possible (loading=true AND error!=null)
const data = ref<Product[] | null>(null)
const isLoading = ref(false)
const error = ref<Error | null>(null)
```

Applies to async state **you write by hand**: form submission, a custom async operation, a
composable that orchestrates its own phases.

**Exception — library data layers.** `useApi*` / `useApiBatch` from `@ametie/vue-muza-use` return
parallel `data` / `loading` / `error` refs by design. Use them as they are; never wrap or mirror
them into an `AsyncState`. The data-layer rules (`use-api` skill, `composables.instructions.md`)
are built on those refs.

---

## Rule 15 — `readonly` and `ReadonlyArray`

Mark props and shared state as readonly to prevent accidental mutation.
Use `ReadonlyArray<T>` for array props. Use `Readonly<T>` for object props that should not be mutated.

```ts
// ✅ correct — array prop is read-only
const {items} = defineProps<{
    items: ReadonlyArray<Product>
    config: Readonly<TableConfig>
}>()

// ✅ correct — readonly in composable return (signals intent)
export const useProductList = (): {
    products: Readonly<Ref<ReadonlyArray<Product>>>
    loading: Ref<boolean>
} => { ... }

// ✅ correct — readonly tuple
const useSorted = <T>(list: ReadonlyArray<T>): ReadonlyArray<T> => { ... }

// ❌ wrong — mutable array prop allows push/splice inside component
const {items} = defineProps<{ items: Product[] }>()
items.push(newProduct) // silently mutates parent data
```

### Rule 15a — No defensive copies to satisfy a mutable prop

`readonly` is not a reason to copy. **Never** spread an array into a `computed` or a constant only
because a component prop is typed mutable (`VTable` `data`, `VSelect` `options`, …). The copy adds a
layer, a name and a comment, and protects nothing — the component does not mutate it.

Give the value the right shape **at its source** instead:

- A composable returns `ComputedRef<T[]>` (mutable) for rows and options a component consumes;
  the template binds it directly: `:data="rows"`, `:options`.
- A static option list is declared `Option[]` in `constants.ts`, not `readonly Option[]`, and is
  bound directly: `:options="STATUS_OPTIONS"`.
- A table or select that owns its data — calls its own composable instead of receiving fetched
  rows from a parent — receives no array props at all, so there is no readonly prop to copy from.

```ts
// ✅ correct — the source already has the shape the component takes
const { rows } = useProducts();            // rows: ComputedRef<ProductRow[]>
// <VTable :data="rows" />  <VSelect :options="STATUS_OPTIONS" />

// ❌ banned — a copy whose only job is the type
const tableData = computed(() => [...rows.value]);
const statusOptions: Option[] = [...STATUS_OPTIONS];
```

A `computed` over a list is allowed only when it **transforms** it: prepends an "All" option,
filters, maps, sorts, slices. If removing the computed would change what the user sees, it is a
transformation; if it would change only a type, it is banned.

Existing component props that receive arrays stay `ReadonlyArray<T>`. Where such a prop must go
into a mutable-typed component prop, the fix is to move the data into the component (it should own
it), not to copy.

---

## Rule 16 — Template Literal Types for Domain-Specific String Unions

When a domain has a finite set of valid `"entity.action"` or `"namespace.key"` string combinations,
model it as a template literal type derived from a source-of-truth map — not as a plain `string` or hand-written union.

This gives: exhaustive type checking, auto-complete, zero duplication, and a single place to extend.

### Pattern — PERMISSION_MAP → Permission type → PERMISSIONS const

```ts
// ── 1. Source of truth — the only place to edit when adding new entries ──────
const PERMISSION_MAP = {
  catalog:  ["read", "write", "admin", "import"],
  users:    ["read", "write", "admin"],
  channels: ["read", "write", "admin"],
} as const;

type PermissionMap = typeof PERMISSION_MAP;

// ── 2. Derived types — auto-update when PERMISSION_MAP changes ────────────────

// "catalog" | "users" | "channels"
type Entity = keyof PermissionMap;

// ActionFor<"catalog"> → "read" | "write" | "admin" | "import"
type ActionFor<E extends Entity> = PermissionMap[E][number];

// Full union of valid combinations only:
// "catalog.read" | "catalog.write" | "catalog.admin" | "catalog.import" |
// "users.read" | "users.write" | "users.admin" |
// "channels.read" | "channels.write" | "channels.admin"
//
// "users.import" and "catalog.fly" are NOT in this type — TS catches them.
type Permission = { [E in Entity]: `${E}.${ActionFor<E>}` }[Entity];

// ── 3. Auto-generated const — keys follow ENTITY_ACTION pattern ───────────────
type PermissionsConst = {
  [E in Entity as `${Uppercase<E>}_${Uppercase<ActionFor<E>>}`]: `${E}.${ActionFor<E>}`;
};

const buildPermissions = (): PermissionsConst => {
  const result: Record<string, string> = {};
  for (const entity of Object.keys(PERMISSION_MAP) as Entity[]) {
    for (const action of PERMISSION_MAP[entity]) {
      result[`${entity.toUpperCase()}_${action.toUpperCase()}`] = `${entity}.${action}`;
    }
  }
  return result as PermissionsConst;
};

const PERMISSIONS = buildPermissions();

// PERMISSIONS.CATALOG_READ   → "catalog.read"   (literal type, not string)
// PERMISSIONS.USERS_WRITE    → "users.write"
// PERMISSIONS.USERS_IMPORT   → TS error: Property does not exist ✓
// PERMISSIONS.CATALOG_FLY    → TS error: Property does not exist ✓
```

### How to extend

```ts
// Add a new module — everything auto-derives, nothing else to change:
const PERMISSION_MAP = {
  catalog:  [...],
  users:    [...],
  channels: [...],
  products: ["read", "write", "admin"],  // ← add here
} as const;

// Now available:
// PERMISSIONS.PRODUCTS_READ, PERMISSIONS.PRODUCTS_WRITE, PERMISSIONS.PRODUCTS_ADMIN
// Permission type now includes "products.read" | "products.write" | "products.admin"
```

### When to use this pattern

Use template literal type unions when:
- A domain has a fixed set of `"namespace.key"` or `"entity.action"` strings
- The valid combinations vary per namespace (not a cartesian product of all × all)
- The set will grow over time — new entries should not require touching multiple files
- You want compile-time safety on string values passed to APIs or stored in configs

Do NOT use for open-ended strings, user-generated content, or purely runtime values.