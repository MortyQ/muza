<script lang="ts" setup>
import { ref } from "vue";

import {
  DragNDrop,
  NavigationGuardModal,
  VAccordion,
  VAvatar,
  VButton,
  VCard,
  VChip,
  VFileUpload,
  VFloating,
  VInfoNotice,
  VListEditor,
  VLoader,
  VProgressBar,
  VScrollPanel,
  VTag,
  type AccordionItem,
  type ListEditorItem,
} from "@muzakit/ui";

// ── VChip ────────────────────────────────────────────────────────────────
const selectedChip = ref<string | null>("design");
const selectedTags = ref<string[]>(["vue"]);

// ── VAccordion ───────────────────────────────────────────────────────────
const openPanels = ref<(string | number)[]>(["shipping"]);
const accordionItems: AccordionItem[] = [
  {
    id: "shipping",
    title: "Shipping",
    subtitle: "Delivery windows and carriers",
    icon: "lucide:truck",
    content: "Orders placed before 14:00 ship the same day.",
  },
  {
    id: "returns",
    title: "Returns",
    subtitle: "30-day window",
    icon: "lucide:rotate-ccw",
    content: "Unopened items can be returned within 30 days of delivery.",
  },
  {
    id: "warranty",
    title: "Warranty",
    icon: "lucide:shield-check",
    content: "All hardware carries a two-year limited warranty.",
    disabled: true,
  },
];

// ── VProgressBar ─────────────────────────────────────────────────────────
const progress = ref(42);

// ── VListEditor ──────────────────────────────────────────────────────────
const wins = ref<ListEditorItem[]>([
  { text: "Cut cold-start latency in half" },
  { text: "Shipped the new onboarding" },
]);

// ── Uploads ──────────────────────────────────────────────────────────────
const uploaded = ref<File[]>([]);
const uploadError = ref("");

// ── NavigationGuardModal ─────────────────────────────────────────────────
const hasUnsavedChanges = ref(false);
</script>

