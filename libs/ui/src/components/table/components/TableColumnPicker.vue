<script lang="ts" setup>
import { computed, onMounted, ref, watch } from "vue";

import VButton from "../../base/VButton.vue";
import VIcon from "../../base/VIcon.vue";
import VInput from "../../inputs/VInput.vue";
import type { Column } from "../types";
import type { ColumnPickerGroup, ColumnPickerItem } from "../types/toolbar";
import { readColumnState, writeColumnState, type SavedColumnState } from "../utils/columnState";
import tableStorage from "../utils/storage";

interface DraftItem {
  key: string
  label: string
  icon?: string
  fixed?: "left" | "right"
}

interface Emits {
  (e: "update:visible-columns", columns: Column[]): void

  (e: "close"): void
}

const {
  groups,
  columns,
  originalColumns = undefined,
  loading = false,
  storageKey = undefined,
  storageType = undefined,
} = defineProps<{
  groups: ColumnPickerGroup[]
  columns: Column[]
  /** Full unfiltered column set, used to restore items removed from `columns` */
  originalColumns?: Column[]
  loading?: boolean
  storageKey?: string
  storageType?: "indexedDB" | "localStorage" | "sessionStorage"
}>();

const emit = defineEmits<Emits>();

// ── Left panel state ──────────────────────────────────────────────
const leftSearch = ref("");
const leftSortMode = ref<"by-type" | "alpha">("alpha");
const expandedGroups = ref<Set<string>>(new Set());
const expandedFull = ref<Set<string>>(new Set());

watch(leftSortMode, () => {
  expandedFull.value = new Set();
});

const toggleGroup = (key: string) => {
  if (expandedGroups.value.has(key)) {
    expandedGroups.value.delete(key);
    // Reset show-all state when collapsing so it starts fresh next expand
    const s = new Set(expandedFull.value);
    s.delete(key);
    expandedFull.value = s;
  }
  else {
    expandedGroups.value.add(key);
  }
  expandedGroups.value = new Set(expandedGroups.value);
};

const filteredGroups = computed(() => {
  const q = leftSearch.value.trim().toLowerCase();
  if (!q) return groups;

  return groups
    .map(group => ({
      ...group,
      items: group.items.filter(item => item.label.toLowerCase().includes(q)),
    }))
    .filter(group => group.items.length > 0);
});

watch(leftSearch, (val) => {
  if (val.trim()) {
    expandedGroups.value = new Set(filteredGroups.value.map(g => g.key));
  }
  else {
    expandedGroups.value = new Set();
  }
});

// ── Left panel sort + section helpers (sort/display, no draft deps) ──
const SECTION_INITIAL_LIMIT = 6;
const TYPE_ORDER: string[] = ["text", "number", "boolean", "date", "sys"];

function toggleShowAll(groupKey: string) {
  const s = new Set(expandedFull.value);
  s.add(groupKey);
  expandedFull.value = s;
}

function sortedGroupItems(group: ColumnPickerGroup): ColumnPickerItem[] {
  const items = [...group.items];
  if (leftSortMode.value === "alpha") {
    return items.sort((a, b) => {
      const la = a.label.toLowerCase().trim();
      const lb = b.label.toLowerCase().trim();
      if (la < lb) return -1;
      if (la > lb) return 1;
      return 0;
    });
  }
  return items.sort((a, b) => {
    const ai = TYPE_ORDER.indexOf(a.icon ?? "");
    const bi = TYPE_ORDER.indexOf(b.icon ?? "");
    return ai - bi;
  });
}

function displayedItems(group: ColumnPickerGroup): ColumnPickerItem[] {
  const sorted = sortedGroupItems(group);
  if (
    !leftSearch.value.trim()
    && !expandedFull.value.has(group.key)
    && sorted.length > SECTION_INITIAL_LIMIT
  ) {
    return sorted.slice(0, SECTION_INITIAL_LIMIT);
  }
  return sorted;
}

function hasHiddenItems(group: ColumnPickerGroup): boolean {
  return (
    !leftSearch.value.trim()
    && !expandedFull.value.has(group.key)
    && sortedGroupItems(group).length > SECTION_INITIAL_LIMIT
  );
}

