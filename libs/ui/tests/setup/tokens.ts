/**
 * Helpers for the token-contract layer: resolve what a `--ui-*` token is worth
 * right now, in whatever theme is active, and compare it against what the
 * browser actually computed for an element.
 *
 * Comparing raw strings does not work — `getPropertyValue("--ui-primary")`
 * returns the authored `oklch(52% 0.27 280)`, while `getComputedStyle(el)
 * .backgroundColor` returns the browser's serialisation. Both sides are pushed
 * through the same probe element so the browser does the normalising.
 */

let probe: HTMLElement | null = null;

function getProbe(): HTMLElement {
  if (!probe) {
    probe = document.createElement("div");
    probe.style.position = "absolute";
    probe.style.visibility = "hidden";
    probe.style.pointerEvents = "none";
    document.body.appendChild(probe);
  }
  return probe;
}

/** Raw authored value of a custom property on :root, e.g. "oklch(52% .27 280)". */
export function rawToken(token: string): string {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(token)
    .trim();
}

/**
 * The token as the browser would serialise it in a `color` position — the form
 * `getComputedStyle(el).backgroundColor` returns.
 */
export function tokenAsColor(token: string): string {
  const el = getProbe();
  el.style.color = "";
  el.style.color = `var(${token})`;
  const value = getComputedStyle(el).color;
  el.style.color = "";
  return value;
}

/** Same idea for any non-colour property: radius, shadow, spacing. */
export function tokenAsValue(property: string, token: string): string {
  const el = getProbe();
  el.style.setProperty(property, `var(${token})`);
  const value = getComputedStyle(el).getPropertyValue(property);
  el.style.removeProperty(property);
  return value;
}

/** Resolved value of a property actually applied to a rendered element. */
export function computed(el: Element, property: string): string {
  return getComputedStyle(el).getPropertyValue(property).trim();
}
