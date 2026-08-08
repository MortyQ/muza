export interface ResponsiveColumnConfig {
  MIN_COLUMN_WIDTH: number
  DEFAULT_MIN_WIDTH: number
  DEFAULT_COLUMN_WIDTH: number
}

/**
 * Column sizing defaults.
 *
 * These are deliberately flat, not scaled by viewport. so-platform ramps them
 * up on wide screens, but its ramp labels 1920px as "ultra" and hands back
 * DEFAULT_COLUMN_WIDTH 270 / DEFAULT_MIN_WIDTH 190 — roughly 1.8x today's
 * columns on the most common desktop width. Adopting it would have silently
 * rewidened every existing table.
 *
 * Breakpoint helpers live in @muzakit/utils if a scaled variant is ever wanted;
 * it should be introduced as an opt-in prop, not as a change to the defaults.
 */
export const RESPONSIVE_COLUMN_CONFIG: ResponsiveColumnConfig = {
  MIN_COLUMN_WIDTH: 100,
  DEFAULT_MIN_WIDTH: 100,
  DEFAULT_COLUMN_WIDTH: 150,
};
