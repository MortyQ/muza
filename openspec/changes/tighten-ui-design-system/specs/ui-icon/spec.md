# Spec Delta

## Purpose

Fixes `VIcon`'s default size and how an icon aligns with the text beside it, so icons across the
library sit on one size and one optical line.

## ADDED Requirements

### Requirement: Default icon size is 16px
`VIcon` SHALL render at 16×16px when no `size` is given. An explicit `size` SHALL still override it.

#### Scenario: No size given
- **WHEN** `VIcon` renders with only an `icon` prop
- **THEN** its svg is 16px wide and 16px tall

#### Scenario: Explicit size
- **WHEN** `VIcon` renders with `size` 20
- **THEN** its svg is 20px wide and 20px tall

### Requirement: Icons centre on their line of text
An icon placed inline next to text SHALL be vertically centred on that text's line box, not
baseline-aligned.

#### Scenario: Icon beside a label
- **WHEN** a 16px icon sits next to `base`-size text inside a flex row
- **THEN** the icon's vertical centre is within 1px of the text line box's vertical centre
