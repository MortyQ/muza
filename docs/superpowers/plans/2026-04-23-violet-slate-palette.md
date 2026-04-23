# Violet/Slate Colour Palette Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the blue-hue-255 design tokens with a Violet/Slate palette (light: Cool Slate + Violet #7c3aed, dark: Obsidian Indigo + lighter Violet).

**Architecture:** Three files change — `theme.css` holds raw theme values, `tokens.css` holds `--ui-*` wrappers with fallbacks, `_header.scss` swaps runtime `color-mix` for new pre-computed surface tokens. No components touched.

**Tech Stack:** CSS custom properties, OKLCH color space, SCSS

---

## File Map

| File | Change |
|---|---|
| `libs/config/src/tailwind/theme.css` | Full rewrite of light + dark token values; add `surface-tinted` / `surface-tinted-deep` to `@theme inline` and both theme blocks |
| `libs/ui/src/styles/tokens.css` | Full rewrite of `--ui-*` fallback values; add `--ui-surface-tinted` and `--ui-surface-tinted-deep` |
| `libs/ui/src/components/table/assets/styles/_header.scss` | Replace 3 lines in `.v-table-header-cell` — gradient + border-bottom |

---

## Task 1: Update theme.css

**Files:**
- Modify: `libs/config/src/tailwind/theme.css`

- [ ] **Step 1: Replace the file content**

Write the following complete content to `libs/config/src/tailwind/theme.css`:

