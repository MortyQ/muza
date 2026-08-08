/**
 * Breakpoint helpers. Every function takes an explicit width and returns a
 * plain value — nothing here caches the viewport, so callers decide whether
 * they want a snapshot or a live reading.
 */

export const BREAKPOINTS = {
  SM: 640,
  MD: 768,
  LG: 1024,
  XL: 1280,
  "2XL": 1536,
  "3XL": 1920,
  ULTRA: 2560,
  "4K": 3440,
} as const;

/** "xs" is below the smallest breakpoint; the rest are named after the one reached. */
export type BreakpointName
  = | "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "ultra" | "4k";

/** Width assumed when there is no window (SSR, tests). */
export const FALLBACK_VIEWPORT_WIDTH = 1920;

export function getViewportWidth(): number {
  return typeof window === "undefined" ? FALLBACK_VIEWPORT_WIDTH : window.innerWidth;
}

/**
 * Name of the largest breakpoint the width has reached, Tailwind-style:
 * 640 is the point at which a width becomes "sm", so 700 is "sm", not "md".
 */
export function getBreakpointName(width: number = getViewportWidth()): BreakpointName {
  if (width >= BREAKPOINTS["4K"]) return "4k";
  if (width >= BREAKPOINTS.ULTRA) return "ultra";
  if (width >= BREAKPOINTS["3XL"]) return "3xl";
  if (width >= BREAKPOINTS["2XL"]) return "2xl";
  if (width >= BREAKPOINTS.XL) return "xl";
  if (width >= BREAKPOINTS.LG) return "lg";
  if (width >= BREAKPOINTS.MD) return "md";
  if (width >= BREAKPOINTS.SM) return "sm";
  return "xs";
}

export type ResponsiveValues<T> = {
  xs?: T
  sm?: T
  md?: T
  lg?: T
  xl?: T
  "2xl"?: T
  "3xl"?: T
  ultra?: T
  "4k"?: T
  default: T
};

/** Largest first, so lookup walks down to the nearest defined smaller value. */
const FALLBACK_ORDER: BreakpointName[] = [
  "4k",
  "ultra",
  "3xl",
  "2xl",
  "xl",
  "lg",
  "md",
  "sm",
  "xs",
];

/**
 * Pick the value for the current breakpoint, falling back down the scale to
 * the nearest smaller breakpoint that defines one.
 */
export function getResponsiveValue<T>(
  values: ResponsiveValues<T>,
  width: number = getViewportWidth(),
): T {
  const startIndex = FALLBACK_ORDER.indexOf(getBreakpointName(width));

  for (let i = startIndex; i < FALLBACK_ORDER.length; i++) {
    const value = values[FALLBACK_ORDER[i]];
    if (value !== undefined) return value;
  }

  return values.default;
}

/**
 * Scale a value linearly with viewport width, optionally clamped.
 *
 * @example
 * getScaledValue(150, 1920, 100, 300)
 * // 1920px -> 150, 2560px -> 200, 3840px -> 300 (clamped)
 */
export function getScaledValue(
  baseValue: number,
  baseWidth = 1920,
  minValue?: number,
  maxValue?: number,
  width: number = getViewportWidth(),
): number {
  let result = Math.round(baseValue * (width / baseWidth));

  if (minValue !== undefined) result = Math.max(result, minValue);
  if (maxValue !== undefined) result = Math.min(result, maxValue);

  return result;
}

/** Each entry matches exactly the range that getBreakpointName reports. */
export const MEDIA_QUERIES = {
  xs: `(max-width: ${BREAKPOINTS.SM - 1}px)`,
  sm: `(min-width: ${BREAKPOINTS.SM}px) and (max-width: ${BREAKPOINTS.MD - 1}px)`,
  md: `(min-width: ${BREAKPOINTS.MD}px) and (max-width: ${BREAKPOINTS.LG - 1}px)`,
  lg: `(min-width: ${BREAKPOINTS.LG}px) and (max-width: ${BREAKPOINTS.XL - 1}px)`,
  xl: `(min-width: ${BREAKPOINTS.XL}px) and (max-width: ${BREAKPOINTS["2XL"] - 1}px)`,
  "2xl": `(min-width: ${BREAKPOINTS["2XL"]}px) and (max-width: ${BREAKPOINTS["3XL"] - 1}px)`,
  "3xl": `(min-width: ${BREAKPOINTS["3XL"]}px) and (max-width: ${BREAKPOINTS.ULTRA - 1}px)`,
  ultra: `(min-width: ${BREAKPOINTS.ULTRA}px) and (max-width: ${BREAKPOINTS["4K"] - 1}px)`,
  "4k": `(min-width: ${BREAKPOINTS["4K"]}px)`,

  minSm: `(min-width: ${BREAKPOINTS.SM}px)`,
  minMd: `(min-width: ${BREAKPOINTS.MD}px)`,
  minLg: `(min-width: ${BREAKPOINTS.LG}px)`,
  minXl: `(min-width: ${BREAKPOINTS.XL}px)`,
  min2Xl: `(min-width: ${BREAKPOINTS["2XL"]}px)`,
  min3Xl: `(min-width: ${BREAKPOINTS["3XL"]}px)`,
  minUltra: `(min-width: ${BREAKPOINTS.ULTRA}px)`,
  min4K: `(min-width: ${BREAKPOINTS["4K"]}px)`,
} as const;
