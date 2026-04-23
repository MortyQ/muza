# Design Spec: Violet/Slate Colour Palette

**Date:** 2026-04-23  
**Status:** Approved  
**Scope:** `libs/config`, `libs/ui`

---

## Goal

Replace the current blue-hue-255 palette with a modern Violet/Slate system inspired by Stripe, Mercury, Figma, and Supabase. Both light and dark themes are updated. The result should feel premium, technically precise, and visually cohesive.

---

## Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Light base | Cool Slate (hue 280 neutrals) | Clean, technical, aligns with Figma/Linear |
| Dark base | Obsidian Indigo (hue 270) | Rich depth, distinct from primary |
| Primary accent | Violet hue 280 | More purple than current blue-255, premium feel like Stripe/Mercury |
| Surface in light | `oklch(99.5% 0.003 280)` micro-tint | Eliminates achromatic color-mix artifacts permanently |
| Header tint | Pre-computed tokens | Replaces runtime `color-mix` in table header — no runtime surprises |
| Info color | Shifted from hue 220 → 240 | Visually distinct from violet primary at hue 280 |
| Status colors | Unchanged | Green/amber/red are palette-neutral |

---

## Files Changed

| File | Change |
|---|---|
| `libs/config/src/tailwind/theme.css` | All raw token values under `:root[light]` and `[data-theme="dark"]` |
| `libs/ui/src/styles/tokens.css` | `--ui-*` fallback values + two new tokens added |
| `libs/ui/src/components/table/assets/styles/_header.scss` | Replace `color-mix` gradient with `var(--ui-surface-tinted)` / `var(--ui-surface-tinted-deep)` |

**No component changes.** All `--ui-*` token names stay identical — only values change.

---

## New Tokens

Two tokens added to both files:

```css
--ui-surface-tinted       /* pre-computed header/elevated surface tint */
--ui-surface-tinted-deep  /* slightly deeper — used as gradient bottom stop */
```

These replace the runtime `color-mix(in srgb, var(--ui-surface) 92%, var(--ui-primary) 8%)` pattern in `_header.scss`.

---

## Light Theme — Full Token Values

**Primary — Violet**
```css
--primary:            oklch(52% 0.27 280);
--primary-hover:      oklch(47% 0.27 280);
--primary-active:     oklch(42% 0.27 280);
--primary-foreground: oklch(100% 0 0);
--primary-subtle:     oklch(95% 0.06 280);
--primary-muted:      oklch(89% 0.09 280);
```

**Surfaces — Cool Slate**
```css
--background:           oklch(96% 0.008 280);
--surface-sunken:       oklch(93% 0.010 280);
--surface:              oklch(99.5% 0.003 280);
--surface-raised:       oklch(98% 0.005 280);
--surface-overlay:      oklch(100% 0.002 280);
--surface-hover:        oklch(94% 0.008 280);
--surface-active:       oklch(91% 0.010 280);
--surface-tinted:       oklch(96% 0.020 280);
--surface-tinted-deep:  oklch(93% 0.025 280);
```

**Navigation**
```css
--nav:        oklch(22% 0.035 275);
--nav-hover:  oklch(27% 0.032 275);
--nav-active: oklch(30% 0.030 275);
--nav-border: oklch(28% 0.025 275);
```

**Foreground**
```css
--foreground:          oklch(16% 0.015 280);
--foreground-secondary: oklch(38% 0.012 280);
--foreground-muted:    oklch(55% 0.008 280);
--foreground-subtle:   oklch(70% 0.005 280);
--foreground-disabled: oklch(76% 0.004 280);
--foreground-inverted: oklch(100% 0 0);
```

**Borders**
```css
--border-subtle: oklch(92% 0.008 280);
--border:        oklch(87% 0.010 280);
--border-strong: oklch(77% 0.013 280);
--border-focus:  oklch(52% 0.27 280);
```

**Overlay**
```css
--overlay: oklch(0% 0 0 / 0.5);
--scrim:   oklch(0% 0 0 / 0.25);
```

