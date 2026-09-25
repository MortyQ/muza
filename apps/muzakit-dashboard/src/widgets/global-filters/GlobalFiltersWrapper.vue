<script lang="ts" setup>
import { useGlobalFiltersStore } from "@/shared/store/useGlobalFiltersStore";
import DateRangeFilter from "@/widgets/global-filters/DateRangeFilter.vue";
import GranularityFilter from "@/widgets/global-filters/GranularityFilter.vue";

const filtersStore = useGlobalFiltersStore();
</script>

<template>
  <div class="global-filters">
    <DateRangeFilter v-if="filtersStore.isFilterVisible('dateRange')" />
    <GranularityFilter v-if="filtersStore.isFilterVisible('granularity')" />
  </div>
</template>

<style scoped>
.global-filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--ui-space-md);

  &:empty {
    display: none;
  }
}
</style>
