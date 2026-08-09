<script lang="ts" setup>
import { ref, computed, watch } from "vue";

import VButton from "../../base/VButton.vue";
import VIcon from "../../base/VIcon.vue";
import type { Column } from "../types";
import { readColumnState, writeColumnState, type SavedColumnState } from "../utils/columnState";
import tableStorage from "../utils/storage";

interface ColumnSetupItem {
  key: string
  label: string
  visible: boolean
  order: number
  fixed?: "left" | "right"
}

interface ColumnSetupConfig {
  enabled?: boolean
  key?: string
  type?: "indexedDB" | "localStorage" | "sessionStorage"
  allowReorder?: boolean
  initialVisible?: string[]
}

interface Props {
  columns: Column[]
  config?: ColumnSetupConfig
}

interface Emits {

  (e: "update:visible-columns", columns: Column[]): void

  (e: "close"): void
}

const props = withDefaults(defineProps<Props>(), {
  config: () => ({}),
});

const emit = defineEmits<Emits>();

// Load saved state from storage (async)
const loadFromStorage = async (): Promise<SavedColumnState | null> => {
  if (!props.config?.key) return null;

  try {
    return await readColumnState(props.config.key, props.config.type);
  }
  catch (error) {
    console.error("Failed to load column setup from storage:", error);
    return null;
  }
};

// Save state to storage (async)
const saveToStorage = async (setupItems: ColumnSetupItem[]) => {
  if (!props.config?.key) return;

  try {
    // Build fixed map (only save columns that are fixed)
    const fixed: Record<string, "left" | "right"> = {};
    setupItems.forEach((item) => {
      if (item.fixed) {
        fixed[item.key] = item.fixed;
      }
    });

    const state: SavedColumnState = {
      visible: setupItems.filter(item => item.visible).map(item => item.key),
      order: setupItems.map(item => item.key),
      fixed: Object.keys(fixed).length > 0 ? fixed : undefined, // Only save if there are fixed columns
    };

    await writeColumnState(props.config.key, state, props.config.type);
  }
  catch (error) {
    console.error("Failed to save column setup to storage:", error);
  }
};

// Flatten columns to handle grouped headers
const flattenColumns = (columns: Column[]): Column[] => {
  return columns.reduce((acc, col) => {
    if (col.children && col.children.length > 0) {
      return [...acc, ...flattenColumns(col.children)];
    }
    return [...acc, col];
  }, [] as Column[]);
};

// Create setup items from columns
const createSetupItems = (savedState?: SavedColumnState | null): ColumnSetupItem[] => {
  const flatCols = flattenColumns(props.columns);

  // If we have saved state, use it
  if (savedState) {
    const { visible, order, fixed: savedFixed } = savedState;

    // Create a map for quick lookup
    const colMap = new Map(flatCols.map(col => [col.key, col]));

    // Build items based on saved order
    const setupItems: ColumnSetupItem[] = [];

    // First, add columns in saved order
    order.forEach((key, index) => {
      const col = colMap.get(key);
      if (col) {
        setupItems.push({
          key: col.key,
          label: col.label,
          visible: visible.includes(key),
          order: index,
          fixed: savedFixed?.[key] || col.fixed, // Use saved fixed state, fallback to column's fixed
        });
        colMap.delete(key);
      }
    });

    // Then add any new columns that weren't in saved state
    colMap.forEach((col) => {
      setupItems.push({
        key: col.key,
        label: col.label,
        visible: true,
        order: setupItems.length,
        fixed: col.fixed,
      });
    });

    return setupItems;
  }

  // No saved state, use initial config or show all columns by default
  const initialVisible = props.config?.initialVisible;

  return flatCols.map((col, index) => ({
    key: col.key,
    label: col.label,
    // If initialVisible is provided, check if column is in the list
    // If not provided, all columns are visible by default
    visible: initialVisible ? initialVisible.includes(col.key) : true,
    order: index,
    fixed: col.fixed,
  }));
};

// Internal state
const items = ref<ColumnSetupItem[]>(createSetupItems());

// Track if changes were made
const hasChanges = ref(false);

// Original state for comparison
const originalItems = ref<ColumnSetupItem[]>(JSON.parse(JSON.stringify(createSetupItems())));