```css
@import "tailwindcss";

@source "../../../ui/src";

@theme inline {
    /* ─── Brand ─────────────────────────────────────── */
    --color-primary:            var(--primary);
    --color-primary-hover:      var(--primary-hover);
    --color-primary-active:     var(--primary-active);
    --color-primary-foreground: var(--primary-foreground);
    --color-primary-subtle:     var(--primary-subtle);
    --color-primary-muted:      var(--primary-muted);

    /* ─── Surfaces ──────────────────────────────────── */
    --color-background:          var(--background);
    --color-surface-sunken:      var(--surface-sunken);
    --color-surface:             var(--surface);
    --color-surface-raised:      var(--surface-raised);
    --color-surface-overlay:     var(--surface-overlay);
    --color-surface-hover:       var(--surface-hover);
    --color-surface-active:      var(--surface-active);
    --color-surface-tinted:      var(--surface-tinted);
    --color-surface-tinted-deep: var(--surface-tinted-deep);

    /* ─── Navigation ─────────────────────────────────── */
    --color-nav:        var(--nav);
    --color-nav-hover:  var(--nav-hover);
    --color-nav-active: var(--nav-active);
    --color-nav-border: var(--nav-border);

    /* ─── Text ───────────────────────────────────────── */
    --color-foreground:          var(--foreground);
    --color-foreground-secondary: var(--foreground-secondary);
    --color-foreground-muted:    var(--foreground-muted);
    --color-foreground-subtle:   var(--foreground-subtle);
    --color-foreground-disabled: var(--foreground-disabled);
    --color-foreground-inverted: var(--foreground-inverted);

    /* ─── Borders ────────────────────────────────────── */
    --color-border-subtle: var(--border-subtle);
    --color-border:        var(--border);
    --color-border-strong: var(--border-strong);
    --color-border-focus:  var(--border-focus);

    /* ─── Overlay ────────────────────────────────────── */
    --color-overlay: var(--overlay);
    --color-scrim:   var(--scrim);

    /* ─── Status — Success ───────────────────────────── */
    --color-success:            var(--success);
    --color-success-hover:      var(--success-hover);
    --color-success-foreground: var(--success-foreground);
    --color-success-subtle:     var(--success-subtle);
    --color-success-muted:      var(--success-muted);

    /* ─── Status — Warning ───────────────────────────── */
    --color-warning:            var(--warning);
    --color-warning-hover:      var(--warning-hover);
    --color-warning-foreground: var(--warning-foreground);
    --color-warning-subtle:     var(--warning-subtle);
    --color-warning-muted:      var(--warning-muted);

    /* ─── Status — Danger ────────────────────────────── */
    --color-danger:            var(--danger);
    --color-danger-hover:      var(--danger-hover);
    --color-danger-foreground: var(--danger-foreground);
    --color-danger-subtle:     var(--danger-subtle);
    --color-danger-muted:      var(--danger-muted);

    /* ─── Status — Info ──────────────────────────────── */
    --color-info:            var(--info);
    --color-info-hover:      var(--info-hover);
    --color-info-foreground: var(--info-foreground);
    --color-info-subtle:     var(--info-subtle);
    --color-info-muted:      var(--info-muted);

    /* ─── Component Tokens ───────────────────────────── */
    --color-input-bg:           var(--input-bg);
    --color-input-border:       var(--input-border);
    --color-input-placeholder:  var(--input-placeholder);
    --color-badge-neutral-bg:   var(--badge-neutral-bg);
    --color-badge-neutral-text: var(--badge-neutral-text);
}

@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *));

/* ─── Light theme ────────────────────────────────────────── */
:root,
:root[data-theme="light"] {
    --primary:            oklch(52% 0.27 280);
    --primary-hover:      oklch(47% 0.27 280);
    --primary-active:     oklch(42% 0.27 280);
    --primary-foreground: oklch(100% 0 0);
    --primary-subtle:     oklch(95% 0.06 280);
    --primary-muted:      oklch(89% 0.09 280);

    --background:          oklch(96% 0.008 280);
    --surface-sunken:      oklch(93% 0.010 280);
    --surface:             oklch(99.5% 0.003 280);
    --surface-raised:      oklch(98% 0.005 280);
    --surface-overlay:     oklch(100% 0.002 280);
    --surface-hover:       oklch(94% 0.008 280);
    --surface-active:      oklch(91% 0.010 280);
    --surface-tinted:      oklch(96% 0.020 280);
    --surface-tinted-deep: oklch(93% 0.025 280);

    --nav:        oklch(22% 0.035 275);
    --nav-hover:  oklch(27% 0.032 275);
    --nav-active: oklch(30% 0.030 275);
    --nav-border: oklch(28% 0.025 275);

    --foreground:           oklch(16% 0.015 280);
    --foreground-secondary: oklch(38% 0.012 280);
    --foreground-muted:     oklch(55% 0.008 280);
    --foreground-subtle:    oklch(70% 0.005 280);
    --foreground-disabled:  oklch(76% 0.004 280);
    --foreground-inverted:  oklch(100% 0 0);

    --border-subtle: oklch(92% 0.008 280);
    --border:        oklch(87% 0.010 280);
    --border-strong: oklch(77% 0.013 280);
    --border-focus:  oklch(52% 0.27 280);

    --overlay: oklch(0% 0 0 / 0.5);
    --scrim:   oklch(0% 0 0 / 0.25);

    --success:            oklch(52% 0.17 145);
    --success-hover:      oklch(46% 0.17 145);
    --success-foreground: oklch(100% 0 0);
    --success-subtle:     oklch(94% 0.05 145);
    --success-muted:      oklch(88% 0.07 145);

    --warning:            oklch(72% 0.17 75);
    --warning-hover:      oklch(65% 0.17 75);
    --warning-foreground: oklch(20% 0.01 75);
    --warning-subtle:     oklch(96% 0.05 75);
    --warning-muted:      oklch(91% 0.07 75);

    --danger:            oklch(55% 0.22 25);
    --danger-hover:      oklch(49% 0.22 25);
    --danger-foreground: oklch(100% 0 0);
    --danger-subtle:     oklch(95% 0.05 25);
    --danger-muted:      oklch(90% 0.08 25);

    --info:            oklch(57% 0.20 240);
    --info-hover:      oklch(51% 0.20 240);
    --info-foreground: oklch(100% 0 0);
    --info-subtle:     oklch(94% 0.05 240);
    --info-muted:      oklch(88% 0.07 240);

    --input-bg:           oklch(100% 0.002 280);
    --input-border:       oklch(87% 0.010 280);
    --input-placeholder:  oklch(70% 0.005 280);
    --badge-neutral-bg:   oklch(91% 0.008 280);
    --badge-neutral-text: oklch(35% 0.012 280);
}

/* ─── Dark theme ─────────────────────────────────────────── */
:root[data-theme="dark"] {
    --primary:            oklch(65% 0.25 280);
    --primary-hover:      oklch(70% 0.25 280);
    --primary-active:     oklch(75% 0.25 280);
    --primary-foreground: oklch(100% 0 0);
    --primary-subtle:     oklch(28% 0.10 280);
    --primary-muted:      oklch(33% 0.13 280);

    --background:          oklch(16% 0.025 270);
    --surface-sunken:      oklch(13% 0.022 270);
    --surface:             oklch(20% 0.025 270);
    --surface-raised:      oklch(24% 0.025 270);
    --surface-overlay:     oklch(27% 0.028 270);
    --surface-hover:       oklch(24% 0.025 270);
    --surface-active:      oklch(27% 0.025 270);
    --surface-tinted:      oklch(24% 0.040 275);
    --surface-tinted-deep: oklch(21% 0.038 275);

    --nav:        oklch(13% 0.022 270);
    --nav-hover:  oklch(17% 0.022 270);
    --nav-active: oklch(20% 0.025 270);
    --nav-border: oklch(22% 0.020 270);

    --foreground:           oklch(93% 0.006 280);
    --foreground-secondary: oklch(73% 0.010 280);
    --foreground-muted:     oklch(52% 0.007 280);
    --foreground-subtle:    oklch(40% 0.005 280);
    --foreground-disabled:  oklch(35% 0.004 280);
    --foreground-inverted:  oklch(16% 0.025 270);

    --border-subtle: oklch(24% 0.020 270);
    --border:        oklch(30% 0.022 270);
    --border-strong: oklch(40% 0.018 270);
    --border-focus:  oklch(65% 0.25 280);

    --overlay: oklch(0% 0 0 / 0.65);
    --scrim:   oklch(0% 0 0 / 0.35);

    --success:            oklch(63% 0.17 145);
    --success-hover:      oklch(68% 0.17 145);
    --success-foreground: oklch(100% 0 0);
    --success-subtle:     oklch(24% 0.07 145);
    --success-muted:      oklch(29% 0.09 145);

    --warning:            oklch(74% 0.17 75);
    --warning-hover:      oklch(79% 0.17 75);
    --warning-foreground: oklch(15% 0.01 75);
    --warning-subtle:     oklch(24% 0.07 75);
    --warning-muted:      oklch(29% 0.09 75);

    --danger:            oklch(63% 0.22 25);
    --danger-hover:      oklch(68% 0.22 25);
    --danger-foreground: oklch(100% 0 0);
    --danger-subtle:     oklch(24% 0.08 25);
    --danger-muted:      oklch(29% 0.10 25);

    --info:            oklch(66% 0.18 240);
    --info-hover:      oklch(71% 0.18 240);
    --info-foreground: oklch(100% 0 0);
    --info-subtle:     oklch(24% 0.07 240);
    --info-muted:      oklch(29% 0.09 240);

    --input-bg:           oklch(18% 0.022 270);
    --input-border:       oklch(30% 0.022 270);
    --input-placeholder:  oklch(48% 0.007 280);
    --badge-neutral-bg:   oklch(26% 0.020 270);
    --badge-neutral-text: oklch(74% 0.009 280);
}


/*
 * To add a new theme (e.g. "ocean"):
 *   1. Add :root[data-theme="ocean"] { ... } block here
 *   2. Only override raw variables (--primary, --background, etc.) — NOT --ui-*
 *   3. Add "ocean" to ThemeType in libs/utils/src/theme/types.ts
 */
```

