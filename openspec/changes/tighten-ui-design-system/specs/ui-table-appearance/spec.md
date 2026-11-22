# Spec Delta

## Purpose

The table's resting look: how a pinned column is marked, how fast a row answers the pointer, and when
highlighting dims the rest of the table. These keep a dense table readable and responsive.

## ADDED Requirements

### Requirement: A pinned column keeps a quiet accent
A fixed (pinned) column SHALL be marked with a 1px edge in the accent at 55% and a 3% accent tint on
its cells. On row hover the edge SHALL rise to 85%. Vertical cell rules, header and total-row
gradients and sort icons stay as they are.

#### Scenario: Pinned column at rest
- **WHEN** a table renders with a left-fixed column
- **THEN** that column's last cell carries a 1px right edge in `--ui-primary` at 55% and its cells a 3% `--ui-primary` tint over `--ui-surface`

#### Scenario: Row hover
- **WHEN** the pointer is over a row
- **THEN** that row's fixed-column edge is `--ui-primary` at 85%

### Requirement: Rows answer hover at once
Hover and press feedback on table cells and header cells (the colour change) SHALL use the
`instant` duration (80ms). The highlight dim, an opacity fade, is an in-place change on `fast`.

#### Scenario: Hover duration
- **WHEN** the colour layers of a table cell's transition are read
- **THEN** each runs 80ms on the library's ease-out curve

#### Scenario: Highlight fade
- **WHEN** a table with `highlight` on dims or restores a row
- **THEN** the opacity change runs on the fast step (150ms), both when a pin is set and when the last pin is removed

### Requirement: Highlight dims only around a pin
With highlight enabled, rows and columns SHALL dim only while a row or a column is pinned. With
nothing pinned the table SHALL render at full opacity.

#### Scenario: Highlight enabled, nothing pinned
- **WHEN** a table has `highlight` enabled and no row or column is pinned
- **THEN** every body cell has opacity 1

#### Scenario: A row is pinned
- **WHEN** a row is pinned
- **THEN** cells outside the pinned row and pinned column are dimmed, and the pinned cross is not

#### Scenario: Pin removed
- **WHEN** the last pin is removed
- **THEN** every body cell returns to opacity 1
