# Conventions — muzakit

Naming, file structure, code style, and import rules that apply to every package in the monorepo.

---

## File & Component Naming

| What | Convention | Examples |
|------|-----------|---------|
| Vue components | `PascalCase.vue` | `BaseButton.vue`, `AuthFeature.vue` |
| `@muzakit/ui` components | `V` prefix | `VButton`, `VTable`, `VModal`, `VInput`, `VSelect`, `VTag`, `VDrawer` |
| Feature root component | `<Name>Feature.vue` | `AuthFeature.vue` |
| Page/route component | `<Name>Page.vue` | `TableDemoPage.vue` |
| Sub-components | `<Feature><Role>.vue` | `LoginForm.vue`, `ReportCreateDrawer.vue` |
| Composable files / functions | `camelCase.ts`, `use` prefix | `usePasswordStrength.ts` → `usePasswordStrength` |
| Store files / functions | `use<Name>Store.ts` | `useAuthStore.ts` → `useAuthStore` |
| API wrapper files | `api/use<Feature>Request.ts` | `useProductsRequest.ts` (see the `use-api` skill) |
| Utility functions | `camelCase` | `formatDate.ts` |
| Constants | `SCREAMING_SNAKE_CASE` | `MAX_ITEMS` |
| Types / interfaces | `PascalCase` | `ButtonProps`, `UserData` |
| Test files | `*.spec.ts` | `VButton.spec.ts` (`libs/ui/tests/`, see `testing.md`) |
| CSS classes | `kebab-case`; BEM in `libs/ui` | `btn-primary`, `v-input__icon-left` |
| Folder names | `kebab-case` | `form-controls/`, `navigation-sidebar/` |

Components must be multi-word — ESLint enforces `vue/multi-word-component-names`.

---

## File Organization

- One component per file.
- Co-locate component-specific composables and types next to the component.
- Shared types go in a `types/` folder within the package.
- Internal packages are imported by package name (`@muzakit/ui`), never by a relative path across
  packages — see `project.md`.

---

## Feature Folder — Public API Rule

**`index.ts` is the only public export from a feature.** Deep imports from outside the feature are
banned.

```ts
// ✅ correct
import { useReports } from "@/features/reports";

// ❌ wrong — bypasses encapsulation
import { useReports } from "@/features/reports/composables/useReports";
```

`index.ts` only re-exports — zero logic inside it. Existing features without an `index.ts` get one
when they are next touched.

---

## Import Order

Enforced by ESLint (`import/order` in `@muzakit/config/eslint.base.mjs`). Alphabetical within each
group, a blank line between groups.

1. Built-ins (`node:fs`, etc.)
2. `vue`, then other external packages (`@vueuse/core`, `luxon`)
3. Internal `@muzakit/*` packages, then the app alias `@/**`
4. Parent paths (`../`)
5. Sibling paths (`./`)
6. Index imports (`./index`)

Blank line required **after** the import block, before the first statement.

```ts
// ✅ correct
import { computed, ref } from "vue";

import type { ApiError } from "@ametie/vue-muza-use";

import { VTable } from "@muzakit/ui";

import type { Report } from "../types";
import { useReportsRequest } from "./api/useReportsRequest";

const reports = ref<Report[]>([]);
```

Type-only imports use `import type` (`typescript.instructions.md` Rule 4).

---

## Code Style

Enforced by ESLint + `@stylistic/eslint-plugin` via `@muzakit/config/eslint.base.mjs`.

| Rule | Value |
|------|-------|
| Indent | 2 spaces |
| Quotes | Double (`"`) |
| Semicolons | Required |
| Trailing commas | `always-multiline` |
| Max line length | 100 chars |
| Blank lines | 1 blank line between logical blocks |

No Prettier — ESLint handles formatting.

---

## `@muzakit/ui` — Use Shared Components First

Before building any UI element, check if `@muzakit/ui` already provides it.
**Always prefer `@muzakit/ui` components over custom implementations.**

| Need | Use |
|------|-----|
| Button / icon-button / group | `VButton`, `VButtonGroup` |
| Text input / textarea | `VInput` |
| Dropdown / multi-select | `VSelect` |
| Data table | `VTable` (see the `vtable` skill) |
| Modal / confirm dialog | `VModal` |
| Side drawer | `VDrawer` |
| Tabs | `VTab` |
| Status badge / enum chip | `VTag`, `VChip` |
| Tooltip | `VTooltip` |
| Icon | `VIcon` — lucide only (`lucide:<name>`), see Icons below |
| Spinner / skeleton | `VLoader`, `VSkeleton` |
| Toggle / boolean switch | `VSwitch` |
| Checkbox | `VCheckbox` |
| Card container | `VCard` |
| Toast notifications | `VToaster` + `useToast` |
| Info notice / alert | `VInfoNotice` |
| Empty state | `VEmptyState` |
| Segmented control | `VSegmentedControl` |
| Date picker | `VDatepicker` |
| File upload | `VFileUpload` |
| Floating anchor (popover) | `VFloating` |
| Accordion / collapsible | `VAccordion`, `VCollapse` |
| Progress / meter | `VProgressBar`, `VMeter` |
| Headline figure | `VStat` |