- [ ] **Step 2: Commit**

```bash
git add libs/config/src/tailwind/theme.css
git commit -m "style(config): violet/slate palette — update theme.css raw tokens"
```

---

## Task 2: Update tokens.css

**Files:**
- Modify: `libs/ui/src/styles/tokens.css`

- [ ] **Step 1: Replace the file content**

Write the following complete content to `libs/ui/src/styles/tokens.css`:

```css
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&display=swap');

/* ═══════════════════════════════════════════════════════════════════
   VIOLET/SLATE DESIGN SYSTEM
   Color space: OKLCH (perceptually uniform — equal L = equal brightness)
   Strategy: hue 280 for all neutrals + primary (violet). Low chroma = slate-gray.
   High chroma = interactive violet.

   TOKEN NAMING RULES:
   --ui-[group]-[variant]
   Groups: primary / surface / nav / foreground / border / overlay /
           success / warning / danger / info / input / badge

   USAGE RULES (read before using any token):
   • NEVER use raw oklch() values in .vue or .scss files
   • ALWAYS use --ui-* tokens or their Tailwind class equivalents
   • If token doesn't exist — discuss adding it, don't hardcode
   ═══════════════════════════════════════════════════════════════════ */

:root {
    font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
    font-optical-sizing: auto;

    /* ╔══════════════════════════════════════════════════════════╗
       ║  BRAND — PRIMARY                                         ║
       ╚══════════════════════════════════════════════════════════╝ */
    --ui-primary:            var(--primary, oklch(52% 0.27 280));
    --ui-primary-hover:      var(--primary-hover, oklch(47% 0.27 280));
    --ui-primary-active:     var(--primary-active, oklch(42% 0.27 280));
    --ui-primary-foreground: var(--primary-foreground, oklch(100% 0 0));
    --ui-primary-subtle:     var(--primary-subtle, oklch(95% 0.06 280));
    --ui-primary-muted:      var(--primary-muted, oklch(89% 0.09 280));

    /* ╔══════════════════════════════════════════════════════════╗
       ║  SURFACES — PAGE & COMPONENT BACKGROUNDS                 ║
       ╚══════════════════════════════════════════════════════════╝ */
    --ui-background:           var(--background, oklch(96% 0.008 280));
    --ui-surface-sunken:       var(--surface-sunken, oklch(93% 0.010 280));
    --ui-surface:              var(--surface, oklch(99.5% 0.003 280));
    --ui-surface-raised:       var(--surface-raised, oklch(98% 0.005 280));
    --ui-surface-overlay:      var(--surface-overlay, oklch(100% 0.002 280));
    --ui-surface-hover:        var(--surface-hover, oklch(94% 0.008 280));
    --ui-surface-active:       var(--surface-active, oklch(91% 0.010 280));
    --ui-surface-tinted:       var(--surface-tinted, oklch(96% 0.020 280));
    --ui-surface-tinted-deep:  var(--surface-tinted-deep, oklch(93% 0.025 280));

    /* ╔══════════════════════════════════════════════════════════╗
       ║  NAVIGATION                                              ║
       ╚══════════════════════════════════════════════════════════╝ */
    --ui-nav:        var(--nav, oklch(22% 0.035 275));
    --ui-nav-hover:  var(--nav-hover, oklch(27% 0.032 275));
    --ui-nav-active: var(--nav-active, oklch(30% 0.030 275));
    --ui-nav-border: var(--nav-border, oklch(28% 0.025 275));

    /* ╔══════════════════════════════════════════════════════════╗
       ║  TEXT — FOREGROUND (5-level hierarchy)                   ║
       ╚══════════════════════════════════════════════════════════╝ */
    --ui-foreground:           var(--foreground, oklch(16% 0.015 280));
    --ui-foreground-secondary: var(--foreground-secondary, oklch(38% 0.012 280));
    --ui-foreground-muted:     var(--foreground-muted, oklch(55% 0.008 280));
    --ui-foreground-subtle:    var(--foreground-subtle, oklch(70% 0.005 280));
    --ui-foreground-disabled:  var(--foreground-disabled, oklch(76% 0.004 280));
    --ui-foreground-inverted:  var(--foreground-inverted, oklch(100% 0 0));

    /* ╔══════════════════════════════════════════════════════════╗
       ║  BORDERS (4 weights: subtle → default → strong → focus)  ║
       ╚══════════════════════════════════════════════════════════╝ */
    --ui-border-subtle: var(--border-subtle, oklch(92% 0.008 280));
    --ui-border:        var(--border, oklch(87% 0.010 280));
    --ui-border-strong: var(--border-strong, oklch(77% 0.013 280));
    --ui-border-focus:  var(--border-focus, oklch(52% 0.27 280));

    /* ╔══════════════════════════════════════════════════════════╗
       ║  OVERLAY & SCRIM                                         ║
       ╚══════════════════════════════════════════════════════════╝ */
    --ui-overlay: var(--overlay, oklch(0% 0 0 / 0.5));
    --ui-scrim:   var(--scrim, oklch(0% 0 0 / 0.25));

    /* ╔══════════════════════════════════════════════════════════╗
       ║  STATUS COLORS (each: base / hover / fg / subtle / muted)║
       ╚══════════════════════════════════════════════════════════╝ */

    /* Success — green hue 145 */
    --ui-success:            var(--success, oklch(52% 0.17 145));
    --ui-success-hover:      var(--success-hover, oklch(46% 0.17 145));
    --ui-success-foreground: var(--success-foreground, oklch(100% 0 0));
    --ui-success-subtle:     var(--success-subtle, oklch(94% 0.05 145));
    --ui-success-muted:      var(--success-muted, oklch(88% 0.07 145));

    /* Warning — yellow hue 75 */
    --ui-warning:            var(--warning, oklch(72% 0.17 75));
    --ui-warning-hover:      var(--warning-hover, oklch(65% 0.17 75));
    --ui-warning-foreground: var(--warning-foreground, oklch(20% 0.01 75));
    --ui-warning-subtle:     var(--warning-subtle, oklch(96% 0.05 75));
    --ui-warning-muted:      var(--warning-muted, oklch(91% 0.07 75));

    /* Danger — red hue 25 */
    --ui-danger:            var(--danger, oklch(55% 0.22 25));
    --ui-danger-hover:      var(--danger-hover, oklch(49% 0.22 25));
    --ui-danger-foreground: var(--danger-foreground, oklch(100% 0 0));
    --ui-danger-subtle:     var(--danger-subtle, oklch(95% 0.05 25));
    --ui-danger-muted:      var(--danger-muted, oklch(90% 0.08 25));

    /* Info — blue hue 240 (distinct from violet primary hue 280) */
    --ui-info:            var(--info, oklch(57% 0.20 240));
    --ui-info-hover:      var(--info-hover, oklch(51% 0.20 240));
    --ui-info-foreground: var(--info-foreground, oklch(100% 0 0));
    --ui-info-subtle:     var(--info-subtle, oklch(94% 0.05 240));
    --ui-info-muted:      var(--info-muted, oklch(88% 0.07 240));

    /* ╔══════════════════════════════════════════════════════════╗
       ║  COMPONENT TOKENS — INPUT                                ║
       ╚══════════════════════════════════════════════════════════╝ */
    --ui-input-bg:          var(--input-bg, oklch(100% 0.002 280));
    --ui-input-border:      var(--input-border, oklch(87% 0.010 280));
    --ui-input-placeholder: var(--input-placeholder, oklch(70% 0.005 280));

    /* ╔══════════════════════════════════════════════════════════╗
       ║  COMPONENT TOKENS — BADGE (neutral)                      ║
       ╚══════════════════════════════════════════════════════════╝ */
    --ui-badge-neutral-bg:   var(--badge-neutral-bg, oklch(91% 0.008 280));
    --ui-badge-neutral-text: var(--badge-neutral-text, oklch(35% 0.012 280));

    /* ╔══════════════════════════════════════════════════════════╗
       ║  RADIUS                                                  ║
       ╚══════════════════════════════════════════════════════════╝ */
    --ui-radius-xs:   var(--radius-xs, 0.25rem);
    --ui-radius:      var(--radius, 0.375rem);
    --ui-radius-lg:   var(--radius-lg, 0.5rem);
    --ui-radius-xl:   var(--radius-xl, 0.75rem);
    --ui-radius-2xl:  var(--radius-2xl, 1rem);
    --ui-radius-full: 9999px;

    /* ╔══════════════════════════════════════════════════════════╗
       ║  SHADOWS                                                 ║
       ╚══════════════════════════════════════════════════════════╝ */
    --ui-shadow-xs:    0 1px 2px 0 oklch(0% 0 0 / 0.04);
    --ui-shadow-sm:    0 1px 3px 0 oklch(0% 0 0 / 0.08), 0 1px 2px -1px oklch(0% 0 0 / 0.06);
    --ui-shadow-md:    0 4px 6px -1px oklch(0% 0 0 / 0.10), 0 2px 4px -2px oklch(0% 0 0 / 0.08);
    --ui-shadow-lg:    0 10px 15px -3px oklch(0% 0 0 / 0.10), 0 4px 6px -4px oklch(0% 0 0 / 0.08);
    --ui-shadow-xl:    0 20px 25px -5px oklch(0% 0 0 / 0.12), 0 8px 10px -6px oklch(0% 0 0 / 0.08);
    --ui-shadow-inner: inset 0 2px 4px 0 oklch(0% 0 0 / 0.06);

    /* ╔══════════════════════════════════════════════════════════╗
       ║  FOCUS RING                                              ║
       ╚══════════════════════════════════════════════════════════╝ */
    --ui-ring:        var(--ui-primary);
    --ui-ring-offset: var(--ui-background);
}
```

