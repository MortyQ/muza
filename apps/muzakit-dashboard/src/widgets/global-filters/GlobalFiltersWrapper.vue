<script lang="ts" setup>
import { useGlobalFiltersStore } from "@/shared/store/useGlobalFiltersStore";
import DateRangeFilter from "@/widgets/global-filters/DateRangeFilter.vue";
import GranularityFilter from "@/widgets/global-filters/GranularityFilter.vue";

const filtersStore = useGlobalFiltersStore();
</script>

<template>
  <div>
    <DateRangeFilter v-if="filtersStore.isFilterVisible('dateRange')" />
    <GranularityFilter v-if="filtersStore.isFilterVisible('granularity')" />
  </div>
</template>