// Load from storage asynchronously
loadFromStorage().then((savedState) => {
  if (savedState) {
    const loaded = createSetupItems(savedState);
    items.value = loaded;
    originalItems.value = JSON.parse(JSON.stringify(loaded));
  }
});

// Check if there are unsaved changes
const hasUnsavedChanges = computed(() => {
  return JSON.stringify(items.value) !== JSON.stringify(originalItems.value);
});

// Emit visible columns to parent
const emitVisibleColumns = () => {
  const flatCols = flattenColumns(props.columns);
  const visibleItems = items.value.filter(item => item.visible).sort((a, b) => a.order - b.order);

  const visibleCols = visibleItems
    .map((item) => {
      const col = flatCols.find(c => c.key === item.key);
      if (!col) return null;

      // Apply fixed state from item to column
      return {
        ...col,
        fixed: item.fixed,
      };
    })
    .filter(Boolean) as Column[];

  emit("update:visible-columns", visibleCols);
};

// Watch for changes to track modifications (but don't emit)
watch(
  items,
  () => {
    hasChanges.value = true;
  },
  { deep: true },
);

// Apply changes handler
const handleApply = () => {
  saveToStorage(items.value);
  emitVisibleColumns();
  originalItems.value = JSON.parse(JSON.stringify(items.value));
  hasChanges.value = false;
  emit("close");
};

// Check if all visible or all hidden
const allVisible = computed(() => items.value.every(item => item.visible));
const allHidden = computed(() => items.value.every(item => !item.visible));
const someVisible = computed(() => !allVisible.value && !allHidden.value);
const visibleCount = computed(() => items.value.filter(item => item.visible).length);

// Drag state
const draggedIndex = ref<number | null>(null);
const dragOverIndex = ref<number | null>(null);
const listRef = ref<HTMLElement | null>(null);
const autoScrollInterval = ref<number | null>(null);

// Auto-scroll when dragging near edges
const handleAutoScroll = (event: DragEvent) => {
  if (!listRef.value) return;

  const listRect = listRef.value.getBoundingClientRect();
  const mouseY = event.clientY;
  const scrollThreshold = 50; // pixels from edge to trigger scroll
  const scrollSpeed = 10; // pixels per interval

  // Check if near top edge
  if (mouseY < listRect.top + scrollThreshold && mouseY > listRect.top) {
    if (!autoScrollInterval.value) {
      autoScrollInterval.value = window.setInterval(() => {
        if (listRef.value && listRef.value.scrollTop > 0) {
          listRef.value.scrollTop -= scrollSpeed;
        }
      }, 16); // ~60fps
    }
  }
  // Check if near bottom edge
  else if (mouseY > listRect.bottom - scrollThreshold && mouseY < listRect.bottom) {
    if (!autoScrollInterval.value) {
      autoScrollInterval.value = window.setInterval(() => {
        if (listRef.value) {
          const maxScroll = listRef.value.scrollHeight - listRef.value.clientHeight;
          if (listRef.value.scrollTop < maxScroll) {
            listRef.value.scrollTop += scrollSpeed;
          }
        }
      }, 16);
    }
  }
  // Stop auto-scroll if not near edges
  else {
    stopAutoScroll();
  }
};

const stopAutoScroll = () => {
  if (autoScrollInterval.value) {
    clearInterval(autoScrollInterval.value);
    autoScrollInterval.value = null;
  }
};

// Drag handlers
const handleDragStart = (index: number, event: DragEvent) => {
  if (props.config?.allowReorder === false) return;

  draggedIndex.value = index;
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/html", "");
  }
};

const handleDragOver = (index: number, event: DragEvent) => {
  if (props.config?.allowReorder === false) return;

  event.preventDefault();
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = "move";
  }
  dragOverIndex.value = index;

  // Trigger auto-scroll if near edges
  handleAutoScroll(event);
};

const handleDragLeave = () => {
  dragOverIndex.value = null;
};

