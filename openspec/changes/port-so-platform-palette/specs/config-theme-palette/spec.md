# Spec Delta

## Purpose

The theme in `@muzakit/config` gives every `--ui-*` colour token its value in the light and dark
themes. This spec fixes which palette that is and the contrast every text and control pair must
reach.

## ADDED Requirements

### Requirement: The palette is so-platform's
The theme SHALL draw its colours from so-platform's palette. In both themes:
- the accent SHALL be from Tailwind's sky scale;
- neutrals (background, surfaces, text, borders, navigation) SHALL be from the slate scale;
- each status SHALL be from its own scale: green, amber, red and cyan.

A value MAY sit between two steps of its scale only where a contrast requirement below demands it.

#### Scenario: Page and card in the light theme
- **WHEN** the dashboard renders in the light theme
- **THEN** the page background is `#f1f5f9` and a card surface is `#ffffff`

#### Scenario: Page and card in the dark theme
- **WHEN** the dashboard renders in the dark theme
- **THEN** the page background is `#0f172a` and a card surface is `#1e293b`

#### Scenario: No violet remains
- **WHEN** the theme's colour variables are read in either theme
- **THEN** none of them has a hue in the violet range the previous palette used (hue 270–280)

### Requirement: Text meets 4.5:1
Text SHALL reach at least 4.5:1 against the surface it is drawn on, in both themes. This holds for:
- the primary, secondary and muted foregrounds on the page background and on a card;
- each status colour, and the accent, used as text on a card and on its own subtle background;
- each `*-foreground` token on its fill.

#### Scenario: Button text on the accent
- **WHEN** a primary button is drawn in either theme
- **THEN** its label reaches at least 4.5:1 against its fill
- **AND** in the dark theme the label is dark (`#0f172a`) on the light sky fill

#### Scenario: Status as text
- **WHEN** a success, warning, danger or info colour is used as text on a card or on its own subtle background, in either theme
- **THEN** the contrast is at least 4.5:1

#### Scenario: Muted text on the bare page
- **WHEN** muted foreground text sits directly on the light page background
- **THEN** the contrast is at least 4.5:1

### Requirement: Controls and focus meet 3:1
The field border SHALL reach at least 3:1 against the field background, in both themes. So SHALL
the focus border and the focus ring against the surface around them. The field border SHALL NOT be
drawn darker than it needs to be to reach that minimum.

#### Scenario: Resting field
- **WHEN** an input is shown at rest in either theme
- **THEN** its border reaches at least 3:1 and at most 3.2:1 against the field background

### Requirement: Navigation is the darkest plane
The navigation sidebar SHALL be dark in both themes. In the dark theme it SHALL be darker than the
page background, so the sidebar separates from the page without relying on its border.

#### Scenario: Dark theme sidebar
- **WHEN** the dashboard renders in the dark theme
- **THEN** the sidebar is `#020617` and the page background is `#0f172a`

### Requirement: Elevation follows the palette
Shadows SHALL be tinted from the palette in use. The light shadow SHALL use the neutral (slate) hue.
The dark glow SHALL use the accent's hue.

#### Scenario: Dark floating surface
- **WHEN** a modal or dropdown floats in the dark theme
- **THEN** its glow carries the sky accent's hue, not violet

### Requirement: Fallbacks match the light theme
The fallback value of each `--ui-*` colour token in `@muzakit/ui`'s `tokens.css` SHALL equal that
variable's light-theme value. A consumer that loads no theme then renders the same palette as one
that does.

#### Scenario: Consumer without the theme
- **WHEN** `muzakit-starter-without-tailwind` renders a primary button
- **THEN** the button has the same colours as in the dashboard's light theme
