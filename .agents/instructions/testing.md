# Testing `@muzakit/ui`

Two Vitest projects, one config (`libs/ui/vitest.config.ts`). Tests live in
`libs/ui/tests/`, outside `src/` — `src/` is both the dts build input and the
Tailwind `@source` scan root, and screenshot baselines have no business in
either.

| | `unit` | `browser` |
|---|---|---|
| Environment | jsdom | real Chromium via Playwright |
| Renderer | `@vue/test-utils` | `vitest-browser-vue` |
| CSS | not applied | Tailwind + SCSS, compiled |
| Covers | props, emits, models, slots, ARIA, keyboard | tokens, geometry, both themes |

## Commands

```bash
pnpm --filter @muzakit/ui test:unit            # jsdom, ~2s
pnpm --filter @muzakit/ui test:tokens          # token contracts only, no baselines
pnpm --filter @muzakit/ui test:visual          # + pixel regression
pnpm --filter @muzakit/ui test:coverage        # unit + thresholds
pnpm --filter @muzakit/ui test:visual:docker   # the browser project in CI's image
```

A `pre-push` hook runs the unit project, and the token contracts when a Chromium
is installed. Pixel regression stays out of it — see below.

## The four layers

**Convention guard** (`tests/conventions.spec.ts`) turns
`ui-component-migration.md` into assertions: one scoped style block per
component holding nothing but its `@import`, a paired stylesheet at the
conventional path, no Tailwind utilities in templates, no raw colours or
`@apply`/`theme()` in SCSS, `color-mix` always in oklch. `VIcon` is the only
component exempt from the paired-stylesheet rule; an unscoped `<style>` is
allowed only where the element is teleported out of the component's subtree and
the block says `teleported:`.

**Unit** — behaviour, not appearance.

**Token contracts** (`tests/visual/tokens/`) resolve a `--ui-*` token through a
probe element and compare it against what the browser actually computed, in both
themes. This is what catches a component quietly drifting off its token, or a
dark-theme override that never lands. No baselines, so nothing to maintain.

**Pixel regression** (`tests/visual/screenshots/`) catches what a token check
cannot: spacing, shadows, radii, alignment.

## Screenshot baselines

Names carry the platform (`…-chromium-linux.png`). **Only the Linux set is
committed**; `.gitignore` drops `-darwin` and `-win32`, so a local run writes a
throwaway set beside them and a first local run always reports "no reference
screenshot". That is expected.

To refresh them, run the **Update visual baselines** workflow from the Actions
tab on the relevant branch. It regenerates inside the same Playwright image CI
uses and commits the result. Regenerating on macOS produces a set CI can never
match.

The image tag in both workflows must match the `playwright` version in
`pnpm-lock.yaml`. A different Chromium renders text differently and invalidates
every baseline at once — bump them together, then regenerate.

## Traps worth knowing

1. **Vite's transform cache can outlive an edit to `tokens.css`** and serve the
   old colour, producing screenshot failures that have nothing to do with the
   change. If a `-actual` capture shows a colour that is not in the file, clear
   `libs/ui/node_modules/.vite`.

2. **`browser.screenshotDirectory` is unusable.** It is resolved against the
   project root and then joined onto the spec's own directory, so any value
   builds an absolute-path-shaped tree inside `tests/`. `screenshotFailures` is
   off instead; `toMatchScreenshot` writes its own `-actual`/`-diff` pair.

3. **Transitions are stubbed globally** in `tests/setup/unit.ts`. jsdom never
   fires `transitionend`, so a leaving element would sit in the DOM forever: a
   closed modal still matching its selector, a removed row still counted.

4. **Comments at the root of a template make a component multi-root.**
   `wrapper.classes()` is then empty and `wrapper.element` is a fragment
   (`VThemeSwitcher`). Reach for the root by selector.

5. **Iconify renders an empty `<svg>`** until it has fetched the glyph, so an
   icon name is only visible on `VIcon`'s props, never in the markup. In the
   browser project the local collections are registered up front, so glyphs do
   render.

6. **Units.** `rawToken("--ui-radius")` gives `0.375rem`, `getComputedStyle`
   gives `6px`. For anything that is not a colour use `tokenAsValue()` from
   `tests/setup/tokens.ts`, which pushes both sides through the same probe.

7. **The unit project needs jsdom, never `node`** — even for pure functions.
   `@muzakit/utils` runs a module-scope `watch` on import that touches
   `document` and `localStorage`.

8. **Module-level singletons survive between tests**: the `useModal` registry,
   `useTheme`. Clear them in `beforeEach`.

9. **`matchMedia` answers false to everything** in the unit setup, which
   disables anything gated on `(hover: hover)`. Override it in the spec, or the
   test passes by never doing anything.

## Adding a component

Unit spec under `tests/unit/{category}/`, token contracts under
`tests/visual/tokens/{category}/`, screenshots under
`tests/visual/screenshots/{category}/`. Use `stage()` from `tests/setup/stage.ts`
for screenshots: it frames the component at a fixed width so a diff stays local
to what moved. Keep the width constant across a component's variants.

Then check the test can fail. A token contract that passes against a hardcoded
colour is not testing anything.
