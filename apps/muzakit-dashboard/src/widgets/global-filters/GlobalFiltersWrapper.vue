<script lang="ts" setup>
import { useGlobalFiltersStore } from "@/shared/store/useGlobalFiltersStore";
import GranularityFilter from "@/widgets/global-filters/GranularityFilter.vue";

const filtersStore = useGlobalFiltersStore();
</script>

<template>
  <GranularityFilter v-if="filtersStore.isFilterVisible('granularity')" />
</template>