### Icons

Lucide is the only icon set. The icons the library's own components draw are assembled at
build time by `muzakitIcons()` (`@muzakit/ui/vite`): `vite build` scans `libs/ui/src` and embeds
every `lucide:` name it finds, `vite dev` embeds nothing and lets them load from the Iconify API.
There is nothing to run by hand — use an icon in a component and the next build ships it. A name
lucide does not have fails the build.

Every Vite config that compiles the library from source registers the plugin (`libs/ui`, its
Vitest config, each app); without it the import of `virtual:muzakit-icons` does not resolve.
Icons an app passes in by name are the app's: they load from the Iconify API unless the app
registers them.

Only build a custom component when `@muzakit/ui` has no equivalent **and** the need is specific
enough that adding it to the library isn't warranted. Adding one to the library follows
`ui-component-migration.md`.

---

## Styling and Tokens

- **`libs/ui`** — BEM SCSS, one stylesheet per component under `styles/components/`, zero Tailwind
  utilities in templates, every colour / size / weight a `--ui-*` token. The full contract is
  `ui-component-migration.md`.
- **Apps** — Tailwind v4, themed by `@muzakit/config` (`libs/config/src/tailwind/theme.css`), which
  maps the design system onto Tailwind's namespaces.

Hard constraints everywhere: **no raw hex, RGB/HSL or `oklch()` values, and no Tailwind default
palette (`gray-500`, `blue-300`).** Use the design-system tokens. No inline styles — the only
`:style` binding allowed hands a dynamic value to CSS as a custom property (`vue-syntax` Rule 15).

```vue
<!-- ✅ correct — dynamic value as a custom property, colour from a token in the stylesheet -->
<div :style="{ '--v-progress-value': `${percent}%` }" class="v-progress-bar" />

<!-- ❌ wrong — raw values -->
<div :style="{ color: '#0ea5e9', width: percent + '%' }" />
```

---

## Arrow Functions — Mandatory

Never use the `function` keyword. All handlers, helpers, composable exports,
utility functions, and Pinia store actions must use arrow function syntax.

This includes:
- Event handlers in components: `const onSubmit = () => { ... }`
- Composable exports: `export const useReports = (): UseReportsReturn => { ... }`
- Pinia store actions: `const fetchReports = async () => { ... }`
- Helper utilities: `const formatDate = (date: string) => { ... }`

Existing code that still uses `function` is legacy and will be migrated separately — never
replicate it in new code.

---

## Component Subfolder Structure

When a feature has 5 or more components spanning distinct logical sections
(tabs, integrations, domains) — group them into subfolders inside `components/`.
Components shared across sections stay at the root of `components/`.

Grouping strategy:
- Feature with tabs → subfolders by tab name
- Feature with integrations → subfolders by integration name
- Shared/generic components (modals, drawers used across sections) → root of `components/`

```
// ✅ correct — product feature organized by tab
components/
  assets/
    ProductAssetsTab.vue
    ProductAssetUploader.vue
  attributes/
    ProductAttributesTab.vue
    ProductAttributeRow.vue
  history/
    ProductHistoryTab.vue
  ProductCreateDrawer.vue    ← shared, not tab-specific
  ProductDeleteModal.vue     ← shared

// ❌ wrong — flat dump of 15+ files with no grouping
components/
  ProductAssetsTab.vue
  ProductAssetUploader.vue
  ProductAttributesTab.vue
  ProductAttributeRow.vue
  ...
```

Multi-file library components (`libs/ui/src/components/table/`, `navigation-sidebar/`) follow the
same idea with their own `components/` and `composables/` subfolders.

---

## Component Decomposition

Large components must be split into focused sub-components before implementation.
A component is too large when it handles more than one visual section.

Extract reusable logic into composables first, then split the template.
Each sub-component must be understandable in isolation — without reading its siblings.

Plan sub-components before writing any file. Never grow a component beyond its
single responsibility and refactor later.

```
// ✅ correct
ProductAttributesTab.vue        ← orchestrates, receives props, delegates rendering
  ProductAttributeRow.vue       ← single row, one responsibility
  ProductAttributeEmptyState.vue

// ❌ wrong — one 400-line component doing layout + row logic + empty state + modals
ProductAttributesTab.vue
```

---

## Comments

- Write comments only where logic is non-obvious.
- No JSDoc on self-explanatory functions.
- No commented-out code — delete it.

---

## General Rules

- Prefer `const` over `let`.
- No `any` — use `unknown` or proper types.
- No unused variables or imports.
- Keep functions small and focused.
- Do not add features beyond what was asked.
