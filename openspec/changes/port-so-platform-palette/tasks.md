# Tasks

The owner accepted decisions A and B (design.md, Decision 4) on 2026-11-24.

Each group below is one block and one commit. The block loop of `.claude/review/PIPELINE.md`
applies. That means `.claude/hooks/review.sh` runs on each staged block, and with
`REVIEW_MODE=feature` once at handoff.

## 1. Contrast contract — `test(ui): assert theme contrast pairs`

- [x] 1.1 Add `libs/ui/tests/unit/theme-contrast.spec.ts`. It does three things:
  - reads `libs/config/src/tailwind/theme.css` as text;
  - takes the light and dark theme blocks by selector;
  - converts each `oklch()` value to sRGB and computes the WCAG ratio.

  Then it asserts every pair in `specs/config-theme-palette/spec.md`:
  - text at 4.5;
  - field border between 3.0 and 3.2;
  - focus border at 3.0;
  - dark nav darker than the dark background.

  Verify: run `pnpm --filter @muzakit/ui test:unit -- theme-contrast` against the current violet
  palette. The field-border, status and dark-foreground pairs must not all pass, which proves the
  test can fail.
- [x] 1.2 Add a case that no colour variable in either block has a hue between 270 and 280 (the previous palette's range; slate sits at 257–266). Verify:
  it fails against the current palette.

## 2. Light palette — `feat(config): port so-platform light palette`

- [x] 2.1 Replace every colour variable in `:root, :root[data-theme="light"]` with its so-platform
  value, converted to oklch. Write the Tailwind step and hex in a comment, applying choices 1, 3
  and 6. Verify: the light cases of the 1.1 spec pass.
- [x] 2.2 Set the light field border to `oklch(66.5% 0.030 257)`, with a comment giving its reason
  (3:1 minimum). Verify: the 1.1 border case passes at between 3.0 and 3.2.
- [x] 2.3 Apply decision A, danger-700 `#b91c1c` with hover `#991b1b`, and decision B, muted
  `oklch(54% 0.041 257)`. Verify: the 1.1 "status on subtle" and "muted on page" cases pass.
- [x] 2.4 Retint the light `--elevation-sm` and `--elevation-lg` to hue 257, keeping geometry and
  alpha. Update the comment. Verify: `pnpm --filter @muzakit/ui test:tokens` passes; clear
  `libs/ui/node_modules/.vite` first.

## 3. Dark palette — `feat(config): port so-platform dark palette`

- [x] 3.1 Replace every colour variable in `:root[data-theme="dark"]` with its so-platform value,
  applying choices 2, 4, 5 and 8:
  - `*-foreground` is `#0f172a`;
  - subtles are step 950 and muted steps are 900;
  - nav is `#020617`, nav-hover is `#0f172a`, nav-active and nav-border are `#1e293b`.

  Verify: the dark cases of the 1.1 spec pass.
- [x] 3.2 Set the dark field border to `oklch(50.5% 0.030 257)`, with its reason in a comment.
  Verify: the 1.1 border case passes.
- [x] 3.3 Retint the dark glow in `--elevation-sm` and `--elevation-lg` to hue 237, sky, keeping
  the alpha. Rewrite the "brand violet" comment. Verify: `test:tokens` passes.
- [x] 3.4 Grep `libs/ui/src` for every reader of a `*-foreground` token. Check each one on
  `/components-demo` in the dark theme, where the label or mark is now dark on a light fill: the
  checkbox, switch, toast action, tags and chips. Verify: compare screenshots in the dark theme;
  any component that needed white is listed and fixed in this block.

- [x] 3.5 Decision C: set every dark `-hover` to the 300 step and the dark `--primary-active` to
  sky-200, with the reason in the block's comment. Add the "tonal `-hover` text on a 9% and 15% tint"
  case to `theme-contrast.spec.ts`. Verify: the case fails with so-platform's sky-500 and red-500
  hovers and passes with the 300 steps.

- [x] 3.6 Decision D:
  - the dashboard's content panel takes `bg-background`;
  - the dark `--surface-sunken` is slate-950;
  - the dark `--border-subtle` is `oklch(33% 0.038 259)`.

  Add the "three distinct planes" and "dark subtle edge" cases to `theme-contrast.spec.ts`. Verify:
  both cases fail on so-platform's values and pass on the new ones, and cards and tables stand off
  the page in the dark theme.

## 4. Fallbacks and docs — `feat(ui): match token fallbacks to the new light palette`

- [x] 4.1 Update every colour fallback in `libs/ui/src/styles/tokens.css`, including the
  `--ui-shadow-*` fallbacks, to the light value from group 2. Verify: a one-off diff script finds
  no fallback that differs from its light variable. Also extend the 1.1 spec with a case asserting
  the same.
- [x] 4.2 Update the `oklch(52% 0.27 280)` example in the `tests/setup/tokens.ts` comments.
- [x] 4.3 In `ui-component-migration.md`, replace "tinted with the brand violet" with the new tint.
- [x] 4.4 Add a "Changed" entry to `libs/ui/CHANGELOG.md`. It says the palette is so-platform's
  sky and slate, that no token was renamed, and that dark `*-foreground` tokens are now dark.

## 5. Verification

- [x] 5.1 Run a cold build and every check in `ui-component-migration.md` § Verify. Also run
  `pnpm --filter @muzakit/ui test:unit`, `test:types` and `test:tokens`. Verify: all green, with
  the output quoted in the handoff.
- [x] 5.2 Run the dashboard and look at `/`, `/components-demo` and `/table-demo` in both themes.
  Specific checks:
  - the table header and total-row gradients and pinned tints;
  - the dark sunken and hover surfaces (design.md, Risks);
  - the sidebar against the page.

  Share screenshots with the owner. This also answers the open wrapper-colour question: the page is
  now `#f1f5f9`.
- [x] 5.3 Run `muzakit-starter-without-tailwind` with no theme loaded. Verify: its primary button
  matches the dashboard's light-theme button.

## Workflow follow-up

- After merge, archive the change and sync `config-theme-palette` into `openspec/specs/`.
- Recapture the palette review artifact with the final values and correct its option C label
  (`#94a3b8` is 2.56:1, not 3:1).