const handleDrop = (toIndex: number, event: DragEvent) => {
  if (props.config?.allowReorder === false) return;

  event.preventDefault();
  stopAutoScroll(); // Stop auto-scroll on drop

  if (draggedIndex.value === null || draggedIndex.value === toIndex) {
    draggedIndex.value = null;
    dragOverIndex.value = null;
    return;
  }

  // Reorder
  const newItems = [...items.value];
  const [movedItem] = newItems.splice(draggedIndex.value, 1);
  newItems.splice(toIndex, 0, movedItem);

  // Update order values
  newItems.forEach((item, index) => {
    item.order = index;
  });

  items.value = newItems;

  // Validate fixed columns after reorder
  validateFixedColumns();

  draggedIndex.value = null;
  dragOverIndex.value = null;
};

const handleDragEnd = () => {
  draggedIndex.value = null;
  dragOverIndex.value = null;
  stopAutoScroll();
};

// Toggle handlers
const handleToggle = (key: string) => {
  const item = items.value.find(item => item.key === key);
  if (item) {
    item.visible = !item.visible;
  }
};

const handleToggleAll = () => {
  const newValue = !allVisible.value;
  items.value.forEach((item) => {
    item.visible = newValue;
  });
};

// Fixed column handlers
const canBeFixed = (index: number): boolean => {
  // Only first 2 positions can be fixed
  return index === 0 || index === 1;
};

const isFixedLeft = (item: ColumnSetupItem): boolean => {
  return item.fixed === "left";
};

const toggleFixed = (index: number) => {
  if (!canBeFixed(index)) return;

  const item = items.value[index];
  if (!item) return;

  // Toggle fixed state
  if (item.fixed === "left") {
    item.fixed = undefined;
  }
  else {
    item.fixed = "left";
  }
};

// Validate fixed columns after reorder
const validateFixedColumns = () => {
  items.value.forEach((item, index) => {
    // If column is fixed but not in first 2 positions, remove fixed
    if (item.fixed === "left" && !canBeFixed(index)) {
      item.fixed = undefined;
    }
  });
};

const handleReset = async () => {
  // Clear storage on reset
  if (props.config?.key) {
    try {
      await tableStorage.deleteTableConfig(props.config.key);
    }
    catch (error) {
      console.error("Failed to clear storage:", error);
    }
  }
  items.value = createSetupItems();

  // Auto-apply reset changes
  emitVisibleColumns();
  originalItems.value = JSON.parse(JSON.stringify(items.value));
  hasChanges.value = false;

  // Close popover after reset
  emit("close");
};
</script>

