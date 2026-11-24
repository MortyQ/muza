# Proposal

## Why

muzakit is moving into `so-platform/libs` and will replace `@app/core` there. Today the two
codebases have different palettes: muzakit is violet (hue 280), and so-platform is sky and slate
(Tailwind's own scales). A screen built from `@muzakit/ui` inside so-platform should look like the
rest of so-platform. So muzakit takes so-platform's colours before the move, not after it.

The port is not a straight copy. Several so-platform pairs fail WCAG contrast. Two examples: white
text on its `#0ea5e9` accent is 2.8:1, and its amber warning as text is 2.2:1. The owner reviewed
each failing pair side by side and chose a value for it. This change records those choices and
applies them.

## What Changes

- **Light and dark palettes** in `libs/config/src/tailwind/theme.css`. Every colour variable moves
  from violet to so-platform's sky (accent) and slate (neutrals). Values stay in `oklch()`, as the
  file's convention requires; each one carries its Tailwind hex in a comment, so a reader can match
  it against so-platform.
- **The owner's choices where so-platform fails contrast:**

  | # | Pair | Choice |
  |---|---|---|
  | 1 | Light accent | sky-700 `#0369a1` (5.9:1 under white text) |
  | 2 | Dark: text on the accent | dark text `#0f172a` (8.3:1); the fill stays sky-400 |
  | 3 | Light statuses | success-700 `#15803d`, danger-600 `#dc2626`, info-700 `#0e7490` |
  | 4 | Dark: text on statuses | dark text `#0f172a` (6.4–10.7:1) |
  | 5 | Dark status subtles | step 950, with step 900 as the muted step and the border |
  | 6 | Warning | amber-700 `#b45309`; white text on it and as text, 5.0:1 |
  | 7 | Field border | one step darker than so-platform, raised to exactly 3:1 (see below) |
  | 8 | Dark navigation | `#020617`, darker than the `#0f172a` page |

- **Field border (choice 7).** The owner picked "one step darker" (`#cbd5e1` / `#475569`). But the
  same review asked for the field border to meet its 3:1 minimum, and `#cbd5e1` on white is only
  1.5:1. The change uses the slate value that reaches exactly 3:1 instead:
  - light: `oklch(66.5% 0.030 257)`, between slate-400 and slate-500;
  - dark: `oklch(50.5% 0.030 257)`, between slate-600 and slate-500.

  The "strict 3:1" option in the review artifact (`#94a3b8`) was wrong. It measures 2.56:1, not 3:1.
- **Two new contrast failures that the port introduces.** The owner accepted both proposals
  (2026-11-24):
  - **A. Danger text on its subtle background, light theme.** `#dc2626` on `#fef2f2` is 4.41:1,
    below 4.5:1. **Accepted:** danger-700 `#b91c1c`, hover `#991b1b`. That gives 5.9:1 on the
    subtle background and 6.5:1 under white text. The alternative is to keep danger-600 and accept
    4.41:1 in soft chips and notices.
  - **B. Muted text on the page background, light theme.** slate-500 `#64748b` on `#f1f5f9` is
    4.34:1. On a card it passes at 4.76:1. **Accepted:** `oklch(54% 0.041 257)`, a hair darker than
    slate-500, which gives 4.6:1 on the page and 5.0:1 on a card. The alternative is to keep
    slate-500 and accept the shortfall on the bare page.
- **Dark hover direction (decision C, owner accepted 2026-11-24, found during apply).**
  so-platform's dark `-hover` is one step *darker* than the fill (sky-400 → sky-500). muzakit's
  tonal buttons, tags, chips and active nav item write their text in `-hover`, which drops it to
  3.1–4.5:1 on a tonal fill (danger worst). The dark `-hover` is therefore the 300 step and the
  accent's `-active` the 200 step; every fill stays so-platform's. That gives 6.2–8.6:1.
- **Dark layering (decision D, owner asked for it after seeing the port, 2026-11-24).** In
  so-platform's dark palette `--border-subtle` equals `--surface` and `--surface-sunken` equals
  `--background`. The dashboard's content panel was `--surface` too, so cards and tables merged into
  the page and their edges vanished. The fix:
  - the dashboard's content panel takes `--background`, which also makes the light page the
    `#f1f5f9` the owner liked;
  - the dark `--surface-sunken` is slate-950;
  - the dark `--border-subtle` is `oklch(33% 0.038 259)`, between slate-800 and slate-700.
- **Elevation tint.** The shadows follow the palette.
  - The light shadow takes the slate hue (257) instead of violet.
  - The dark glow takes the accent's hue (237) instead of the brand violet.
- **Fallbacks.** The light fallbacks in `libs/ui/src/styles/tokens.css` follow the new light values.
  A consumer that loads no theme, such as `muzakit-starter-without-tailwind`, then renders the same
  palette.
- **Docs.** `ui-component-migration.md` says the dark shadows are "tinted with the brand violet".
  That line, and the matching comment in `theme.css`, describe the new tint.

This is not **BREAKING** for the API: no `--ui-*` token is renamed, added or removed. It is a
visual break. Every consumer looks different afterwards, which is the purpose of the change.

## Capabilities

### New Capabilities
- `config-theme-palette`: the colour values that `@muzakit/config`'s theme gives every `--ui-*`
  colour token in both themes, and the contrast minimums those values must meet.

### Modified Capabilities

None. `openspec/specs/` holds no living spec yet.

## Impact

- **Packages:**
  - `@muzakit/config`: `theme.css`, the palette itself;
  - `@muzakit/ui`: `tokens.css` fallbacks, plus a `CHANGELOG.md` entry under "Changed";
  - `muzakit-dashboard`: the content panel in `DefaultLayout.vue` takes `bg-background`;
  - the starter: no code change, a new look.
- **Public API of `@muzakit/ui`:** unchanged; same token names, new values.
- **Tests:**
  - Token contracts read tokens rather than pinned colours, so they keep passing by construction.
  - `tests/setup/tokens.ts` quotes `oklch(52% 0.27 280)` in a comment only; it gets updated.
  - No unit spec pins a palette colour.
- **Out of scope:**
  - `VAnimatedBackground`'s default blob colours. They are `rgba()` literals that are already blue,
    amber, sky and green, not violet, and the dashboard passes none.
  - The table header and total-row gradients and the avatar palette. These are owner-kept uses
    outside the accent roles, and they follow `--ui-primary` on their own.
  - Later migration phases:
    - removing `:root { font-family }` from `tokens.css`;
    - package naming and the `GlobalComponents` conflict;
    - Tailwind v4 in so-platform;
    - the tools-client freeze.