// ── By-type sub-header rendering ──────────────────────────────────
// Uses a flat interface (not a discriminated union) to avoid TypeScript
// narrowing issues inside Vue template v-if/v-else-if conditions.
interface DisplayEntry {
  isHeader: boolean
  key: string
  typeKey?: string
  item?: ColumnPickerItem
}

const TYPE_LABELS: Record<string, string> = {
  text: "Text",
  number: "Number",
  boolean: "Boolean",
  date: "Date",
  sys: "File",
};

function itemsWithHeaders(items: ColumnPickerItem[]): DisplayEntry[] {
  if (leftSortMode.value !== "by-type") {
    return items.map(item => ({ isHeader: false, key: item.key, item }));
  }
  const result: DisplayEntry[] = [];
  let lastType: string | undefined = undefined;
  for (const item of items) {
    const t = item.icon ?? "";
    if (t !== lastType) {
      result.push({ isHeader: true, key: `hdr-${t}`, typeKey: t });
      lastType = t;
    }
    result.push({ isHeader: false, key: item.key, item });
  }
  return result;
}

// ── Right panel draft state ───────────────────────────────────────
const draftItems = ref<DraftItem[]>([]);
const originalDraft = ref<DraftItem[]>([]);

const seedDraft = (savedState?: SavedColumnState | null, useOriginal = false) => {
  if (savedState) {
    // Rebuild draft from persisted order + fixed map
    const allItemsMap = new Map<string, ColumnPickerItem>();
    groups.forEach(g => g.items.forEach(i => allItemsMap.set(i.key, i)));

    const items: DraftItem[] = savedState.order
      .filter(k => savedState.visible.includes(k))
      .map((k): DraftItem | null => {
        // Prefer live column data, fall back to picker groups
        const col = columns.find(c => c.key === k);
        const pickerItem = allItemsMap.get(k);
        const label = col?.label ?? pickerItem?.label ?? savedState.labels?.[k] ?? k;
        const icon = pickerItem?.icon ?? col?.icon;
        const fixed = savedState.fixed?.[k];
        return { key: k, label, icon, fixed };
      })
      .filter((x): x is DraftItem => x !== null);

    draftItems.value = items;
  }
  else {
    // Use originalColumns (true defaults) when resetting, current columns otherwise
    const sourceCols = useOriginal ? (originalColumns ?? columns) : columns;
    draftItems.value = sourceCols.map(col => ({
      key: col.key,
      label: col.label,
      icon: col.icon,
      fixed: col.fixed,
    }));
  }
  originalDraft.value = JSON.parse(JSON.stringify(draftItems.value));
};

// Load persisted state on mount
onMounted(async () => {
  if (storageKey) {
    try {
      const saved = await readColumnState(storageKey, storageType);
      seedDraft(saved);
      return;
    }
    catch (err) {
      console.error("[TableColumnPicker] Failed to load from storage:", err);
    }
  }
  seedDraft();
});

const rightSearch = ref("");

const filteredDraft = computed(() => {
  const q = rightSearch.value.trim().toLowerCase();
  if (!q) return draftItems.value;
  return draftItems.value.filter(item => item.label.toLowerCase().includes(q));
});

// ── Selected keys set for quick lookup ───────────────────────────
const MAX_COLUMNS = 40;
const selectedKeys = computed(() => new Set(draftItems.value.map(d => d.key)));
const isAtLimit = computed(() => draftItems.value.length >= MAX_COLUMNS);

const totalAvailable = computed(() =>
  groups.reduce((acc, g) => acc + g.items.length, 0),
);

// ── Left panel section group helpers (depend on selectedKeys / draftItems) ──

function selectedCountForGroup(group: ColumnPickerGroup): number {
  return group.items.filter(item => selectedKeys.value.has(item.key)).length;
}

function isGroupAllSelected(group: ColumnPickerGroup): boolean {
  return group.items.length > 0
    && group.items.every(item => selectedKeys.value.has(item.key));
}

function handleGroupSelectAll(group: ColumnPickerGroup) {
  if (isGroupAllSelected(group)) {
    // Deselect all — keep locked columns
    const groupKeys = new Set(group.items.map(i => i.key));
    draftItems.value = draftItems.value.filter((d) => {
      if (!groupKeys.has(d.key)) return true;
      return !!d.fixed;
    });
  }
  else {
    // Select all up to MAX_COLUMNS
    const toAdd = group.items.filter(i => !selectedKeys.value.has(i.key));
    const remaining = MAX_COLUMNS - draftItems.value.length;
    draftItems.value = [
      ...draftItems.value,
      ...toAdd.slice(0, remaining).map(i => ({ key: i.key, label: i.label, icon: i.icon })),
    ];
  }
}