<template>
  <div class="column-setup">
    <!-- Header -->
    <div class="column-setup-header">
      <span class="column-setup-title">Column Settings</span>
      <button
        class="column-setup-reset-btn"
        title="Reset to default"
        @click="handleReset"
      >
        <svg
          fill="none"
          height="13"
          stroke="currentColor"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2.3"
          viewBox="0 0 24 24"
          width="13"
        >
          <polyline points="1 4 1 10 7 10" />
          <path d="M3.51 15a9 9 0 1 0 .49-4.5" />
        </svg>
      </button>
    </div>

    <!-- Toggle-all row -->
    <div
      class="column-setup-toggle-all"
      @click="handleToggleAll"
    >
      <!-- 3-state eye: all visible / partial / none visible -->
      <div
        :class="{
          'column-setup-toggle-eye--none': allHidden,
        }"
        class="column-setup-toggle-eye"
      >
        <!-- All visible: eye with circle pupil -->
        <svg
          v-if="allVisible"
          fill="none"
          height="14"
          stroke="currentColor"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2.2"
          viewBox="0 0 24 24"
          width="14"
        >
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle
            cx="12"
            cy="12"
            r="3"
          />
        </svg>

        <!-- Partial (indeterminate): eye outline with horizontal dash -->
        <svg
          v-else-if="someVisible"
          fill="none"
          height="14"
          stroke="currentColor"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2.2"
          viewBox="0 0 24 24"
          width="14"
        >
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <line
            x1="9"
            x2="15"
            y1="12"
            y2="12"
          />
        </svg>

        <!-- None visible: eye-off -->
        <svg
          v-else
          fill="none"
          height="14"
          stroke="currentColor"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2.2"
          viewBox="0 0 24 24"
          width="14"
        >
          <path
            d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94
               M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19
               m-6.72-1.07a3 3 0 1 1-4.24-4.24"
          />
          <line
            x1="1"
            x2="23"
            y1="1"
            y2="23"
          />
        </svg>
      </div>

      <span class="column-setup-toggle-label">Show all columns</span>
      <span class="column-setup-toggle-count">{{ visibleCount }} / {{ items.length }}</span>
    </div>

    <!-- Column list with drag-and-drop -->
    <div
      ref="listRef"
      class="column-setup-list"
    >
      <div
        v-for="(item, index) in items"
        :key="item.key"
        :class="{
          'column-setup-item--dragging': draggedIndex === index,
          'column-setup-item--drag-over': dragOverIndex === index,
          'column-setup-item--no-reorder': config?.allowReorder === false,
        }"
        :draggable="config?.allowReorder !== false"
        class="column-setup-item"
        @dragend="handleDragEnd"
        @dragleave="handleDragLeave"
        @dragover="handleDragOver(index, $event)"
        @dragstart="handleDragStart(index, $event)"
        @drop="handleDrop(index, $event)"
      >
        <!-- Drag handle — always visible at low opacity -->
        <div
          v-if="config?.allowReorder !== false"
          class="column-setup-item-drag"
        >
          <VIcon
            :size="16"
            icon="lucide:grip-vertical"
          />
        </div>

        <!-- Eye toggle button -->
        <button
          :class="item.visible ? 'column-setup-item-eye--visible' : 'column-setup-item-eye--hidden'"
          :title="item.visible ? 'Hide column' : 'Show column'"
          class="column-setup-item-eye"
          @click.stop="handleToggle(item.key)"
        >
          <!-- Visible: eye open -->
          <svg
            v-if="item.visible"
            fill="none"
            height="14"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2.2"
            viewBox="0 0 24 24"
            width="14"
          >
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle
              cx="12"
              cy="12"
              r="3"
            />
          </svg>

          <!-- Hidden: eye-off -->
          <svg
            v-else
            fill="none"
            height="14"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2.2"
            viewBox="0 0 24 24"
            width="14"
          >
            <path
              d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94
               M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19
               m-6.72-1.07a3 3 0 1 1-4.24-4.24"
            />
            <line
              x1="1"
              x2="23"
              y1="1"
              y2="23"
            />
          </svg>
        </button>

        <!-- Label — reduced opacity when hidden -->
        <div
          :class="{ 'column-setup-item-label--hidden': !item.visible }"
          class="column-setup-item-label"
        >
          {{ item.label }}
        </div>

        <!-- Pin button — opacity 0 by default, shown on row hover via CSS -->
        <button
          v-if="canBeFixed(index)"
          :class="{ 'column-setup-item-fixed-btn--active': isFixedLeft(item) }"
          :title="isFixedLeft(item) ? 'Unpin column' : 'Pin column to left'"
          class="column-setup-item-fixed-btn"
          @click.stop="toggleFixed(index)"
        >
          <VIcon
            :icon="isFixedLeft(item) ? 'lucide:pin' : 'lucide:pin-off'"
            :size="16"
          />
        </button>

        <!-- Warning badge: fixed column dragged out of first 2 positions -->
        <div
          v-if="item.fixed && !canBeFixed(index)"
          class="column-setup-item-badge column-setup-item-badge--warning"
          title="Fixed will be removed — move to top 2 positions"
        >
          <VIcon
            :size="16"
            icon="lucide:triangle-alert"
          />
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="column-setup-footer">
      <span
        v-if="config?.allowReorder !== false"
        class="column-setup-hint"
      >
        <VIcon
          :size="11"
          icon="lucide:grip-vertical"
        />
        Drag to reorder
      </span>

      <VButton
        :disabled="!hasUnsavedChanges"
        text="Apply"
        variant="primary"
        class="h-[30px]"
        @click="handleApply"
      />
    </div>
  </div>
</template>

<!--
  teleported: this dialog is rendered inside VFloating's popover, which portals
  its content to <body>. That puts the markup outside VTable's subtree, where a
  scoped attribute selector no longer matches — the rules have to be global to
  reach it at all.
-->
<style lang="scss">
@use "../assets/styles/column-setup";
</style>
