<script lang="ts" setup>
import { computed, useId } from "vue";

import VIcon from "../base/VIcon.vue";

export type AccordionVariant = "default" | "outlined" | "inset" | "popout";

export type AccordionItem = {
  id: string | number
  title: string
  subtitle?: string
  content?: string
  disabled?: boolean
  icon?: string
};

const {
  items = [],
  multiple = false,
  variant = "default",
  disabled = false,
  flat = false,
} = defineProps<{
  items?: ReadonlyArray<AccordionItem>
  /** Allow several panels open at once; otherwise opening one closes the rest */
  multiple?: boolean
  variant?: AccordionVariant
  disabled?: boolean
  /** Remove elevation */
  flat?: boolean
}>();

const emit = defineEmits<{
  change: [openItems: (string | number)[]]
}>();

const openItems = defineModel<(string | number)[]>({ default: () => [] });

const accordionId = useId();

const isOpen = (itemId: string | number): boolean => openItems.value.includes(itemId);

const setOpen = (value: (string | number)[]): void => {
  openItems.value = value;
  emit("change", value);
};

const toggleItem = (itemId: string | number, itemDisabled?: boolean): void => {
  if (disabled || itemDisabled) return;

  const currentlyOpen = isOpen(itemId);

  if (!multiple) {
    setOpen(currentlyOpen ? [] : [itemId]);
    return;
  }

  setOpen(
    currentlyOpen
      ? openItems.value.filter(id => id !== itemId)
      : [...openItems.value, itemId],
  );
};

const rootClass = computed(() => [
  `v-accordion--${variant}`,
  {
    "v-accordion--flat": flat,
    "v-accordion--disabled": disabled,
  },
]);
</script>

<template>
  <div
    :id="accordionId"
    :class="rootClass"
    class="v-accordion"
  >
    <div
      v-for="(item, index) in items"
      :key="item.id"
      :class="{
        'v-accordion__panel--active': isOpen(item.id),
        'v-accordion__panel--disabled': item.disabled || disabled,
      }"
      class="v-accordion__panel"
    >
      <button
        :id="`${accordionId}-header-${item.id}`"
        :aria-controls="`${accordionId}-content-${item.id}`"
        :aria-expanded="isOpen(item.id)"
        :disabled="item.disabled || disabled"
        class="v-accordion__header"
        type="button"
        @click="toggleItem(item.id, item.disabled)"
      >
        <!-- eslint-disable-next-line vue/attribute-hyphenation -->
        <slot
          :index="index"
          :is-open="isOpen(item.id)"
          :item="item"
          :name="`header-${item.id}`"
        >
          <!-- eslint-disable-next-line vue/attribute-hyphenation -->
          <slot
            :index="index"
            :is-open="isOpen(item.id)"
            :item="item"
            name="header"
          >
            <VIcon
              v-if="item.icon"
              :icon="item.icon"
              :size="20"
              class="v-accordion__leading-icon"
            />

            <span class="v-accordion__header-content">
              <span class="v-accordion__title">{{ item.title }}</span>
              <span
                v-if="item.subtitle"
                class="v-accordion__subtitle"
              >
                {{ item.subtitle }}
              </span>
            </span>

            <VIcon
              :size="20"
              class="v-accordion__expand-icon"
              icon="lucide:chevron-down"
            />
          </slot>
        </slot>
      </button>

      <!--
        __wrap stays a pure clipper — it is the grid item whose row collapses to
        0fr, so padding on it would survive the collapse and leave a gap under a
        closed panel. The inset lives on the inner element so slotted content
        gets it too.
      -->
      <div
        :id="`${accordionId}-content-${item.id}`"
        :aria-labelledby="`${accordionId}-header-${item.id}`"
        class="v-accordion__content"
        role="region"
      >
        <div class="v-accordion__content-wrap">
          <div class="v-accordion__content-inner">
            <slot
              :index="index"
              :item="item"
              :name="`content-${item.id}`"
            >
              <slot
                :index="index"
                :item="item"
                name="content"
              >
                <div class="v-accordion__text">
                  {{ item.content }}
                </div>
              </slot>
            </slot>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@import "../../styles/components/layout/vaccordion.scss";
</style>
