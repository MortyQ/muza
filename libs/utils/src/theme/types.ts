/**
 * All available theme names.
 * To add a new theme:
 *   1. Add its name here (e.g. | "ocean")
 *   2. Add :root[data-theme="ocean"] block in libs/config/src/tailwind/theme.css
 *   That's all — no other changes needed.
 */
export type ThemeType = "light" | "dark";

export const THEMES: ThemeType[] = ["light", "dark"];
export const DEFAULT_THEME: ThemeType = "light";
export const THEME_STORAGE_KEY = "muzakit-theme";
