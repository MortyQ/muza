import {
  computed,
  nextTick,
  onActivated,
  onDeactivated,
  onUnmounted,
  readonly,
  ref,
  toValue,
  watch,
  type ComponentPublicInstance,
  type ComputedRef,
  type MaybeRefOrGetter,
  type Ref,
} from "vue";

import { useModal } from "../../../composables/useModal";
import { useModalRegisterer } from "../../../composables/useModalRegister";

const ENTER = { duration: 200, easing: "cubic-bezier(0, 0, 0.2, 1)" } as const;
const EXIT = { duration: 160, easing: "cubic-bezier(0.4, 0, 1, 1)" } as const;

// Inset of the fullscreen panel from each viewport edge, as a ratio of the viewport.
// 0 = full-bleed (panel fills the whole viewport); 0.05 = a centered 90% box.
// Single source of truth for the panel geometry — `_fullscreen.scss` carries only
// border-radius/shadow and no insets, so nothing else needs to agree with it.
const PANEL_INSET_RATIO = 0;

interface PanelBox {
  top: number
  left: number
  width: number
  height: number
}

// Pure arithmetic off the viewport — never touches the DOM, so it cannot feed back
// into layout (unlike measuring the wrapper itself, which was the source of the
// unbounded growth bug this composable used to have).
const computePanelBox = (): PanelBox => {
  const { innerWidth, innerHeight } = window;
  return {
    top: innerHeight * PANEL_INSET_RATIO,
    left: innerWidth * PANEL_INSET_RATIO,
    width: innerWidth * (1 - 2 * PANEL_INSET_RATIO),
    height: innerHeight * (1 - 2 * PANEL_INSET_RATIO),
  };
};

// Narrows a value (a DOM element, or a component instance's untyped `$el`) to a
// concrete HTMLElement without resorting to `any` — avoids reaching for
// querySelector-by-class, which would silently break if a chrome element's root
// element or class ever changes.
const asHtmlElement = (val: unknown): HTMLElement | undefined => (
  val instanceof HTMLElement ? val : undefined
);

// A chrome ref may hold a plain element (e.g. a toolbar div) or a component
// instance (e.g. TablePagination) — in the latter case the rendered height
// lives on its untyped `$el`.
const chromeElementHeight = (val: HTMLElement | ComponentPublicInstance | null): number => {
  const direct = asHtmlElement(val);
  if (direct) return direct.offsetHeight;
  return asHtmlElement((val as ComponentPublicInstance | null)?.$el)?.offsetHeight ?? 0;
};

export interface UseTableFullScreenOptions {
  wrapperRef: Ref<HTMLElement | null>
  isEnabled: MaybeRefOrGetter<boolean>
  /**
   * Element rendered at the wrapper's original in-flow position while
   * fullscreen is active (see `placeholderStyle`). Reserving that slot keeps
   * the surrounding page's layout height/scroll position intact — without it,
   * the wrapper leaves flow twice (fixed position + Teleport to <body>),
   * page content collapses, and exit has no stable, live-measurable target
   * to FLIP back to.
   */
  placeholderRef?: Ref<HTMLElement | null>
  /**
   * Elements whose rendered height must be excluded from the fullscreen
   * panel's content area (e.g. a toolbar, pagination controls). The composable
   * stays ignorant of the table's anatomy — it only sums the heights of
   * whatever boxes it's handed, via `contentHeight`. These elements are
   * already rendered and the same size in both fullscreen and normal mode, so
   * they're safe to measure synchronously before `isFullscreen` flips (see
   * `enter()`).
   */
  chromeRefs?: ReadonlyArray<Ref<HTMLElement | ComponentPublicInstance | null>>
  /**
   * Called after the DOM has caught up to a fullscreen toggle (either
   * direction) — the wrapper's real layout size has already changed, though
   * the FLIP animation may still be transforming it visually. Use this to
   * react to the resize itself (e.g. remeasuring a virtualizer bound to an
   * inner scroll container), not to the animation's completion.
   */
  onToggle?: (isFullscreen: boolean) => void | Promise<void>
}

