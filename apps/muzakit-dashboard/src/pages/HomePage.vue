<script lang="ts" setup>
import { ref } from "vue";

import { VToggleGroup, VTooltip, type ToggleOption } from "@muzakit/ui";

const granularity = ref<"DAY" | "WEEK" | "MONTH">("WEEK");

const granularityOptions: ToggleOption<"DAY" | "WEEK" | "MONTH">[] = [
  { label: "Day", value: "DAY", icon: "lucide:calendar", tooltip: "Group by day" },
  { label: "Week", value: "WEEK", icon: "lucide:calendar-range", tooltip: "Group by week" },
  { label: "Month", value: "MONTH", icon: "lucide:calendar-days", tooltip: "Group by month" },
];
</script>

<template>
  <div class="home-page">
    <h1 class="home-page__title">
      Component Demo
    </h1>

    <!-- VToggleGroup -->
    <section class="home-page__section">
      <h2 class="home-page__section-title">
        VToggleGroup
      </h2>
      <div class="home-page__row">
        <VToggleGroup
          v-model="granularity"
          :options="granularityOptions"
          size="lg"
        />
      </div>
      <p class="home-page__caption">
        Selected: <strong>{{ granularity }}</strong>
      </p>
    </section>

    <!-- VTooltip -->
    <section class="home-page__section">
      <h2 class="home-page__section-title">
        VTooltip
      </h2>
      <div class="home-page__row">
        <VTooltip
          placement="right"
          text="Tooltip on the right (default)"
        >
          <button class="home-page__demo-btn">
            Hover me → right
          </button>
        </VTooltip>
        <VTooltip
          placement="top"
          text="Tooltip on top"
        >
          <button class="home-page__demo-btn">
            Hover me → top
          </button>
        </VTooltip>
        <VTooltip
          :allow-html="true"
          placement="bottom"
          text="<b>HTML</b> tooltip with <em>markup</em>"
        >
          <button class="home-page__demo-btn">
            Hover me → html
          </button>
        </VTooltip>
      </div>
    </section>
  </div>
</template>

<style scoped>
.home-page {
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 2.5rem;
}

.home-page__title {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--ui-foreground);
}

.home-page__section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.home-page__section-title {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--ui-foreground-muted);
}

.home-page__row {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.home-page__caption {
  font-size: 0.875rem;
  color: var(--ui-foreground-secondary);
}

.home-page__demo-btn {
  padding: 0.5rem 1rem;
  border-radius: var(--ui-radius);
  border: 1px solid var(--ui-border);
  background: var(--ui-surface);
  color: var(--ui-foreground);
  font-size: 0.875rem;
  cursor: pointer;

  &:hover {
    background: var(--ui-surface-hover);
  }
}
</style>
