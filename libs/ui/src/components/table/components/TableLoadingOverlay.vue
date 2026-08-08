<script lang="ts" setup>
import VLoader from "../../feedback/VLoader.vue";

const { loading = false } = defineProps<{
  loading?: boolean
}>();
</script>

<template>
  <Transition name="fade">
    <div
      v-if="loading"
      class="v-table-loading-overlay"
    >
      <div class="v-table-loading-backdrop" />
      <div class="v-table-loading-spinner">
        <VLoader size="lg" />
      </div>
    </div>
  </Transition>
</template>