export interface UseTableFullScreenReturn {
  isFullscreen: Readonly<Ref<boolean>>
  isEnabled: ComputedRef<boolean>
  zIndex: ComputedRef<number>
  /**
   * Inline size for the placeholder that reserves the wrapper's original
   * slot while fullscreen is active. `null` when not fullscreen (placeholder
   * should not be rendered). Both width and height are set explicitly —
   * height alone would let a flex-row parent collapse the placeholder's
   * width to zero and reflow siblings horizontally.
   */
  placeholderStyle: ComputedRef<{ width: string, height: string } | null>
  /**
   * Inline top/left/width/height (px) for the fullscreen panel, computed
   * synchronously from the viewport before `isFullscreen` flips — so the very
   * first fullscreen render already has final geometry instead of discovering
   * it later via a DOM measurement. `null` when not fullscreen.
   */
  panelStyle: ComputedRef<Record<string, string> | null>
  /**
   * Ready-to-use scroll-area height in px: panel height minus the summed
   * height of `chromeRefs` elements. `0` when not fullscreen. Both inputs are
   * known before the first fullscreen render (see `enter()`), so consumers
   * just pick between this and their normal-mode height — no arithmetic and
   * no provisional "100%" frame needed.
   */
  contentHeight: ComputedRef<number>
  toggle: () => void
  close: () => void
}

// The fullscreen panel is a single application-wide resource — it fills the
// viewport, so at most one instance can legitimately be showing it at a time.
// All VTable instances therefore share ONE modal registry entry, keyed by a
// stable id instead of a per-instance useId(). That's what makes the
// KeepAlive handoff below possible: an incoming instance can claim the
// existing session without registering (and leaking) a second, competing
// modal id, and Escape only ever has one entry to close.
const FULLSCREEN_MODAL_ID = "v-table-fullscreen";

// True while an outgoing (deactivated) instance has released its fullscreen
// visuals but left the shared modal open, waiting to see whether an incoming
// instance claims the session within the same patch cycle (see onDeactivated
// / onActivated below). Module-level because the handoff spans two distinct
// composable instances — neither one alone can observe the other.
const handoffPending = ref(false);

// The outgoing instance's in-flow rect, carried across the handoff. The two
// instances swap into the same slot on the page, so the outgoing rect is also
// the incoming one's — and the claiming instance has no rect of its own to
// measure (it goes fullscreen without ever having been laid out in flow).
// Without this, the claimant renders no placeholder (placeholderStyle needs a
// rect) and its exit() has no "from" box, so exiting would not animate.
let handoffRect: DOMRect | null = null;

