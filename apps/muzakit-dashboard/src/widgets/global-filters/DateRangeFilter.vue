<script lang="ts" setup>
import { ref } from "vue";

import { VDatepicker } from "@muzakit/ui";

import { useGlobalFiltersStore } from "@/shared/store/useGlobalFiltersStore";

const filtersStore = useGlobalFiltersStore();

const localRange = ref<Date[]>(filtersStore.dateRange);

const handleClose = () => {
  if (localRange.value.length === 2 && localRange.value[0] && localRange.value[1]) {
    filtersStore.setDateRange(localRange.value as [Date, Date]);
  }
};
</script>

<template>
  <VDatepicker
    v-model="localRange"
    :config="{ escClose: false }"
    :input-attrs="{ alwaysClearable: false }"
    :time-config="{ enableTimePicker: false }"
    clearable
    range
    size="md"
    width="300px"
    @closed="handleClose"
  >
    <template #clear-icon />
  </VDatepicker>
</template>
