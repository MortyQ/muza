import { nextTick } from "vue";

import { useTheme, type ThemeType } from "@muzakit/utils";

export const THEME_CASES: ReadonlyArray<ThemeType> = ["light", "dark"];

/**
 * Switch themes the way the app does, through the `useTheme` singleton.
 *
 * Writing `document.documentElement.dataset.theme` directly would work until
 * something else touches the singleton: `libs/utils/src/theme/useTheme.ts` runs
 * a module-level `watch(..., { immediate: true })` that owns that attribute and
 * would overwrite a hand-set value on its next flush.
 *
 * The watcher flushes on `pre`, so the await is required — without it the
 * attribute is still on the previous theme when the caller reads styles.
 */
export async function applyTheme(theme: ThemeType): Promise<void> {
  const { setTheme } = useTheme();
  setTheme(theme);
  await nextTick();
}