- [ ] **Step 2: Commit**

```bash
git add libs/ui/src/styles/tokens.css
git commit -m "style(ui): violet/slate palette — update tokens.css --ui-* fallbacks, add surface-tinted tokens"
```

---

## Task 3: Patch _header.scss

**Files:**
- Modify: `libs/ui/src/components/table/assets/styles/_header.scss`

- [ ] **Step 1: Replace the gradient and border-bottom in `.v-table-header-cell`**

In `libs/ui/src/components/table/assets/styles/_header.scss`, find these lines inside `.v-table-header-cell` (around line 77–83):

```scss
  background: linear-gradient(
    to bottom,
    color-mix(in srgb, var(--ui-surface) 92%, var(--ui-primary) 8%),
    color-mix(in srgb, var(--ui-surface) 85%, var(--ui-info) 15%)
  );
  border-bottom: 1px solid color-mix(in oklch, var(--ui-primary) 25%, var(--ui-border) 75%);
```

Replace with:

```scss
  background: linear-gradient(
    to bottom,
    var(--ui-surface-tinted),
    var(--ui-surface-tinted-deep)
  );
  border-bottom: 1px solid var(--ui-border-strong);
```

- [ ] **Step 2: Commit**

```bash
git add libs/ui/src/components/table/assets/styles/_header.scss
git commit -m "style(ui): table header — replace runtime color-mix with surface-tinted tokens"
```

