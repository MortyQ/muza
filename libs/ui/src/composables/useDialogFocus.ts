import {
  type MaybeRefOrGetter,
  nextTick,
  onBeforeUnmount,
  type ShallowRef,
  toValue,
  watch,
} from "vue";

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
  "[contenteditable='true']",
].join(",");

const focusableIn = (root: HTMLElement): HTMLElement[] =>
  Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE))
    .filter(el => !el.closest("[inert]") && el.getAttribute("aria-hidden") !== "true");

export interface UseDialogFocusReturn {
  /** Bind to the dialog's `@keydown`: keeps Tab and Shift+Tab inside it. */
  trapTab: (event: KeyboardEvent) => void
}

/**
 * Focus handling every modal surface needs: on open, remember what had focus and move it into
 * the dialog (an `[autofocus]` element if there is one, else the dialog itself — give it
 * `tabindex="-1"`); while open, keep Tab inside; on close or unmount, hand focus back.
 *
 * Moving focus in is also what makes a `@keydown` Escape handler on the dialog work at all —
 * keyboard events go to the focused element, and before this they never reached the dialog.
 */
export const useDialogFocus = (
  isOpen: MaybeRefOrGetter<boolean>,
  dialog: Readonly<ShallowRef<HTMLElement | null>>,
): UseDialogFocusReturn => {
  let returnTo: HTMLElement | null = null;

  const restore = (): void => {
    const target = returnTo;
    returnTo = null;
    if (target?.isConnected) target.focus();
  };

  watch(
    () => toValue(isOpen),
    (open) => {
      if (!open) {
        restore();
        return;
      }
      returnTo = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      nextTick(() => {
        const root = dialog.value;
        if (!root) return;
        const preferred = root.querySelector<HTMLElement>("[autofocus]");
        (preferred ?? root).focus();
      });
    },
    { immediate: true },
  );

  onBeforeUnmount(() => {
    if (toValue(isOpen)) restore();
  });

  const trapTab = (event: KeyboardEvent): void => {
    if (event.key !== "Tab") return;
    const root = dialog.value;
    if (!root) return;

    const items = focusableIn(root);
    if (items.length === 0) {
      event.preventDefault();
      return;
    }

    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;

    if (event.shiftKey && (active === first || active === root)) {
      event.preventDefault();
      last?.focus();
    }
    else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first?.focus();
    }
  };

  return { trapTab };
};
