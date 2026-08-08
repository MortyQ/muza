import { onScopeDispose, reactive, markRaw, ref, getCurrentScope, watch, toValue, type Ref } from "vue";

import type {
  HighlightCoordinate,
  HighlightSyncController,
  LinkedTableBindings,
  LinkedTablesOptions,
  PaginationMode,
  ScrollSyncController,
  UseLinkedTablesReturn,
} from "../types";

interface LinkedTableEntry {
  scrollEl: HTMLElement | null
  scrollPosition: Ref<{ x: number, y: number } | null>
  isReceivingScroll: boolean
  pendingScrollX: number
  pendingScrollY: number
  scrollRafId: number | null
  page: Ref<number>
  paginationMode: PaginationMode
  totalPages?: Ref<number>
  /** Set by VTable when it opts into highlight sync. */
  receiveHighlight: ((coord: HighlightCoordinate) => void) | null
  /** Guard against a broadcast bouncing back — mirrors isReceivingScroll. */
  isReceivingHighlight: boolean
}

const registry = new Map<string, LinkedTableEntry>();

export const useLinkedTables = (
  id: string,
  linkedIds: string[],
  options?: LinkedTablesOptions,
): UseLinkedTablesReturn => {
  const totalPages = options?.paginationMode === "sync" ? options.totalPages : undefined;
  const paginationMode: PaginationMode = options?.paginationMode ?? "independent";
  const initialPage = options?.initialPage ?? 1;
  const namespace = options?.namespace;

  const registryKey = namespace ? `${namespace}:${id}` : id;
  const filteredLinkedIds = linkedIds.filter(lid => lid !== id);

  if (import.meta.env.DEV && !getCurrentScope()) {
    console.warn(
      `[useLinkedTables] Must be called within a Vue effect scope. `
      + `Registry entry for "${id}" will not be automatically cleaned up.`,
    );
  }

  if (import.meta.env.DEV && registry.has(registryKey)) {
    console.warn(
      `[useLinkedTables] Duplicate ID "${id}" detected — previous entry will be overwritten.`,
    );
  }

  const page = ref(initialPage);
  const scrollPosition = ref<{ x: number, y: number } | null>(null);

  const entry: LinkedTableEntry = {
    scrollEl: null,
    scrollPosition,
    isReceivingScroll: false,
    pendingScrollX: 0,
    pendingScrollY: 0,
    scrollRafId: null,
    page,
    paginationMode,
    totalPages,
    receiveHighlight: null,
    isReceivingHighlight: false,
  };

  registry.set(registryKey, entry);

  const getLinkedKey = (lid: string): string =>
    namespace ? `${namespace}:${lid}` : lid;

  const scrollSync: ScrollSyncController = {
    register: (el: HTMLElement) => {
      entry.scrollEl = el;
      // Sync scroll position from the first available sibling on late mount
      for (const linkedId of filteredLinkedIds) {
        const sibling = registry.get(getLinkedKey(linkedId));
        if (sibling?.scrollEl) {
          el.scrollLeft = sibling.scrollEl.scrollLeft;
          el.scrollTop = sibling.scrollEl.scrollTop;
          break;
        }
      }
    },

    unregister: () => {
      entry.scrollEl = null;
    },

    onScroll: (x: number, y: number) => {
      if (entry.isReceivingScroll) return;

      filteredLinkedIds.forEach((linkedId) => {
        const target = registry.get(getLinkedKey(linkedId));
        if (!target || !target.scrollEl) return;

        if (target.scrollEl.scrollLeft === x && target.scrollEl.scrollTop === y) return;

        target.pendingScrollX = x;
        target.pendingScrollY = y;

        if (target.scrollRafId !== null) return;

        // Throttle to one DOM write per frame — all scroll events that arrive within
        // the same frame are collapsed into the single pending position.
        target.scrollRafId = requestAnimationFrame(() => {
          target.scrollRafId = null;
          if (!target.scrollEl) return;
          target.isReceivingScroll = true;
          target.scrollEl.scrollLeft = target.pendingScrollX;
          target.scrollEl.scrollTop = target.pendingScrollY;
          requestAnimationFrame(() => {
            target.isReceivingScroll = false;
          });
        });
      });
    },

    scrollPosition,
  };

  const highlightSync: HighlightSyncController = {
    register: (receive: (coord: HighlightCoordinate) => void) => {
      entry.receiveHighlight = receive;
    },

    unregister: () => {
      entry.receiveHighlight = null;
    },

    // No rAF throttling here, unlike onScroll: this fires once per click.
    broadcast: (coord: HighlightCoordinate) => {
      if (entry.isReceivingHighlight) return;

      filteredLinkedIds.forEach((linkedId) => {
        const target = registry.get(getLinkedKey(linkedId));
        if (!target?.receiveHighlight) return;

        target.isReceivingHighlight = true;
        target.receiveHighlight(coord);
        target.isReceivingHighlight = false;
      });
    },
  };

  const onUpdatePage = (newPage: number): void => {
    page.value = newPage;

    filteredLinkedIds.forEach((linkedId) => {
      const target = registry.get(getLinkedKey(linkedId));
      if (!target || target.paginationMode === "independent") return;

      if (target.paginationMode === "reset") {
        target.page.value = 1;
        return;
      }

      if (!target.totalPages) return;
      target.page.value = Math.min(newPage, target.totalPages.value);
    });
  };

  const resetState = (page = 1): void => {
    entry.page.value = page;
    entry.scrollPosition.value = null;
    entry.receiveHighlight?.({ rowId: null, columnKey: null });
    if (entry.scrollEl) {
      entry.scrollEl.scrollLeft = 0;
      entry.scrollEl.scrollTop = 0;
    }

    filteredLinkedIds.forEach((linkedId) => {
      const target = registry.get(getLinkedKey(linkedId));
      if (!target) return;
      target.page.value = page;
      target.scrollPosition.value = null;
      // Clearing every table from one place is why there is no per-table watcher:
      // all four go dark in the same tick, no four-step flicker.
      target.receiveHighlight?.({ rowId: null, columnKey: null });
      if (target.scrollEl) {
        target.scrollEl.scrollLeft = 0;
        target.scrollEl.scrollTop = 0;
      }
    });
  };

  const resetOn = options?.resetOn;
  if (resetOn !== undefined) {
    watch(() => toValue(resetOn), () => resetState());
  }

  onScopeDispose(() => {
    registry.delete(registryKey);
  });

  return {
    // markRaw prevents reactive() from deep-wrapping the controllers
    link: reactive({
      scrollSync: markRaw(scrollSync),
      highlightSync: markRaw(highlightSync),
      page,
      "onUpdate:page": onUpdatePage,
    }) as unknown as LinkedTableBindings,
    resetState,
  };
};