---

## Task 4: Visual verification

**Files:** none

- [ ] **Step 1: Start the dashboard dev server**

```bash
pnpm --filter @muzakit/dashboard dev
```

- [ ] **Step 2: Check light theme**

Open `http://localhost:5174` in Chrome. Toggle to **light mode**.

Verify:
- Background is cool slate-gray (not pure white, not warm)
- Table header gradient is a subtle violet tint (not pink, not blue)
- Primary buttons are violet (`#7c3aed` range)
- Borders have a slight violet tint
- Text is near-black with a hint of slate (not warm brown)

- [ ] **Step 3: Check dark theme**

Toggle to **dark mode**.

Verify:
- Background is deep obsidian-indigo (very dark, slightly blue-purple)
- Table header gradient is darker than surface, with a violet tint
- Primary buttons are lighter violet (readable on dark bg)
- Borders are subtle dark lines with indigo undertone

- [ ] **Step 4: Check status colours**

Find any success/warning/danger/info indicators in the UI.

Verify they are visually distinct from the new violet primary — especially info (now hue 240, a clear blue vs the violet-purple primary at 280).

- [ ] **Step 5: Commit if any last-minute tweaks were needed**

If no tweaks needed, skip this step. Otherwise:

```bash
git add -p
git commit -m "style: palette fine-tune after visual review"
```
