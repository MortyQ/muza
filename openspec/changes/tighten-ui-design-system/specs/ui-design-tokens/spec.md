# Spec Delta

## Purpose

Defines the token scales `@muzakit/ui` exposes: spacing, radius, type, tracking, elevation, motion
and accent roles. It also requires that the library's own styles take every such value from those
scales, so the system stays tight without relying on review.

## ADDED Requirements

### Requirement: Spacing scale on a 4px grid
The library SHALL expose spacing tokens of 2, 4, 6, 8, 12, 16, 24, 32 and 40px. Every step from 8px
up SHALL be a multiple of 4. 2 and 6px are the only half steps.

#### Scenario: Scale values
- **WHEN** the spacing tokens are resolved in either theme
- **THEN** they compute to exactly 2, 4, 6, 8, 12, 16, 24, 32 and 40px, and no other spacing token exists

### Requirement: Component spacing comes from tokens
Every `gap`, `padding` and `margin` in the library's stylesheets SHALL use spacing or control tokens,
`0`, or `calc()` over them. The only literal allowed is ±1px border compensation.

#### Scenario: Literal spacing is rejected
- **WHEN** a library stylesheet declares `padding: 10px` or `gap: 0.75rem`
- **THEN** the stylesheet guard fails and names the file and the declaration

#### Scenario: Border compensation is allowed
- **WHEN** a stylesheet declares `margin-top: -1px` to overlap a border
- **THEN** the guard passes

### Requirement: Nested corners follow outer = inner + padding
An element that has rounded corners and sits inside a rounded container with padding SHALL take an
inner radius equal to the container's radius minus that padding, expressed with tokens.

#### Scenario: Segmented control pill
- **WHEN** a segmented control's track has radius `lg` and padding `2xs`
- **THEN** its selected pill's radius computes to the track radius minus the track padding

### Requirement: Component radii come from tokens
Every `border-radius` in the library's stylesheets SHALL use a radius token, `0`, `50%`, or `calc()`
over tokens. The only exception is a hairline mark of 1 or 2px, which must be listed by file in the
guard's allow-list.

#### Scenario: Literal radius is rejected
- **WHEN** a stylesheet that is not on the allow-list declares `border-radius: 0.375rem`
- **THEN** the stylesheet guard fails

### Requirement: Four working type sizes and one display size
The library SHALL expose exactly four working text sizes, `xs` 11px, `base` 13px, `lg` 15px and
`xl` 20px, each with a line height. It SHALL also expose one `display` size of 28px, which only the
headline-figure component may use.

#### Scenario: Removed steps are gone
- **WHEN** a consumer reads `--ui-text-2xs`, `--ui-text-sm`, `--ui-text-2xl` or `--ui-text-3xl`
- **THEN** the token is undefined

#### Scenario: Display is reserved for headline figures
- **WHEN** any stylesheet other than the headline figure's, or the skeleton that mirrors it, uses the `display` size
- **THEN** the stylesheet guard fails

### Requirement: Letter spacing comes from tokens
The library SHALL expose a `tight` tracking of -0.01em for body and UI text and a `caps` tracking of
0.04em for uppercase labels. Stylesheets SHALL set `letter-spacing` only from these tokens or `0`.

#### Scenario: Literal tracking is rejected
- **WHEN** a stylesheet declares `letter-spacing: 0.06em`
- **THEN** the stylesheet guard fails

### Requirement: Two elevation levels
The library SHALL expose two shadow tokens: `sm` for resting cards and `lg` for anything that floats
above the page (modal, drawer, dropdown, popover, tooltip, toast).

#### Scenario: Removed levels are gone
- **WHEN** a consumer reads `--ui-shadow-xs`, `--ui-shadow-md`, `--ui-shadow-xl` or `--ui-shadow-inner`
- **THEN** the token is undefined

#### Scenario: Floating surfaces use the large level
- **WHEN** a modal, drawer, dropdown menu, tooltip or toast is open
- **THEN** its computed `box-shadow` equals `--ui-shadow-lg` in both themes

### Requirement: Hover changes the surface, not the elevation
A hover or active state SHALL NOT change an element's `box-shadow`. Interactive feedback SHALL come
from the surface tokens.

#### Scenario: Hovering a card
- **WHEN** the pointer moves over an interactive card or row
- **THEN** its background changes to a surface token and its `box-shadow` is unchanged

### Requirement: Motion tokens without overshoot
The library SHALL expose durations of 80ms (`instant`, hover and press feedback), 150ms (`fast`,
in-place transitions) and 200ms (`overlay`, overlays entering), plus `ease-out` and `ease-in-out`
easings. Stylesheets SHALL take every duration and easing from them. No easing may overshoot.

#### Scenario: Literal duration is rejected
- **WHEN** a stylesheet declares `transition: opacity 0.3s ease`
- **THEN** the stylesheet guard fails

#### Scenario: No bounce
- **WHEN** any easing in the library is evaluated
- **THEN** none of its control points lies outside the 0–1 range on the progress axis

#### Scenario: Reduced motion
- **WHEN** the user prefers reduced motion
- **THEN** animated components settle without movement, as they do today

### Requirement: The accent colour has three roles
`--ui-primary` and its variants SHALL appear only on the primary action, on a current or selected
state (selected row, active nav item, current page, checked control, selected option or segment, a
pinned table column), and on focus indication. Every other element SHALL use neutral tokens.

#### Scenario: Decorative accent is neutral
- **WHEN** a component draws a non-interactive icon, a heading or a hover tint
- **THEN** it uses a foreground, muted or surface token, not `--ui-primary`

#### Scenario: Selected row
- **WHEN** a table row is selected
- **THEN** the row carries the accent, and the unselected rows around it carry none

### Requirement: Tailwind exposes only the system's steps
The shared Tailwind theme SHALL map only the design system's type and shadow steps and reset those
namespaces. A removed step then produces no utility rather than Tailwind's default value.

#### Scenario: Removed utility does not fall back
- **WHEN** app code uses `text-sm` or `shadow-md`
- **THEN** Tailwind generates no rule for it, instead of a 14px size or a black default shadow

### Requirement: Figures align as figures
Table cells SHALL render digits with tabular figures.

#### Scenario: Numbers line up
- **WHEN** a right-aligned numeric column shows 1,204 and 87
- **THEN** both values use tabular figures and their last digits align on the right edge

### Requirement: Toolbar controls share one chrome
A segmented control SHALL use the same background, border and shadow as the text field, select and
date picker, so controls standing in one toolbar row read as one set.

#### Scenario: Segmented control beside fields
- **WHEN** a segmented control sits in a toolbar row next to a search field, a select and a date picker
- **THEN** its track's computed background, border colour and box-shadow equal the field's, in both themes

#### Scenario: Selected segment
- **WHEN** a segment is selected
- **THEN** its pill is set off by a surface token, without a shadow