// ── Selection handlers ────────────────────────────────────────────
const addItem = (item: ColumnPickerItem) => {
  if (!selectedKeys.value.has(item.key) && !isAtLimit.value) {
    draftItems.value = [...draftItems.value, { key: item.key, label: item.label, icon: item.icon }];
  }
};

const removeItem = (key: string) => {
  const draft = draftItems.value.find(d => d.key === key);
  if (draft?.fixed) return; // locked/pinned columns cannot be removed
  draftItems.value = draftItems.value.filter(d => d.key !== key);
};

const toggleItem = (item: ColumnPickerItem) => {
  if (selectedKeys.value.has(item.key)) {
    removeItem(item.key);
  }
  else {
    addItem(item);
  }
};

const handleReset = async () => {
  if (storageKey) {
    try {
      await tableStorage.deleteTableConfig(storageKey);
    }
    catch (err) {
      console.error("[TableColumnPicker] Failed to clear storage:", err);
    }
  }
  seedDraft(null, true); // restore original default columns + order
  const sourceCols = originalColumns ?? columns;
  const colMap = new Map(sourceCols.map(c => [c.key, c]));
  const pickerItemMap = new Map<string, ColumnPickerItem>();
  groups.forEach(g => g.items.forEach(i => pickerItemMap.set(i.key, i)));
  const result: Column[] = draftItems.value.map((item): Column => {
    const existing = colMap.get(item.key);
    if (existing) return { ...existing, fixed: item.fixed };
    const pickerItem = pickerItemMap.get(item.key);
    return {
      key: item.key,
      label: item.label,
      fixed: item.fixed,
      sortable: pickerItem?.sortable,
      format: pickerItem?.format,
    };
  });
  emit("update:visible-columns", result);
  emit("close");
};

// ── Pin / fixed (right panel, first 2 positions only) ────────────
const canBeFixed = (index: number): boolean => index === 0 || index === 1;

const isFixedLeft = (item: DraftItem): boolean => item.fixed === "left";

const toggleFixed = (index: number) => {
  if (!canBeFixed(index)) return;
  const item = draftItems.value[index];
  if (!item) return;
  draftItems.value = draftItems.value.map((d, i) =>
    i === index ? { ...d, fixed: d.fixed === "left" ? undefined : "left" } : d,
  );
};

const validateFixedColumns = () => {
  draftItems.value = draftItems.value.map((item, index) =>
    item.fixed === "left" && !canBeFixed(index) ? { ...item, fixed: undefined } : item,
  );
};

// ── Drag-and-drop (right panel, disabled when searching) ──────────
const draggedIndex = ref<number | null>(null);
const dragOverIndex = ref<number | null>(null);

const handleDragStart = (index: number, event: DragEvent) => {
  if (rightSearch.value.trim()) return; // no drag while filtered
  draggedIndex.value = index;
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/html", "");
  }
};

const handleDragOver = (index: number, event: DragEvent) => {
  event.preventDefault();
  if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
  dragOverIndex.value = index;
};

const handleDrop = (toIndex: number, event: DragEvent) => {
  event.preventDefault();
  if (draggedIndex.value === null || draggedIndex.value === toIndex) {
    draggedIndex.value = null;
    dragOverIndex.value = null;
    return;
  }

  const newItems = [...draftItems.value];
  const [moved] = newItems.splice(draggedIndex.value, 1);
  newItems.splice(toIndex, 0, moved);
  draftItems.value = newItems;

  validateFixedColumns();

  draggedIndex.value = null;
  dragOverIndex.value = null;
};

const handleDragEnd = () => {
  draggedIndex.value = null;
  dragOverIndex.value = null;
};

