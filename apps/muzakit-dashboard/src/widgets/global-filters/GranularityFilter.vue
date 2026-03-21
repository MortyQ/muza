<script lang="ts" setup>
import { computed } from "vue";

import { type SegmentOption, VSegmentedControl } from "@muzakit/ui";

import type { GranularityValue } from "@/shared/config/global-filter/globalFilters.config";
import { useGlobalFiltersStore } from "@/shared/store/useGlobalFiltersStore";

const filtersStore = useGlobalFiltersStore();

const allOptions: Record<GranularityValue, SegmentOption> = {
  MONTH: { label: "Month", value: "MONTH", icon: "lucide:calendar" },
  WEEK: { label: "Week", value: "WEEK", icon: "lucide:calendar-range" },
  DAY: { label: "Day", value: "DAY", icon: "lucide:calendar-days" },
};

const options = computed<SegmentOption[]>(() => {
  return filtersStore.allowedGranularityValues.map(value => allOptions[value]);
});

const selectedGranularity = computed({
  get: () => filtersStore.granularity,
  set: (value: string | number) => {
    filtersStore.setGranularity(value as "MONTH" | "WEEK" | "DAY");
  },
});
</script>

<template>
  <VSegmentedControl
    v-model="selectedGranularity"
    :options="options"
    size="md"
  />
</template>
