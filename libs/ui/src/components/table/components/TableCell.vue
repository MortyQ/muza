<script lang="ts" setup>
import { computed, inject } from "vue";

import VIcon from "../../base/VIcon.vue";
import type { CellMetadata } from "../composables/useTableCellMetadata";
import type { Column } from "../types/index";

/**
 * A stable function provided once by `VTable`, so the cell resolves its own
 * metadata exactly once instead of the caller resolving it four times per cell —
 * once for the class, once for the style, once for the title and once for the
 * value. Injected rather than prop-drilled because it is the same function for
 * every cell in the table.
 */
type GetCellMetadata = (
  row: Record<string, unknown>,
  column: Column,
  colIndex: number,
  rowIndex: number,
) => CellMetadata;

const {
  align = "left",
  depth = 0,
  isFirstColumn = false,
  row = undefined,
  column = undefined,
  colIndex = undefined,
  rowIndex = undefined,
  isExpanded = false,
  // Renamed on the way out because nothing here reads it in the legacy path:
  // the slot renders the content. Declared and defaulted so the prop's contract
  // survives unchanged.
  value: _value = undefined,
} = defineProps<{
  value?: unknown
  align?: "left" | "center" | "right" | string
  depth?: number
  isFirstColumn?: boolean
  /** Metadata mode — pass all four and the cell renders itself. */
  row?: Record<string, unknown>
  column?: Column
  colIndex?: number
  rowIndex?: number
  isExpanded?: boolean
}>();

const emit = defineEmits<{
  "toggle-expand": []
}>();

const getCellMetadata = inject<GetCellMetadata | undefined>("tableCellMetadata", undefined);

/**
 * Metadata mode only applies to `VTable`'s data-cell loop, which is the only
 * caller that has a row and a column to hand. The total row supplies its own
 * markup through the default slot and must keep the bare-passthrough behaviour —
 * wrapping it in `.v-table-cell-content` would double-nest it.
 *
 * The resolver is part of the condition, not just the row and column: a cell
 * mounted outside VTable has nothing to inject, and the metadata branch would
 * then render an empty span where the caller's slot content should be.
 */
const isMetadataMode = computed<boolean>(() => !!row && !!column && !!getCellMetadata);

const metadata = computed<CellMetadata | null>(() => {
  if (!row || !column || colIndex === undefined || rowIndex === undefined || !getCellMetadata) {
    return null;
  }
  return getCellMetadata(row, column, colIndex, rowIndex);
});

// Legacy indent path: relevant only when `depth`/`isFirstColumn` are passed
// directly, with no row/column to resolve an `indentStyle` from.
const computedPaddingLeft = computed<string | undefined>(() => {
  if (isFirstColumn && depth > 0) {
    return `${depth * 24 + 16}px`;
  }
  return undefined;
});

const rootClass = computed(() => [
  {
    "v-table-cell--left": align === "left",
    "v-table-cell--center": align === "center",
    "v-table-cell--right": align === "right",
    "v-table-cell--indented": isFirstColumn && depth > 0,
  },
  metadata.value?.cssClass,
]);

const rootStyle = computed<Record<string, string | undefined> | undefined>(() => {
  const style = {
    ...(computedPaddingLeft.value ? { paddingLeft: computedPaddingLeft.value } : {}),
    ...metadata.value?.customStyle,
  };
  // Returning `{}` would put an empty `style=""` on every cell in the table.
  return Object.keys(style).length ? style : undefined;
});
</script>

<template>
  <div
    :class="rootClass"
    :style="rootStyle"
    class="v-table-cell"
  >
    <div
      v-if="isMetadataMode"
      :style="metadata?.indentStyle ?? undefined"
      class="v-table-cell-content"
    >
      <slot name="pin" />

      <button
        v-if="metadata?.isExpandable"
        class="v-table-cell-expand-btn"
        @click.stop="emit('toggle-expand')"
      >
        <VIcon
          :icon="isExpanded ? 'mdi:chevron-down' : 'mdi:chevron-right'"
          :size="18"
        />
      </button>

      <div
        :class="{ 'v-table-cell-text--truncate': !column?.interactive }"
        class="v-table-cell-text"
      >
        <slot>
          <span :title="metadata?.titleText">{{ metadata?.formattedValue }}</span>
        </slot>
      </div>
    </div>

    <slot v-else />
  </div>
</template>