// ── Persistence helpers ───────────────────────────────────────────
const saveToStorage = async (items: DraftItem[]) => {
  if (!storageKey) return;
  const fixed: Record<string, "left" | "right"> = {};
  const labels: Record<string, string> = {};
  items.forEach((item) => {
    if (item.fixed) fixed[item.key] = item.fixed;
    labels[item.key] = item.label;
  });
  const state: SavedColumnState = {
    visible: items.map(d => d.key),
    order: items.map(d => d.key),
    fixed: Object.keys(fixed).length > 0 ? fixed : undefined,
    labels,
  };
  try {
    await writeColumnState(storageKey, state, storageType);
  }
  catch (err) {
    console.error("[TableColumnPicker] Failed to save to storage:", err);
  }
};

// ── Apply / Cancel ────────────────────────────────────────────────
const hasChanges = computed(() =>
  JSON.stringify(draftItems.value) !== JSON.stringify(originalDraft.value),
);

const handleApply = async () => {
  const colMap = new Map(columns.map(c => [c.key, c]));
  const pickerItemMap = new Map<string, ColumnPickerItem>();
  groups.forEach(g => g.items.forEach(i => pickerItemMap.set(i.key, i)));

  const result: Column[] = draftItems.value.map((item): Column => {
    const existing = colMap.get(item.key);
    if (existing) return { ...existing, fixed: item.fixed };
    const pickerItem = pickerItemMap.get(item.key);
    return {
      key: item.key, label: item.label,
      fixed: item.fixed, sortable: pickerItem?.sortable, format: pickerItem?.format,
    };
  });

  await saveToStorage(draftItems.value);

  emit("update:visible-columns", result);
  originalDraft.value = JSON.parse(JSON.stringify(draftItems.value));
  emit("close");
};

const handleCancel = () => {
  draftItems.value = JSON.parse(JSON.stringify(originalDraft.value));
  emit("close");
};

// ── Type indicator config ─────────────────────────────────────────
interface TypeConfig {
  colorVar: string // Design-system colour token, e.g. '--ui-primary'
  lucideIcon: string // Iconify icon id
}

const TYPE_CONFIG: Record<string, TypeConfig> = {
  text: { colorVar: "--ui-foreground-secondary", lucideIcon: "lucide:align-left" },
  "multi-text": { colorVar: "--ui-foreground-secondary", lucideIcon: "lucide:align-justify" },
  number: { colorVar: "--ui-primary", lucideIcon: "lucide:hash" },
  decimal: { colorVar: "--ui-primary", lucideIcon: "lucide:percent" },
  boolean: { colorVar: "--ui-success", lucideIcon: "lucide:toggle-right" },
  date: { colorVar: "--ui-warning", lucideIcon: "lucide:calendar" },
  datetime: { colorVar: "--ui-warning", lucideIcon: "lucide:calendar-clock" },
  color: { colorVar: "--ui-danger", lucideIcon: "lucide:palette" },
  json: { colorVar: "--ui-danger", lucideIcon: "lucide:braces" },
  url: { colorVar: "--ui-foreground-secondary", lucideIcon: "lucide:link" },
  link: { colorVar: "--ui-foreground-secondary", lucideIcon: "lucide:external-link" },
  select: { colorVar: "--ui-primary", lucideIcon: "lucide:list" },
  "multi-select": { colorVar: "--ui-primary", lucideIcon: "lucide:list-checks" },
  asset: { colorVar: "--ui-info", lucideIcon: "lucide:image" },
  "multi-asset": { colorVar: "--ui-info", lucideIcon: "lucide:images" },
  sys: { colorVar: "--ui-info", lucideIcon: "lucide:file" },
};

// Sets --cp-type-color on the element so both ::before and .cp-type-icon can use it:
//   var(--cp-type-color)                                         → solid colour
//   color-mix(in oklch, var(--cp-type-color) 12%, transparent)   → alpha background
function typeStyle(icon?: string): Record<string, string> {
  const cfg = icon ? TYPE_CONFIG[icon] : undefined;
  if (!cfg) return {};
  return { "--cp-type-color": `var(${cfg.colorVar})` };
}
</script>

