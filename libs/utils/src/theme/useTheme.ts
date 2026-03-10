import { ref, watch } from "vue";

import { type ThemeType, THEMES, DEFAULT_THEME, THEME_STORAGE_KEY } from "./types";

// Module-level singleton — one reactive state across all useTheme() calls
const activeTheme = ref<ThemeType>(loadStoredTheme());

function loadStoredTheme(): ThemeType {
  if (typeof window === "undefined") return DEFAULT_THEME;
  const stored = localStorage.getItem(THEME_STORAGE_KEY) as ThemeType | null;
  if (stored && THEMES.includes(stored)) return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : DEFAULT_THEME;
}

watch(
  activeTheme,
  (theme) => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  },
  { immediate: true },
);

export function useTheme() {
  function setTheme(theme: ThemeType): void {
    activeTheme.value = theme;
  }

  function toggleTheme(): void {
    const i = THEMES.indexOf(activeTheme.value);
    activeTheme.value = THEMES[(i + 1) % THEMES.length];
  }

  return { theme: activeTheme, setTheme, toggleTheme };
}
