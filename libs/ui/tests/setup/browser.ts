// Order matters: theme.css compiles Tailwind and defines the raw per-theme
// variables, tokens.css maps them onto --ui-*. Importing only tokens.css would
// silently pass every dark-theme assertion, because its var() fallbacks are
// the light values.
import "@muzakit/config/tailwind/theme.css";
import "../../src/styles/tokens.css";

// Self-hosted, so rendering does not depend on Google Fonts being reachable.
// The app loads the same family from a CDN; here determinism wins.
import "@fontsource/plus-jakarta-sans/300.css";
import "@fontsource/plus-jakarta-sans/400.css";
import "@fontsource/plus-jakarta-sans/500.css";
import "@fontsource/plus-jakarta-sans/600.css";
import "@fontsource/plus-jakarta-sans/700.css";

import { addCollection } from "@iconify/vue";
import { icons as lucide } from "@iconify-json/lucide";
import { icons as mdi } from "@iconify-json/mdi";
import { beforeEach } from "vitest";

// Without a local collection, @iconify/vue fetches over the network on first
// use: the first screenshot has no glyph and the second does.
addCollection(lucide);
addCollection(mdi);

const deterministic = document.createElement("style");
deterministic.textContent = `
  *, *::before, *::after {
    animation: none !important;
    transition: none !important;
  }
  /* A blinking caret in a focused input is a coin flip per screenshot. */
  * { caret-color: transparent !important; }
  /* Scrollbar width differs by platform and shifts everything beside it. */
  ::-webkit-scrollbar { display: none; }
  html { scrollbar-width: none; }
  body { margin: 0; background: var(--ui-background); }
`;
document.head.appendChild(deterministic);

beforeEach(async () => {
  await document.fonts.ready;
});
