<script lang="ts" setup>
import { computed } from "vue";

import { useRoute } from "vue-router";

import GlobalFiltersWrapper from "@/widgets/global-filters/GlobalFiltersWrapper.vue";

import WorkspaceContext from "./WorkspaceContext.vue";

const route = useRoute();

const title = computed<string>(() =>
  typeof route.meta.title === "string" ? route.meta.title : "",
);
</script>

<template>
  <header class="app-topbar">
    <h1 class="app-topbar__title">
      {{ title }}
    </h1>

    <div class="app-topbar__end">
      <GlobalFiltersWrapper />
      <WorkspaceContext />
    </div>
  </header>
</template>

<style lang="scss" scoped>
.app-topbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--ui-space-lg);
  min-height: calc(var(--ui-control-h-lg) + 2 * var(--ui-space-lg));
  padding: var(--ui-space-lg) 0;
  margin-bottom: var(--ui-space-xl);
  border-bottom: 1px solid var(--ui-border-subtle);

  &__title {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    font-size: var(--ui-text-xl);
    font-weight: 600;
    line-height: var(--ui-leading-xl);
    letter-spacing: -0.01em;
    color: var(--ui-foreground);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__end {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: flex-end;
    gap: var(--ui-space-md);
  }
}
</style>