<template>
  <div class="column-picker">
    <!-- Header -->
    <div class="column-picker-header">
      <div class="column-picker-header-title">
        <VIcon
          :size="24"
          icon="lucide:columns"
          variant="link"
        />
        <span>Edit columns</span>
      </div>
      <button
        class="column-picker-close-btn"
        title="Close"
        @click="handleCancel"
      >
        <VIcon
          :size="16"
          icon="lucide:x"
        />
      </button>
    </div>

    <!-- Two-panel body -->
    <div class="column-picker-body">
      <!-- ── Left panel: available ── -->
      <div class="column-picker-panel column-picker-panel--left">
        <div class="column-picker-panel-header">
          <span class="column-picker-panel-count">
            {{ totalAvailable }} columns available
          </span>
        </div>

        <div class="cp-toolbar">
          <div class="cp-search">
            <VIcon
              :size="11"
              icon="lucide:search"
            />
            <input
              v-model="leftSearch"
              placeholder="Search…"
            >
          </div>
          <div class="cp-sort-group">
            <button
              :class="{ 'cp-sort-btn--active': leftSortMode === 'by-type' }"
              class="cp-sort-btn"
              title="Group by type"
              type="button"
              @click="leftSortMode = 'by-type'"
            >
              <VIcon
                :size="10"
                icon="lucide:group"
              />
            </button>
            <div class="cp-sort-divider" />
            <button
              :class="{ 'cp-sort-btn--active': leftSortMode === 'alpha' }"
              class="cp-sort-btn"
              title="Sort alphabetically"
              type="button"
              @click="leftSortMode = 'alpha'"
            >
              A→Z
            </button>
          </div>
        </div>

        <div class="column-picker-panel-list">
          <!-- Loading skeleton -->
          <template v-if="loading">
            <div
              v-for="i in 6"
              :key="i"
              class="column-picker-skeleton"
            />
          </template>

          <!-- Group list -->
          <template v-else>
            <div
              v-for="group in filteredGroups"
              :key="group.key"
            >
              <!-- Section header -->
              <div
                class="cp-group-header"
                @click="toggleGroup(group.key)"
              >
                <span
                  :class="{ 'cp-group-label--has-selection': selectedCountForGroup(group) > 0 }"
                  class="cp-group-label"
                >{{ group.label }}</span>
                <button
                  class="cp-group-select-btn"
                  type="button"
                  @click.stop="handleGroupSelectAll(group)"
                >
                  {{ isGroupAllSelected(group) ? 'Deselect all' : 'Select all' }}
                </button>
                <span
                  :class="selectedCountForGroup(group) > 0
                    ? 'cp-group-badge--selected'
                    : 'cp-group-badge--empty'"
                  class="cp-group-badge"
                >{{ selectedCountForGroup(group) }}/{{ group.items.length }}</span>
                <VIcon
                  :class="{ 'cp-group-chevron--open': expandedGroups.has(group.key) }"
                  :size="10"
                  class="cp-group-chevron"
                  icon="lucide:chevron-right"
                />
              </div>

              <!-- Items (expanded) -->
              <template v-if="expandedGroups.has(group.key)">
                <template
                  v-for="entry in itemsWithHeaders(displayedItems(group))"
                  :key="entry.key"
                >
                  <!-- Type group sub-header (by-type mode only, skip empty typeKey) -->
                  <div
                    v-if="entry.isHeader && entry.typeKey"
                    class="cp-type-group-header"
                  >
                    <div
                      :style="{
                        background: `var(${TYPE_CONFIG[entry.typeKey]?.colorVar
                          ?? '--ui-foreground-secondary'})`,
                      }"
                      class="cp-type-group-dot"
                    />
                    <span class="cp-type-group-label">
                      {{ TYPE_LABELS[entry.typeKey] ?? entry.typeKey }}
                    </span>
                  </div>

                  <!-- Item row -->
                  <div
                    v-else-if="entry.item"
                    :class="{ 'cp-available-item--selected': selectedKeys.has(entry.item.key) }"
                    :style="typeStyle(entry.item.icon)"
                    class="cp-available-item"
                    @click="toggleItem(entry.item)"
                  >
                    <div
                      v-if="entry.item.icon"
                      class="cp-type-icon"
                    >
                      <VIcon
                        :icon="TYPE_CONFIG[entry.item.icon]?.lucideIcon ?? 'lucide:help-circle'"
                        :size="9"
                      />
                    </div>
                    <span class="cp-available-item-label">{{ entry.item.label }}</span>
                    <span
                      class="cp-available-item-toggle"
                      aria-hidden="true"
                    >
                      <VIcon
                        :icon="selectedKeys.has(entry.item.key) ? 'lucide:check' : 'lucide:plus'"
                        :size="selectedKeys.has(entry.item.key) ? 10 : 9"
                      />
                    </span>
                  </div>
                </template>

                <button
                  v-if="hasHiddenItems(group)"
                  class="cp-show-more-btn"
                  type="button"
                  @click.stop="toggleShowAll(group.key)"
                >
                  Show {{ sortedGroupItems(group).length - SECTION_INITIAL_LIMIT }} more
                </button>
              </template>
            </div>

            <div
              v-if="filteredGroups.length === 0"
              class="column-picker-empty"
            >
              No columns match your search
            </div>
          </template>
        </div>
      </div>

      <!-- Divider -->
      <div class="column-picker-divider" />

      <!-- ── Right panel: selected ── -->
      <div class="column-picker-panel column-picker-panel--right">
        <div class="column-picker-panel-header">
          <span
            :class="{ 'column-picker-panel-count--limit': isAtLimit }"
            class="column-picker-panel-count"
          >
            {{ draftItems.length }} selected
          </span>
          <button
            class="column-picker-text-btn"
            @click="handleReset"
          >
            <VIcon
              :size="12"
              icon="lucide:rotate-ccw"
            />
            Reset to default
          </button>
        </div>

        <div class="column-picker-panel-search">
          <VInput
            v-model="rightSearch"
            name="Search"
            placeholder="Search by column name"
            type="search"
          />
        </div>

        <div class="column-picker-panel-list">
          <div
            v-for="(item, index) in filteredDraft"
            :key="item.key"
            :class="{
              'cp-selected-item--dragging': draggedIndex === index,
              'cp-selected-item--drag-over': dragOverIndex === index,
              'cp-selected-item--locked': !!item.fixed,
            }"
            :draggable="!item.fixed && !rightSearch"
            :style="typeStyle(item.icon)"
            class="cp-selected-item"
            @dragend="handleDragEnd"
            @dragleave="dragOverIndex = null"
            @dragover="handleDragOver(index, $event)"
            @dragstart="handleDragStart(index, $event)"
            @drop="handleDrop(index, $event)"
          >
            <!-- Drag handle / lock indicator -->
            <div class="cp-selected-item-drag">
              <VIcon
                :size="14"
                :icon="item.fixed ? 'lucide:lock' : 'lucide:grip-vertical'"
              />
            </div>

            <!-- Type icon square -->
            <div
              v-if="item.icon"
              class="cp-type-icon"
            >
              <VIcon
                :icon="TYPE_CONFIG[item.icon]?.lucideIcon ?? 'lucide:help-circle'"
                :size="9"
              />
            </div>

            <span class="cp-selected-item-label">{{ item.label }}</span>

            <!-- Pin button (first 2 positions only, hidden during search) -->
            <button
              v-if="canBeFixed(index) && !rightSearch"
              :class="{ 'cp-selected-item-pin--active': isFixedLeft(item) }"
              :title="isFixedLeft(item) ? 'Unpin column' : 'Pin column to left'"
              class="cp-selected-item-pin"
              @click.stop="toggleFixed(index)"
            >
              <VIcon
                :icon="isFixedLeft(item) ? 'lucide:pin' : 'lucide:pin-off'"
                :size="12"
              />
            </button>

            <!-- Remove button (non-locked only) -->
            <button
              v-if="!item.fixed"
              class="cp-selected-item-remove"
              title="Remove column"
              @click="removeItem(item.key)"
            >
              <VIcon
                :size="12"
                icon="lucide:x"
              />
            </button>
          </div>

          <div
            v-if="draftItems.length === 0"
            class="column-picker-empty"
          >
            No columns selected. Use the left panel to add columns.
          </div>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="column-picker-footer">
      <span
        v-if="isAtLimit"
        class="column-picker-footer-hint column-picker-footer-hint--limit"
      >
        <VIcon
          :size="24"
          icon="lucide:alert-circle"
        />
        Max {{ MAX_COLUMNS }} columns reached
      </span>
      <span
        v-else
        class="column-picker-footer-hint"
      >
        <VIcon
          :size="24"
          icon="lucide:info"
        />
        Drag to reorder · Pin first 2 columns
      </span>
      <VButton
        :disabled="!hasChanges"
        class="h-[30px]"
        text="Apply"
        variant="primary"
        @click="handleApply"
      />
    </div>
  </div>
</template>

<style lang="scss">
@use "../assets/styles/column-picker";
</style>
