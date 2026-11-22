# Spec Delta

## Purpose

Keyboard users can see where focus is and reach help text without a pointer, and decorative graphics
stay out of what assistive technology reads.

## ADDED Requirements

### Requirement: A switch shows keyboard focus
`VSwitch` SHALL draw a visible focus ring in `--ui-ring` around its track when its input receives
keyboard focus. The ring SHALL appear instantly.

#### Scenario: Tab onto a switch
- **WHEN** the user moves focus to a switch with the Tab key
- **THEN** a ring in `--ui-ring` is drawn around the track, without a transition

#### Scenario: Pointer click
- **WHEN** the user clicks a switch with the pointer
- **THEN** no focus ring is drawn

### Requirement: A tooltip opens on focus without delay
`VTooltip` SHALL open immediately when its trigger receives keyboard focus. The hover delay applies
to the pointer only.

#### Scenario: Focus the trigger
- **WHEN** a tooltip's trigger receives keyboard focus
- **THEN** the tooltip opens with no delay

#### Scenario: Hover the trigger
- **WHEN** the pointer rests on the trigger
- **THEN** the tooltip opens after its configured hover delay

### Requirement: Decorative graphics are hidden
A decorative `svg` or `canvas` in the library SHALL carry `aria-hidden="true"`. A graphic that
conveys meaning SHALL carry an accessible name instead.

#### Scenario: Column setup icons
- **WHEN** the column setup panel renders its decorative icons
- **THEN** each of those svgs has `aria-hidden="true"`

#### Scenario: Animated background
- **WHEN** `VAnimatedBackground` renders its canvas
- **THEN** the canvas has `aria-hidden="true"`
