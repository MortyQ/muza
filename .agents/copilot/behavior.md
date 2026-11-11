# Copilot Behavior — muzakit

Rules for GitHub Copilot autocomplete and inline suggestions.

---

## Always Apply

- Suggest completions consistent with the existing code style in the file
- `<script setup lang="ts">` — never suggest Options API or `export default defineComponent()`
- Script setup order: composables → template refs → state → computed → handlers → watchers →
  lifecycle → `defineExpose` (`vue-syntax` Rule 18)
- Destructure props directly: `const { title, count = 0 } = defineProps<{...}>()`
- `defineModel` for v-model — never `modelValue` prop + `update:modelValue` emit
- Typed emits with tuple syntax: `defineEmits<{ select: [item: Product] }>()`
- `useTemplateRef<T>('name')` for template refs — never `ref<HTMLElement | null>(null)`
- Pinia setup store syntax: `defineStore('id', () => { ... })` — never options syntax
- Arrow functions for handlers, helpers, composables and store actions — never `function`
- `import type` for all type-only imports
- Import order: Vue → third-party → `@muzakit/*` → `@/` → relative
- No `any` — use generics or `unknown`
- No regular `enum` — union types or `const` objects
- 2-space indent, double quotes, semicolons, trailing commas in multiline

---

## In `libs/ui/**`

- Templates carry BEM classes only — no Tailwind utilities, no inline styles except a CSS custom
  property (`:style="{ '--v-x': value }"`)
- One `<style lang="scss" scoped>` block holding one `@use` of the component's stylesheet
- Colours, sizes and weights are `--ui-*` tokens; alpha is `color-mix(in oklch, …)`
- Full contract: `.agents/instructions/ui-component-migration.md`

## In `apps/**`

- Components never call `useApi*` directly — suggest a feature wrapper in `api/use<Feature>Request.ts`
- Import from `@muzakit/ui` / `@muzakit/utils` by package name, never by relative path
- Blocks carry their own `:loading` — never a page-level `v-if="loading"` loader

---

## Suggestions to Avoid

- Options API (`data()`, `methods:`, `computed:`, `watch:`)
- `this` references
- `Vue.component()` global registration
- `require()` — use ESM `import`
- Default exports for composables — use named exports
- `$refs`, `$parent`, `$emit` in Composition API
- `defineComponent({ setup() { ... } })`
- `const props = defineProps(...)` (accessing via `props.x`)
- `ref<HTMLElement | null>(null)` for template refs
- A `watch` whose body only assigns a ref — that is a `computed` (`vue-syntax` Rule 10a)
- `computed(() => [...rows.value])` to satisfy a mutable prop type (`typescript` Rule 15a)
- Inline styles (`:style="{ width: x + 'px' }"`)
- `any` type
- Regular `enum`
- Unscoped `<style>` blocks in components
- `template` before `script` in component file order

---

## Skills Auto-Activation

Check `.agents/skills/` for applicable skills before completing a request. Each skill has
**Auto-Activation Triggers** (or a trigger `description`) — apply the skill automatically when they
match. The trigger table is in `.github/copilot-instructions.md`.
