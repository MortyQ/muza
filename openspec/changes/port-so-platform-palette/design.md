# Design

## Context

There are two layers of colour (`ui-component-migration.md`, Step 6):
- `libs/config/src/tailwind/theme.css` holds the raw variables (`--primary`, `--surface`, …) for
  `:root[data-theme="light"]` and `:root[data-theme="dark"]`;
- `libs/ui/src/styles/tokens.css` wraps each one as `--ui-*: var(--raw, <light fallback>)`.

Components read only `--ui-*`. A palette change is therefore a change of values in those two files,
and no component is touched.

so-platform's values come from its shared Tailwind preset. The review artifact compared them pair
by pair, and the owner chose a value for every pair that fails (proposal.md, What Changes).

No component decomposition is involved. Of the repo skills, `emil-design-eng` applies to judging
the result on the dashboard. `vtable` and `use-api` do not apply.

## Goals / Non-Goals

**Goals:**
- One edit per raw variable, in both themes, with the value traceable to a Tailwind step.
- Every pair named in the spec checked by a script before commit, not by eye.

**Non-Goals:**
- No new tokens or roles. The accent roles in `ui-component-migration.md` stay as they are.
- No change to which token a component reads. The secondary button, label and border fixes from
  `fix/contrast-and-lighthouse` stay in place, and they become more robust with this palette.

## Decisions

### 1. Values written as `oklch()` with the hex in a comment

**[ADVOCATE]** `theme.css` is oklch end to end. The `color-mix(in oklch, …)` tints in every
component assume perceptual mixing. And the hex comment keeps every value matchable against
so-platform's preset.

**[SKEPTIC]**
- Hex would be a literal copy of so-platform and easier to diff.
- An oklch conversion rounds, so a value can be a hair off the Tailwind step.

**[VERDICT]** Use oklch with one decimal of lightness and three of chroma. At that precision the
rounding error is below one 8-bit step. Write `/* sky-700 #0369a1 */` beside each value. The
conversion is scripted, not hand-typed.

### 2. In-between values only where a minimum demands it

**[ADVOCATE]** Taking a value between two steps hits the minimum exactly. The field border sits at
3.0:1 and is no heavier, and muted text sits at 4.6:1 without dropping to slate-600.

**[SKEPTIC]**
- An off-scale value has no Tailwind name.
- so-platform code that later writes `slate-500` by hand will not match muzakit's muted text.

**[VERDICT]** Allow three off-scale values, each with its reason in a comment:
- the field border in each theme;
- light muted text (decision B below).

Everything else is an exact Tailwind step.

### 3. Dark text on light dark-theme fills

**[ADVOCATE]**
- The owner chose dark text on the light fills (choices 2 and 4).
- so-platform's dark fills (sky-400, green-400, …) are light, so white text on them fails at 1.7–2.1:1.
- Dark text keeps so-platform's dark-theme colours exactly.

**[SKEPTIC]** In the dark theme, `--ui-primary-foreground` becomes dark. Anything that assumed it
is white flips with it. Two examples are the checkbox mark and the toast action.

**[VERDICT]** Accept it. That flip is the purpose of the token. A component that needs white
regardless of the fill is wrong to read `*-foreground`. During apply, every component that reads
a `*-foreground` token is checked in the dark theme. That list is found with a grep, not taken from
memory.

### 4a. Contrast is asserted by a test, not by a one-off script

**[ADVOCATE]** The spec states ratios. A unit spec that parses `theme.css`, converts each oklch
value to sRGB and computes the WCAG ratio for the spec's pairs keeps them true after this change.
The next palette tweak fails CI instead of passing silently.

**[SKEPTIC]**
- It is a colour-space conversion living in a test.
- If the parsing is too clever, it breaks on a formatting change.

**[VERDICT]** Write it: about 40 lines of OKLab maths. Read only the two theme blocks, by selector.
It sits beside `conventions.spec.ts`, which already reads source files as text. The token contracts
still cover "the component uses the token". This test covers "the token's value is legible".

### 4. Owner decisions A and B (accepted 2026-11-24)

These two pairs fail only after the port. They are not in the owner's original eight choices.

| | Pair | as ported | proposed | ratio after |
|---|---|---|---|---|
| A | danger text on danger-subtle, light | `#dc2626` 4.41:1 | red-700 `#b91c1c`, hover red-800 `#991b1b` | 5.9:1 (6.5:1 under white text) |
| B | muted text on page background, light | `#64748b` 4.34:1 | `oklch(54% 0.041 257)` | 4.6:1 on the page, 5.0:1 on a card |

**[ADVOCATE]**
- Both proposals are within one step of what was chosen.
- They make the spec's 4.5:1 rule hold without an exception list.
- A also puts danger on the same 700 step as success and info.

**[SKEPTIC]**
- A departs from the owner's explicit "danger 600", which is so-platform's own `error-dark`.
- B adds a third off-scale value.

**[VERDICT]** Recommended both; the owner accepted both. The spec's 4.5:1 rule holds with no
exceptions.

### 5. Elevation retinted, not redesigned

The two shadow levels and their geometry stay. Only the hue changes:
- light shadows move from 280 to slate 257;
- the dark glow moves from 280 to sky 237;
- the alpha values stay.

A violet glow under sky controls would be the one remnant of the old brand.

## Risks / Trade-offs

- **[Risk] A tint mixed toward a surface looks different on slate than on violet-grey.** Examples are
  the table's header gradient and pinned-row tints. → Mitigation: check `/table-demo` in both themes
  during apply, as `testing.md` requires for anything a token contract cannot see.
- **[Risk] The dark `surface-sunken` equals the dark `background`** (`#0f172a`), as it does in
  so-platform. A sunken well on the bare page will not read as sunken. → Mitigation: accept it,
  because it matches so-platform. Flag any place where it reads as broken during the visual check.
- **[Risk] The dark `surface-hover` equals `surface-raised`** (`#334155`). → Mitigation: same as
  above. A hover on a raised surface shows no change; flag it if any component relies on that hover.
- **[Risk] The token-contract cache.** Vite's transform cache can serve the old colour after a
  `tokens.css` edit (`testing.md`, trap 1). → Mitigation: clear `libs/ui/node_modules/.vite` before
  `test:tokens`.

## Migration Plan

The work is a single commit set on its own branch. Rolling back means reverting it: no data,
storage or API is involved.
