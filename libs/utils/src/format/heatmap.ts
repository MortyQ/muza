/**
 * Heatmap colours resolved against the design-system tokens rather than raw
 * RGB, so they follow the active theme. Return values are CSS colour strings
 * meant to be bound to a custom property, never to a Tailwind class — a
 * dynamically built class name would never be emitted by the Tailwind scanner.
 */

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

/**
 * @param value   current value
 * @param max     value mapped to the "full" end of the scale
 * @param reverse invert the scale, so high values read as danger
 * @param alpha   opacity of the resulting colour, 0..1
 */
export function getHeatMapColor(
  value: number,
  max = 100,
  reverse = false,
  alpha = 0.4,
): string {
  const ratio = clamp01(max === 0 ? 0 : value / max);
  const successWeight = reverse ? 1 - ratio : ratio;

  const blended = `color-mix(in oklch, var(--ui-success) ${(successWeight * 100).toFixed(2)}%, var(--ui-danger))`;

  return `color-mix(in oklch, ${blended} ${(clamp01(alpha) * 100).toFixed(2)}%, transparent)`;
}

/**
 * Same scale expressed as a `background-color` declaration value, for binding
 * to a CSS custom property such as `--heatmap-bg`.
 */
export function getHeatMapBackground(value: number, max = 100, reverse = false): string {
  return getHeatMapColor(value, max, reverse);
}
