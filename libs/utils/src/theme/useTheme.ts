import { effectScope, ref, watch, type Ref } from "vue";

import { type ThemeType, THEMES, DEFAULT_THEME, THEME_STORAGE_KEY } from "./types";

export interface UseThemeReturn {
  theme: Ref<ThemeType>
  setTheme: (theme: ThemeType) => void
  toggleTheme: () => void
}

const isBrowser = (): boolean => typeof window !== "undefined" && typeof document !== "undefined";

const loadStoredTheme = (): ThemeType => {
  if (!isBrowser()) return DEFAULT_THEME;
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  const known = THEMES.find(theme => theme === stored);
  if (known) return known;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : DEFAULT_THEME;
};

// One reactive theme shared by every useTheme() call, created on the first one. Importing this
// module must not touch the page: @muzakit/ui imports @muzakit/utils for its formatters, and an
// app that never asks for the theme should keep its own `data-theme` and its own localStorage.
let activeTheme: Ref<ThemeType> | null = null;

const createThemeState = (): Ref<ThemeType> => {
  const theme = ref<ThemeType>(loadStoredTheme());
  // Detached from the calling component: the theme outlives whichever component asked first.
  effectScope(true).run(() => {
    watch(
      theme,
      (value) => {
        if (!isBrowser()) return;
        document.documentElement.dataset.theme = value;
        localStorage.setItem(THEME_STORAGE_KEY, value);
      },
      { immediate: true },
    );
  });
  return theme;
};

export const useTheme = (): UseThemeReturn => {
  activeTheme ??= createThemeState();
  const theme = activeTheme;

  const setTheme = (value: ThemeType): void => {
    theme.value = value;
  };

  const toggleTheme = (): void => {
    const index = THEMES.indexOf(theme.value);
    theme.value = THEMES[(index + 1) % THEMES.length] ?? DEFAULT_THEME;
  };

  return { theme, setTheme, toggleTheme };
};
