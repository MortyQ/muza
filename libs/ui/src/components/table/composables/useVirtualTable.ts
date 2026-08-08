import {
  computed,
  onActivated,
  onDeactivated,
  onMounted,
  onUnmounted,
  type Ref,
  shallowRef,
} from "vue";

import { useVirtualizer } from "@tanstack/vue-virtual";

import type { VirtualTableOptions } from "../types";

export function useVirtualTable(
  scrollContainerRef: Ref<HTMLElement | null>,
  data: Ref<Record<string, unknown>[]>,
  options: VirtualTableOptions = {},
) {
  const {
    estimateSize = 50,
    overscan = 3,
    measureElement = false,
  } = options;

  const isScrolling = shallowRef(false);
  let scrollTimeout: ReturnType<typeof setTimeout> | null = null;
  let listenerAttached = false;

  const virtualizerOptions: Record<string, unknown> = {
    get count() {
      return data.value.length;
    },
    getScrollElement: () => scrollContainerRef.value,
    estimateSize: () => estimateSize,
    overscan,
    scrollingDelay: 150,
  };

  if (measureElement) {
    virtualizerOptions.measureElement = (el: Element | null) => {
      if (!el || isScrolling.value) return estimateSize;
      return el.getBoundingClientRect().height || estimateSize;
    };
  }

  const virtualizer = useVirtualizer(virtualizerOptions as never);
  const virtualItems = computed(() => virtualizer.value.getVirtualItems());
  const totalSize = computed(() => virtualizer.value.getTotalSize());

  const handleScroll = () => {
    isScrolling.value = true;

    if (scrollTimeout) {
      clearTimeout(scrollTimeout);
    }

    scrollTimeout = setTimeout(() => {
      isScrolling.value = false;
    }, 150);
  };

  // Public recovery hook: forces the virtualizer to re-measure its scroll
  // element (e.g. after its container's height changed outside of a scroll
  // event, such as a fullscreen toggle) and dispatches a synthetic scroll event
  // so listeners relying on scroll to reveal newly-visible rows still fire.
  // Does NOT attach/detach scroll listeners — callers that also need the
  // listener (re)attached must call setupScrollListener() themselves.
  const remeasure = () => {
    const el = scrollContainerRef.value;
    if (!el || !virtualizer.value) return;

    virtualizer.value.measure();
    el.dispatchEvent(new Event("scroll", { bubbles: true }));
  };

  const setupScrollListener = () => {
    const el = scrollContainerRef.value;
    if (el && !listenerAttached) {
      el.addEventListener("scroll", handleScroll, { passive: true });
      listenerAttached = true;
    }
  };

  const removeScrollListener = () => {
    const el = scrollContainerRef.value;
    if (el && listenerAttached) {
      el.removeEventListener("scroll", handleScroll);
      listenerAttached = false;
    }
  };

  const clearScrollTimeout = () => {
    if (scrollTimeout) {
      clearTimeout(scrollTimeout);
      scrollTimeout = null;
    }
  };

  onMounted(() => {
    requestAnimationFrame(() => {
      setupScrollListener();
    });
  });

  onActivated(() => {
    requestAnimationFrame(() => {
      remeasure();
      setupScrollListener();
    });
  });

  onDeactivated(() => {
    clearScrollTimeout();
  });

  onUnmounted(() => {
    removeScrollListener();
    clearScrollTimeout();
  });

  return {
    virtualizer,
    virtualItems,
    totalSize,
    remeasure,
  };
}
