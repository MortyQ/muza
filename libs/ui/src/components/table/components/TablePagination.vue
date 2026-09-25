<script lang="ts" setup>
import { computed, useId } from "vue";

import { formatNumber } from "@muzakit/utils";

import type { SelectOption } from "../../../types/select";
import VIcon from "../../base/VIcon.vue";
import VSelect from "../../inputs/VSelect.vue";

interface Emits {

  (e: "page-change", payload: { page: number, pageSize: number }): void
}

const {
  page,
  pageSize,
  total,
  pageSizeOptions = [10, 25, 50, 100],
  showSizeChanger = false,
  loading = false,
} = defineProps<{
  page: number // Current page (1-based)
  pageSize: number // Items per page
  total: number // Total items
  pageSizeOptions?: ReadonlyArray<number> // Available page sizes
  showSizeChanger?: boolean // Show page size selector
  loading?: boolean // Loading state (disables all controls)
}>();

const emit = defineEmits<Emits>();

// Computed values
const totalPages = computed(() => Math.ceil(total / pageSize));

const currentRangeStart = computed(() => {
  if (total === 0) return 0;
  return formatNumber((page - 1) * pageSize + 1);
});

const currentRangeEnd = computed(() => {
  const end = page * pageSize;
  return formatNumber(Math.min(end, total));
});

// Determine which page numbers to show
const visiblePages = computed(() => {
  const pages: (number | "ellipsis")[] = [];
  const total = totalPages.value;
  const current = page;

  if (total <= 7) {
    // Show all pages if 7 or less
    for (let i = 1; i <= total; i++) {
      pages.push(i);
    }
    return pages;
  }

  // Always show first page
  pages.push(1);

  if (current <= 3) {
    // Near the beginning: 1, 2, 3, 4, ..., last
    pages.push(2, 3, 4);
    pages.push("ellipsis");
    pages.push(total);
  }
  else if (current >= total - 2) {
    // Near the end: 1, ..., last-3, last-2, last-1, last
    pages.push("ellipsis");
    pages.push(total - 3, total - 2, total - 1, total);
  }
  else {
    // Middle: 1, ..., current-1, current, current+1, ..., last
    pages.push("ellipsis");
    pages.push(current - 1, current, current + 1);
    pages.push("ellipsis");
    pages.push(total);
  }

  return pages;
});

// Handlers
const goToPage = (target: number) => {
  if (loading) return; // Prevent clicks during loading
  if (target === page) return; // Same page
  if (target < 1 || target > totalPages.value) return; // Invalid page

  emit("page-change", { page: target, pageSize });
};

const goToPreviousPage = () => {
  if (page > 1) {
    goToPage(page - 1);
  }
};

const goToNextPage = () => {
  if (page < totalPages.value) {
    goToPage(page + 1);
  }
};

const changePageSize = (newSize: number) => {
  if (loading) return; // Prevent changes during loading
  if (newSize === pageSize) return; // Same size

  // When changing page size, reset to page 1
  emit("page-change", { page: 1, pageSize: newSize });
};

const sizeLabelId = useId();

const sizeOptions = computed<SelectOption[]>(() =>
  pageSizeOptions.map(size => ({ label: String(size), value: size })),
);

const sizeOption = computed<SelectOption | SelectOption[] | null>({
  get: () => sizeOptions.value.find(option => option.value === pageSize) ?? null,
  set: (option) => {
    if (option && !Array.isArray(option)) changePageSize(Number(option.value));
  },
});

// Computed for disabled states
const isPrevDisabled = computed(() => loading || page <= 1);
const isNextDisabled = computed(() => loading || page >= totalPages.value);
</script>

<template>
  <div class="v-table-pagination">
    <!-- Left: Info about displayed items -->
    <div class="v-table-pagination-info">
      Showing
      <span class="v-table-pagination-info-highlight">
        {{ currentRangeStart }}–{{ currentRangeEnd }}
      </span>
      of
      <span class="v-table-pagination-info-highlight">{{ formatNumber(total) }}</span>
    </div>

    <!-- Center: Page controls -->
    <div class="v-table-pagination-controls">
      <!-- Previous button -->
      <button
        :disabled="isPrevDisabled"
        aria-label="Previous page"
        class="v-table-pagination-btn"
        @click="goToPreviousPage"
      >
        <VIcon
          :size="15"
          icon="mdi:chevron-left"
        />
      </button>

      <!-- Page numbers -->
      <template
        v-for="(pageItem, index) in visiblePages"
        :key="index"
      >
        <button
          v-if="pageItem !== 'ellipsis'"
          :class="{ 'v-table-pagination-btn--active': pageItem === page }"
          :disabled="loading"
          class="v-table-pagination-btn"
          @click="goToPage(pageItem)"
        >
          {{ pageItem }}
        </button>
        <span
          v-else
          class="v-table-pagination-ellipsis"
        >
          ...
        </span>
      </template>

      <!-- Next button -->
      <button
        :disabled="isNextDisabled"
        aria-label="Next page"
        class="v-table-pagination-btn"
        @click="goToNextPage"
      >
        <VIcon
          :size="15"
          icon="mdi:chevron-right"
        />
      </button>
    </div>

    <!-- Right: Items per page selector -->
    <div
      v-if="showSizeChanger"
      class="v-table-pagination-size"
    >
      <span
        :id="sizeLabelId"
        class="v-table-pagination-size-label"
      >Rows</span>
      <div class="v-table-pagination-size-field">
        <VSelect
          v-model="sizeOption"
          :aria-labelledby="sizeLabelId"
          :disabled="loading"
          :options="sizeOptions"
          :searchable="false"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Styles defined in assets/styles/_pagination.scss */
</style>