const applyDeltaTransform = (el: HTMLElement, fromRect: DOMRect, toRect: DOMRect): void => {
  const scaleX = fromRect.width / toRect.width;
  const scaleY = fromRect.height / toRect.height;
  const translateX = fromRect.left - toRect.left;
  const translateY = fromRect.top - toRect.top;
  el.style.transformOrigin = "top left";
  el.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scaleX}, ${scaleY})`;
};

export const useTableFullScreen = (
  options: UseTableFullScreenOptions,
): UseTableFullScreenReturn => {
  const { wrapperRef, placeholderRef } = options;

  const isFullscreen = ref(false);
  const cachedOpenRect = ref<DOMRect | null>(null);
  const panelBox = ref<PanelBox | null>(null);
  const chromeHeight = ref(0);
  let pendingCloseListener:
    { el: HTMLElement, handler: (e: TransitionEvent) => void } | null = null;
  let pendingEnterListener:
    { el: HTMLElement, handler: (e: TransitionEvent) => void } | null = null;
  let animationGeneration = 0;
  // Set around the isFullscreen = false assignment in onDeactivated so the
  // watcher below skips closeModal() for that transition — the shared modal
  // must stay open across a KeepAlive handoff, only exit() should close it.
  let suppressModalClose = false;

  // autoUnregister: false — this entry is shared for the app's lifetime (see
  // FULLSCREEN_MODAL_ID above). If it auto-unregistered on unmount, one
  // instance being torn down could delete the entry a sibling instance still
  // relies on. A lingering entry with isOpen: false is harmless: openModals
  // filters on isOpen.
  const { zIndex, open: openModal, close: closeModal } = useModal(FULLSCREEN_MODAL_ID, false);
  const registerer = useModalRegisterer();

  // Sums the current `chromeRefs` heights. Safe to call before `isFullscreen`
  // flips — these elements are already rendered and are the same size in both
  // fullscreen and normal mode, unlike the panel itself, which doesn't exist
  // until fullscreen is active.
  const measureChrome = (): void => {
    chromeHeight.value = (options.chromeRefs ?? [])
      .reduce((sum, chromeRef) => sum + chromeElementHeight(chromeRef.value), 0);
  };

  // First/Last/Invert/Play: measure the real on-page rect before and after the
  // fullscreen class applies, fake the "small" state via transform, then animate
  // transform back to identity. position/inset are not CSS-animatable, so this is
  // the only way opening reads as a real "grow" instead of an instant snap.
  const enter = async (): Promise<void> => {
    const el = wrapperRef.value;
    if (!el) return;

    const generation = ++animationGeneration;

    const fromRect = el.getBoundingClientRect();
    cachedOpenRect.value = fromRect;
    // Compute the panel geometry before flipping the flag, so the flag and the
    // geometry land together in the same render — the first fullscreen render
    // already has final dimensions instead of a provisional one discovered later.
    panelBox.value = computePanelBox();
    // Same reasoning applies to the chrome height: measure it now, before the
    // flag flips, so `contentHeight` also has its final value on that very
    // first fullscreen render instead of a provisional one discovered a tick
    // later. Without this, a consumer's scroll container would render one
    // frame at a "100%" or otherwise-provisional height, and the FLIP
    // animation — which measures the settled layout via getBoundingClientRect
    // right after this tick — would capture that provisional box instead of
    // the real one, animating toward a target that then changes underneath
    // it (the panel visually growing/shrinking again after the FLIP already
    // finished).
    measureChrome();
    // Belt-and-braces against destructive scroll clamping: the wrapper leaves
    // flow twice (position: fixed + Teleport to <body>) for one frame before
    // the placeholder reserves its slot. If the document's max scroll offset
    // shrinks during that frame, the browser clamps window.scrollY and that
    // clamp cannot be undone by restoring layout afterward — so save/restore
    // explicitly instead of trusting the placeholder's sizing alone.
    const savedX = window.scrollX;
    const savedY = window.scrollY;
    isFullscreen.value = true;

    // Vue applies the `--fullscreen` class (and the Teleport move to <body>) on the
    // next render tick, not synchronously — measuring toRect before this resolves
    // would just return fromRect again and the FLIP delta would be zero.
    await nextTick();

    // Something else (a competing exit() or a newer enter()) took over while we
    // were suspended above — bail out without touching el.style at all.
    if (generation !== animationGeneration) return;

    if (window.scrollX !== savedX || window.scrollY !== savedY) {
      window.scrollTo({ left: savedX, top: savedY, behavior: "instant" });
    }

    el.style.transition = "none";
    const toRect = el.getBoundingClientRect();
    applyDeltaTransform(el, fromRect, toRect);

    void el.offsetHeight; // force reflow — commit the faked "from" state before animating
    el.style.transition = `transform ${ENTER.duration}ms ${ENTER.easing}`;
    el.style.transform = "translate(0, 0) scale(1, 1)";

    const onEnterEnd = (e: TransitionEvent): void => {
      if (e.target !== el || e.propertyName !== "transform") return;
      el.removeEventListener("transitionend", onEnterEnd);
      pendingEnterListener = null;
      // "translate(0, 0) scale(1, 1)" is visually equivalent to no transform —
      // clearing it here matches the hygiene of exit()'s cleanup so the element
      // doesn't carry stale inline styles indefinitely once settled.
      el.style.transform = "";
      el.style.transition = "";
      el.style.transformOrigin = "";
    };
    pendingEnterListener = { el, handler: onEnterEnd };
    el.addEventListener("transitionend", onEnterEnd);
  };

  const exit = async (): Promise<void> => {
    const el = wrapperRef.value;
    if (!el) return;

    const generation = ++animationGeneration;

    // Same belt-and-braces guard as enter(): the placeholder is unmounted and
    // the wrapper re-enters normal flow, which can momentarily change the
    // document's max scroll offset and cause the browser to clamp scrollY.
    const savedX = window.scrollX;
    const savedY = window.scrollY;

    // Symmetric with enter(): wait one tick so a rapid exit() that interrupts
    // an in-flight enter() measures the DOM after it's actually caught up to
    // isFullscreen = true, instead of the pre-fullscreen layout.
    await nextTick();
    if (generation !== animationGeneration) return;

    if (window.scrollX !== savedX || window.scrollY !== savedY) {
      window.scrollTo({ left: savedX, top: savedY, behavior: "instant" });
    }

    // A rapid re-click during an in-flight close re-enters exit() before the
    // previous transitionend fired. Interrupting a running transition fires
    // transitioncancel, not transitionend — the previous listener would otherwise
    // leak and fire later alongside the new one. The same applies if exit()
    // interrupts an in-flight enter() — its transitionend never fires either.
    if (pendingEnterListener) {
      pendingEnterListener.el.removeEventListener("transitionend", pendingEnterListener.handler);
      pendingEnterListener = null;
    }
    if (pendingCloseListener) {
      pendingCloseListener.el.removeEventListener("transitionend", pendingCloseListener.handler);
      pendingCloseListener = null;
    }

    // getBoundingClientRect() here returns the live, currently-transformed rect
    // (including any in-flight animation) — so an interrupted open animates its
    // reverse from wherever it visually is right now, never jumping.
    const toRect = el.getBoundingClientRect();
    // Prefer the placeholder's LIVE rect over the cached open-time rect: the
    // placeholder sits in the wrapper's original in-flow slot for the entire
    // fullscreen duration, so measuring it now (instead of trusting a rect
    // captured back in enter()) survives page scroll, reflow, or window
    // resize that happened while fullscreen was open — the exit FLIP always
    // lands on the slot's current position, never a stale one.
    const fromRect = placeholderRef?.value?.getBoundingClientRect()
      ?? cachedOpenRect.value
      ?? toRect;
    el.style.transition = `transform ${EXIT.duration}ms ${EXIT.easing}`;
    applyDeltaTransform(el, fromRect, toRect);

    const onEnd = (e: TransitionEvent): void => {
      if (e.target !== el || e.propertyName !== "transform") return;
      el.removeEventListener("transitionend", onEnd);
      pendingCloseListener = null;
      isFullscreen.value = false;
      el.style.transform = "";
      el.style.transition = "";
      el.style.transformOrigin = "";
    };
    pendingCloseListener = { el, handler: onEnd };
    el.addEventListener("transitionend", onEnd);
  };

  const toggle = (): void => {
    if (isFullscreen.value) void exit();
    else void enter();
  };

  const close = (): void => {
    if (isFullscreen.value) void exit();
  };

  watch(isFullscreen, (val) => {
    if (val) openModal();
    // A KeepAlive handoff (onDeactivated below) flips this to false while
    // deliberately keeping the shared modal open for a possible incoming
    // claimant — suppressModalClose skips the close in that case only.
    else if (!suppressModalClose) closeModal();
  });

  // Escape closes only the topmost overlay. VModal's own Escape handling is scoped
  // to a @keydown on its own backdrop element (only fires if focus is inside it);
  // this listener is window-level (focus isn't guaranteed to be in the table), so
  // without this registry check, pressing Escape to close a row-action modal that
  // doesn't happen to have focus would also incorrectly close the table underneath.
  const handleEscape = (event: KeyboardEvent): void => {
    if (event.key !== "Escape" || !isFullscreen.value) return;

    const topOpenZIndex = Math.max(
      0,
      ...registerer.openModals.value
        .filter(modal => modal.id !== FULLSCREEN_MODAL_ID)
        .map(modal => modal.zIndex),
    );
    if (topOpenZIndex > zIndex.value) return;

    toggle();
  };

  watch(isFullscreen, (val) => {
    if (val) window.addEventListener("keydown", handleEscape);
    else window.removeEventListener("keydown", handleEscape);
  });

  // Pure arithmetic off innerWidth/innerHeight — cannot feed back into layout,
  // unlike the ResizeObserver-on-the-wrapper approach this replaces. The chrome
  // is re-measured too: it's expected to stay constant, but a window resize
  // could in principle reflow it (e.g. a toolbar that wraps to two lines on
  // narrow viewports), and `contentHeight` would otherwise go stale.
  const handleResize = (): void => {
    if (!isFullscreen.value) return;
    panelBox.value = computePanelBox();
    measureChrome();
  };

  watch(isFullscreen, (val) => {
    if (val) window.addEventListener("resize", handleResize);
    else window.removeEventListener("resize", handleResize);
  });

  watch(isFullscreen, async (val) => {
    await nextTick();
    await options.onToggle?.(val);
  });

  // Enters fullscreen instantly — no FLIP animation — for an instance claiming
  // an in-progress KeepAlive handoff (see onActivated below). There's no
  // meaningful "from" rect to animate from: this instance's wrapper never had
  // an in-flow position, it was just re-activated from the KeepAlive cache.
  // Reuses enter()'s two synchronous measurements; deliberately does not
  // touch enter()'s FLIP/transform logic.
  const claimFullscreenInstantly = (): void => {
    measureChrome();
    // Inherited from the outgoing instance — see handoffRect. Gives this
    // instance a placeholder to reserve the shared slot and a "from" box for
    // exit()'s FLIP, neither of which it could measure for itself.
    cachedOpenRect.value = handoffRect;
    panelBox.value = computePanelBox();
    isFullscreen.value = true;
  };

  // KeepAlive deactivates the outgoing table instance instead of unmounting it
  // (onUnmounted below never runs). Without this hook, a deactivated instance
  // would keep isFullscreen === true forever: its wrapper stays fixed/teleported,
  // its window listeners stay attached, and the shared modal stays "owned" by a
  // component nobody can interact with anymore.
  onDeactivated(() => {
    if (!isFullscreen.value) return;

    // Suppressed for the duration of this handoff attempt: the shared modal
    // must stay open so a same-tick incoming instance (onActivated below) can
    // claim it without it ever visually closing. The nextTick callback below
    // clears this once the watcher triggered by the assignment has run.
    suppressModalClose = true;
    panelBox.value = null;
    isFullscreen.value = false;

    // Cancel in-flight animation bookkeeping — bumping the generation makes
    // any suspended enter()/exit() bail out instead of resuming against a
    // wrapper element that's now detached from the live DOM.
    animationGeneration += 1;
    if (pendingEnterListener) {
      pendingEnterListener.el.removeEventListener("transitionend", pendingEnterListener.handler);
      pendingEnterListener = null;
    }
    if (pendingCloseListener) {
      pendingCloseListener.el.removeEventListener("transitionend", pendingCloseListener.handler);
      pendingCloseListener = null;
    }

    handoffPending.value = true;
    handoffRect = cachedOpenRect.value;

    // KeepAlive activates the incoming child within the same patch cycle, so
    // by the time this resolves the outcome is already known — regardless of
    // whether onDeactivated (this instance) or onActivated (the incoming one)
    // ran first. If nobody claimed the session (e.g. the user navigated away
    // from tables entirely), close the shared modal for real here.
    void nextTick().then(() => {
      suppressModalClose = false;
      if (handoffPending.value) {
        handoffPending.value = false;
        handoffRect = null;
        closeModal();
      }
    });
  });

  // Mirror of onDeactivated: claims a pending handoff so the fullscreen
  // session appears to "move" to this table instead of collapsing, giving one
  // continuous panel and a single Escape to close instead of a second stacked
  // modal.
  onActivated(() => {
    if (!handoffPending.value) return;

    // This instance has fullscreen disabled (toolbar.actions.fullscreen:
    // false) — it cannot claim the session. Leave handoffPending as-is so the
    // outgoing instance's nextTick guard (above) sees it still pending and
    // closes the shared modal cleanly, exactly as if nobody had claimed it.
    if (!toValue(options.isEnabled)) return;

    handoffPending.value = false;
    claimFullscreenInstantly();
  });

  onUnmounted(() => {
    // Real unmount (route change, v-if) rather than a KeepAlive deactivation.
    // The shared modal entry is registered with autoUnregister: false, so
    // nothing else would ever release it — an instance destroyed while
    // fullscreen would leave it permanently open for the rest of the session.
    // (A KeepAlive cache eviction lands here too, but by then onDeactivated has
    // already flipped isFullscreen, so this is a no-op in that case.)
    if (isFullscreen.value) closeModal();

    window.removeEventListener("keydown", handleEscape);
    window.removeEventListener("resize", handleResize);
    if (pendingCloseListener) {
      pendingCloseListener.el.removeEventListener("transitionend", pendingCloseListener.handler);
      pendingCloseListener = null;
    }
    if (pendingEnterListener) {
      pendingEnterListener.el.removeEventListener("transitionend", pendingEnterListener.handler);
      pendingEnterListener = null;
    }
  });

  const placeholderStyle = computed<{ width: string, height: string } | null>(() => {
    if (!isFullscreen.value || !cachedOpenRect.value) return null;
    return {
      width: `${cachedOpenRect.value.width}px`,
      height: `${cachedOpenRect.value.height}px`,
    };
  });

  const panelStyle = computed<Record<string, string> | null>(() => {
    if (!isFullscreen.value || !panelBox.value) return null;
    const { top, left, width, height } = panelBox.value;
    return {
      top: `${top}px`,
      left: `${left}px`,
      width: `${width}px`,
      height: `${height}px`,
    };
  });

  const contentHeight = computed<number>(() => {
    if (!isFullscreen.value || !panelBox.value) return 0;
    return panelBox.value.height - chromeHeight.value;
  });

  return {
    isFullscreen: readonly(isFullscreen),
    isEnabled: computed(() => toValue(options.isEnabled)),
    zIndex,
    placeholderStyle,
    panelStyle,
    contentHeight,
    toggle,
    close,
  };
};