**Status**
```css
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
```

**Component tokens (unchanged values)**
```css
--input-bg:           oklch(100% 0.002 280);
--input-border:       oklch(87% 0.010 280);
--input-placeholder:  oklch(70% 0.005 280);
--badge-neutral-bg:   oklch(91% 0.008 280);
--badge-neutral-text: oklch(35% 0.012 280);
```

---

## Dark Theme — Full Token Values

**Primary — Violet (lightened for dark bg)**
```css
--primary:            oklch(65% 0.25 280);
--primary-hover:      oklch(70% 0.25 280);
--primary-active:     oklch(75% 0.25 280);
--primary-foreground: oklch(100% 0 0);
--primary-subtle:     oklch(28% 0.10 280);
--primary-muted:      oklch(33% 0.13 280);
```

**Surfaces — Obsidian Indigo**
```css
--background:           oklch(16% 0.025 270);
--surface-sunken:       oklch(13% 0.022 270);
--surface:              oklch(20% 0.025 270);
--surface-raised:       oklch(24% 0.025 270);
--surface-overlay:      oklch(27% 0.028 270);
--surface-hover:        oklch(24% 0.025 270);
--surface-active:       oklch(27% 0.025 270);
--surface-tinted:       oklch(24% 0.040 275);
--surface-tinted-deep:  oklch(21% 0.038 275);
```

**Navigation**
```css
--nav:        oklch(13% 0.022 270);
--nav-hover:  oklch(17% 0.022 270);
--nav-active: oklch(20% 0.025 270);
--nav-border: oklch(22% 0.020 270);
```

**Foreground**
```css
--foreground:           oklch(93% 0.006 280);
--foreground-secondary: oklch(73% 0.010 280);
--foreground-muted:     oklch(52% 0.007 280);
--foreground-subtle:    oklch(40% 0.005 280);
--foreground-disabled:  oklch(35% 0.004 280);
--foreground-inverted:  oklch(16% 0.025 270);
```

**Borders**
```css
--border-subtle: oklch(24% 0.020 270);
--border:        oklch(30% 0.022 270);
--border-strong: oklch(40% 0.018 270);
--border-focus:  oklch(65% 0.25 280);
```

**Overlay**
```css
--overlay: oklch(0% 0 0 / 0.65);
--scrim:   oklch(0% 0 0 / 0.35);
```

**Status**
```css
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
```

**Component tokens**
```css
--input-bg:           oklch(18% 0.022 270);
--input-border:       oklch(30% 0.022 270);
--input-placeholder:  oklch(48% 0.007 280);
--badge-neutral-bg:   oklch(26% 0.020 270);
--badge-neutral-text: oklch(74% 0.009 280);
```

---

## Table Header Patch

**Before** (`_header.scss`):
```scss
background: linear-gradient(
  to bottom,
  color-mix(in srgb, var(--ui-surface) 92%, var(--ui-primary) 8%),
  color-mix(in srgb, var(--ui-surface) 85%, var(--ui-info) 15%)
);
border-bottom: 1px solid color-mix(in oklch, var(--ui-primary) 25%, var(--ui-border) 75%);
```

**After**:
```scss
background: linear-gradient(
  to bottom,
  var(--ui-surface-tinted),
  var(--ui-surface-tinted-deep)
);
border-bottom: 1px solid var(--ui-border-strong);
```

---

## tokens.css Changes

`libs/ui/src/styles/tokens.css` mirrors `theme.css` raw values as fallbacks. For each `--ui-*` token the fallback value is updated to match the new palette. Two new entries are added:

```css
--ui-surface-tinted:      var(--surface-tinted, oklch(96% 0.020 280));
--ui-surface-tinted-deep: var(--surface-tinted-deep, oklch(93% 0.025 280));
```

---

## Out of Scope

- Component logic, props, or templates — untouched
- SCSS structure — untouched
- Radius, shadow, spacing tokens — untouched
- Font tokens — untouched