<template>
  <div class="components-demo">
    <NavigationGuardModal :when="hasUnsavedChanges" />

    <!-- ── VAvatar ── -->
    <section class="components-demo__section">
      <h2 class="components-demo__title">
        VAvatar
      </h2>
      <p class="components-demo__desc">
        Sizes, shapes, the online dot, and the deterministic tone derived from the
        name — the same name always lands on the same colour.
      </p>
      <div class="components-demo__row">
        <VAvatar
          name="Alice Johnson"
          size="xs"
        />
        <VAvatar
          name="Bob Martinez"
          size="sm"
        />
        <VAvatar
          name="Clara Kim"
          size="md"
          online
        />
        <VAvatar
          name="David Chen"
          size="lg"
        />
        <VAvatar
          name="Elena Vasquez"
          shape="square"
          size="xl"
        />
        <VAvatar size="lg" />
      </div>
    </section>

    <!-- ── VChip ── -->
    <section class="components-demo__section">
      <h2 class="components-demo__title">
        VChip
      </h2>
      <p class="components-demo__desc">
        Three variants across the tone scale, plus single- and multi-select via v-model.
      </p>

      <div class="components-demo__row">
        <VChip
          color="primary"
          label="Filled"
          variant="filled"
        />
        <VChip
          color="success"
          label="Soft"
          variant="soft"
        />
        <VChip
          color="danger"
          label="Outlined"
          variant="outlined"
        />
        <VChip
          color="warning"
          icon="lucide:zap"
          label="With icon"
        />
        <VChip
          badge="New"
          color="info"
          label="With badge"
        />
        <VChip
          closable
          label="Closable"
        />
        <VChip
          disabled
          label="Disabled"
        />
      </div>

      <p class="components-demo__hint">
        Single select — model: <code>{{ selectedChip ?? "null" }}</code>
      </p>
      <div class="components-demo__row">
        <VChip
          v-model="selectedChip"
          label="Design"
          value="design"
        />
        <VChip
          v-model="selectedChip"
          label="Engineering"
          value="engineering"
        />
        <VChip
          v-model="selectedChip"
          label="Research"
          value="research"
        />
      </div>

      <p class="components-demo__hint">
        Multi select — model: <code>{{ selectedTags.join(", ") || "empty" }}</code>
      </p>
      <div class="components-demo__row">
        <VChip
          v-model="selectedTags"
          label="Vue"
          multiple
          value="vue"
        />
        <VChip
          v-model="selectedTags"
          label="TypeScript"
          multiple
          value="ts"
        />
        <VChip
          v-model="selectedTags"
          label="Vite"
          multiple
          value="vite"
        />
      </div>
    </section>

    <!-- ── VTag customColor ── -->
    <section class="components-demo__section">
      <h2 class="components-demo__title">
        VTag · customColor
      </h2>
      <p class="components-demo__desc">
        Any design-system token can drive a tag, beyond the built-in colour set.
      </p>
      <div class="components-demo__row">
        <VTag
          color="primary"
          label="Built-in"
        />
        <VTag
          custom-color="--ui-info"
          label="--ui-info"
          variant="solid"
        />
        <VTag
          custom-color="--ui-success"
          label="--ui-success"
          variant="soft"
        />
        <VTag
          custom-color="--ui-warning"
          label="--ui-warning"
          variant="outline"
        />
        <VTag
          icon="lucide:arrow-right"
          icon-position="right"
          label="Icon right"
        />
      </div>
    </section>

    <!-- ── VProgressBar ── -->
    <section class="components-demo__section">
      <h2 class="components-demo__title">
        VProgressBar
      </h2>
      <p class="components-demo__desc">
        Turns green and swaps the shine for a check once it reaches 100%.
      </p>
      <div class="components-demo__stack">
        <VProgressBar
          :percentage="progress"
          step="Uploading assets"
        />
        <VProgressBar
          :percentage="100"
          step="Finished"
        />
        <div class="components-demo__row">
          <VButton
            text="-10"
            variant="secondary"
            @click="progress = Math.max(0, progress - 10)"
          />
          <VButton
            text="+10"
            @click="progress = Math.min(100, progress + 10)"
          />
        </div>
      </div>
    </section>

    <!-- ── VAccordion ── -->
    <section class="components-demo__section">
      <h2 class="components-demo__title">
        VAccordion
      </h2>
      <p class="components-demo__desc">
        Single-open by default; pass <code>multiple</code> to keep several panels open.
      </p>
      <VAccordion
        v-model="openPanels"
        :items="accordionItems"
        variant="outlined"
      />
    </section>

    <!-- ── VInfoNotice ── -->
    <section class="components-demo__section">
      <h2 class="components-demo__title">
        VInfoNotice
      </h2>
      <div class="components-demo__stack">
        <VInfoNotice
          subtitle="Rows you cannot see are still exported."
          title="Hidden columns are included"
          tone="info"
        />
        <VInfoNotice
          :features="[
            { icon: 'lucide:zap', title: 'Fast', description: 'Virtualized', tone: 'primary' },
            { icon: 'lucide:lock', title: 'Safe', description: 'Typed', tone: 'success' },
            { icon: 'lucide:layers', title: 'Grouped', description: 'Headers', tone: 'info' },
            { icon: 'lucide:pin', title: 'Pinned', description: 'Cross', tone: 'warning' },
          ]"
          hint="Every capability is opt-in via props."
          subtitle="What the table ships with"
          title="Feature grid layout"
        />
      </div>
    </section>

    <!-- ── VCard ── -->
    <section class="components-demo__section">
      <h2 class="components-demo__title">
        VCard · header props
      </h2>
      <p class="components-demo__desc">
        title, subtitle, description and icon render a header without touching slots.
      </p>
      <div class="components-demo__grid">
        <VCard
          description="Everything below the header still comes from the default slot."
          icon="lucide:box"
          size="md"
          subtitle="With icon and description"
          title="Inventory"
          variant="elevated"
        >
          Body content.
        </VCard>
        <VCard
          clickable
          icon="lucide:mouse-pointer-click"
          size="md"
          subtitle="Emits click"
          title="Interactive"
          variant="outlined"
        >
          Hover me.
        </VCard>
      </div>
    </section>

    <!-- ── VFloating openOnHover ── -->
    <section class="components-demo__section">
      <h2 class="components-demo__title">
        VFloating · openOnHover
      </h2>
      <p class="components-demo__desc">
        Opens on hover after a delay and stays open while the pointer travels to the
        content. Click-to-toggle still works; touch devices fall back to click only.
      </p>
      <div class="components-demo__row">
        <VFloating
          :hover-delay="150"
          open-on-hover
        >
          <template #trigger>
            <VButton
              text="Hover me"
              variant="secondary"
            />
          </template>
          <template #content>
            <div class="components-demo__popover">
              Opened on hover.
            </div>
          </template>
        </VFloating>

        <VFloating>
          <template #trigger>
            <VButton text="Click me" />
          </template>
          <template #content>
            <div class="components-demo__popover">
              Click-only, as before.
            </div>
          </template>
        </VFloating>
      </div>
    </section>

    <!-- ── VLoader variants ── -->
    <section class="components-demo__section">
      <h2 class="components-demo__title">
        VLoader · variants
      </h2>
      <div class="components-demo__row">
        <VLoader variant="primary" />
        <VLoader variant="success" />
        <VLoader variant="warning" />
        <VLoader variant="danger" />
        <VLoader variant="info" />
      </div>
    </section>

    <!-- ── Uploads ── -->
    <section class="components-demo__section">
      <h2 class="components-demo__title">
        DragNDrop · VFileUpload
      </h2>
      <p
        v-if="uploadError"
        class="components-demo__error"
      >
        {{ uploadError }}
      </p>
      <div class="components-demo__grid">
        <DragNDrop
          :max-size="2 * 1024 * 1024"
          accept="image/*,.pdf"
          button
          multiple
          @error="uploadError = $event"
        />
        <div class="components-demo__stack">
          <VFileUpload
            v-model="uploaded"
            accept="image/*"
            multiple
            @error="uploadError = $event"
          />
          <VFileUpload
            sub-label="Compact variant"
            variant="compact"
          />
        </div>
      </div>
    </section>

    <!-- ── VListEditor ── -->
    <section class="components-demo__section">
      <h2 class="components-demo__title">
        VListEditor
      </h2>
      <p class="components-demo__desc">
        Manual rows or bulk paste — bulk mode detects the separator and re-matches
        existing entries by text so server ids survive the edit.
      </p>
      <VListEditor
        v-model="wins"
        :max-items="8"
        item-label="Win"
        label="Wins"
        marker="success"
      />
    </section>

    <!-- ── VScrollPanel ── -->
    <section class="components-demo__section">
      <h2 class="components-demo__title">
        VScrollPanel
      </h2>
      <VScrollPanel max-height="140px">
        <p
          v-for="n in 12"
          :key="n"
          class="components-demo__desc"
        >
          Scrollable line {{ n }}
        </p>
      </VScrollPanel>
    </section>

    <!-- ── NavigationGuardModal ── -->
    <section class="components-demo__section">
      <h2 class="components-demo__title">
        NavigationGuardModal
      </h2>
      <p class="components-demo__desc">
        Turn the guard on, then use the sidebar to navigate away — the prompt blocks
        the route change until you resolve it.
      </p>
      <div class="components-demo__row">
        <VButton
          :text="hasUnsavedChanges ? 'Guard is ON' : 'Guard is OFF'"
          :variant="hasUnsavedChanges ? 'negative' : 'secondary'"
          @click="hasUnsavedChanges = !hasUnsavedChanges"
        />
      </div>
    </section>
  </div>
</template>

<style scoped>
.components-demo {
  display: flex;
  flex-direction: column;
  gap: 2.5rem;
  padding: 2rem;
  max-width: 1400px;
}

.components-demo__section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.components-demo__title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--ui-foreground);
}

.components-demo__desc {
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.5;
  color: var(--ui-foreground-secondary);
}

.components-demo__hint {
  margin: 0;
  font-size: 0.75rem;
  color: var(--ui-foreground-muted);
}

.components-demo__error {
  margin: 0;
  font-size: 0.875rem;
  color: var(--ui-danger);
}

.components-demo__row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
}

.components-demo__stack {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.components-demo__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 1rem;
  align-items: start;
}

.components-demo__popover {
  padding: 0.75rem 1rem;
  font-size: 0.875rem;
  color: var(--ui-foreground);
}

code {
  padding: 0.05rem 0.3rem;
  border-radius: var(--ui-radius-xs);
  background-color: var(--ui-surface-hover);
  font-size: 0.8125rem;
}
</style>
