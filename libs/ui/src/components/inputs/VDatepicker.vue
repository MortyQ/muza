<script lang="ts" setup>
import { computed, ref, useAttrs, useSlots, type Slots } from "vue";

import { type ModelValue, VueDatePicker } from "@vuepic/vue-datepicker";

import "@vuepic/vue-datepicker/dist/main.css";

import type { FieldValidation } from "../../types/validation";
import VIcon from "../base/VIcon.vue";

defineOptions({
  inheritAttrs: false,
});

const {
  name = "",
  helperText = "",
  validation = undefined,
  size = undefined,
  icon = "lucide:calendar",
  autoApply = true,
  clearable = false,
  width = undefined,
} = defineProps<{
  /** Label for the datepicker (wrapper UI) */
  name?: string
  /** Helper text below input (wrapper UI) */
  helperText?: string
  /** Validation object (Vuelidate compatible) */
  validation?: FieldValidation
  /** Size variant: sm / md / lg */
  /**
   * 28 / 32 / 40px. Left unset the control keeps the chrome's natural 30px,
   * which is what every other control in a toolbar row stands at.
   */
  size?: "sm" | "md" | "lg"
  /** Icon to display in the input */
  icon?: string
  /** Auto apply selection (no confirm button) */
  autoApply?: boolean
  clearable?: boolean
  width?: string
}>();

const model = defineModel<ModelValue>();
const slots: Slots = useSlots();
const attrs = useAttrs();

// The menu takes focus off the input while it is open, so `:focus-within`
// alone would drop the focused border the moment the calendar appears.
const isOpen = ref(false);

const hasValue = computed<boolean>(() =>
  Array.isArray(model.value) ? model.value.some(v => v != null) : model.value != null,
);

const isDisabled = computed<boolean>(() => attrs.disabled === "" || attrs.disabled === true);

// Slots with custom default implementations — do not pass-through
const excludedSlots = [
  "input-icon",
  "clear-icon",
  "arrow-left",
  "arrow-right",
  "arrow-up",
  "arrow-down",
  "clock-icon",
  "calendar-icon",
];
</script>

<template>
  <div
    :class="size ? `v-datepicker--${size}` : ''"
    :style="{ '--v-datepicker-width': width }"
    class="v-datepicker-wrapper"
  >
    <!-- Same notched outline as VInput and VSelect: the library's own border is
         turned off and this fieldset draws it, so the three read as one family. -->
    <div
      :class="{
        'v-datepicker-container--open': isOpen,
        'v-datepicker-container--filled': hasValue,
        'v-datepicker-container--labelled': !!name,
        'v-datepicker-container--error': validation?.$error,
        'v-datepicker-container--disabled': isDisabled,
      }"
      class="v-datepicker-container"
    >
      <span
        v-if="name"
        class="v-datepicker-label"
      >
        {{ name }}
      </span>

      <!-- Datepicker — library props via $attrs -->
      <VueDatePicker
        v-model="model"
        :auto-apply="autoApply"
        :calendar-class-name="'v-datepicker-calendar'"
        :class="[
          'v-datepicker',
          {
            'v-datepicker-error': validation?.$error,
            'v-datepicker-no-clear': !clearable,
          },
        ]"
        :input-class-name="[
          'v-datepicker-input',
          { 'v-datepicker-input-error': validation?.$error },
        ]"
        :menu-class-name="'v-datepicker-menu'"
        :timezone="'UTC'"
        :week-start="0"
        v-bind="$attrs"
        @closed="isOpen = false"
        @open="isOpen = true"
      >
        <!-- Input Icon -->
        <template
          v-if="slots['input-icon']"
          #input-icon
        >
          <slot name="input-icon" />
        </template>
        <template
          v-else
          #input-icon
        >
          <div class="v-datepicker-icon-wrapper">
            <VIcon
              :icon="icon"
              class="v-datepicker-icon"
            />
          </div>
        </template>

        <!-- Clear Icon -->
        <template
          v-if="!clearable"
          #clear-icon
        />
        <template
          v-else-if="clearable && slots['clear-icon']"
          #clear-icon="slotProps"
        >
          <slot
            name="clear-icon"
            v-bind="slotProps"
          />
        </template>
        <template
          v-else
          #clear-icon="{ clear }"
        >
          <button
            aria-label="Clear date"
            class="v-datepicker-clear-wrapper"
            type="button"
            @click.stop="clear"
          >
            <VIcon
              class="v-datepicker-clear-icon"
              icon="lucide:x"
            />
          </button>
        </template>

        <!-- Arrow Left -->
        <template
          v-if="slots['arrow-left']"
          #arrow-left
        >
          <slot name="arrow-left" />
        </template>
        <template
          v-else
          #arrow-left
        >
          <VIcon
            class="v-datepicker-arrow-icon"
            icon="lucide:chevron-left"
          />
        </template>

        <!-- Arrow Right -->
        <template
          v-if="slots['arrow-right']"
          #arrow-right
        >
          <slot name="arrow-right" />
        </template>
        <template
          v-else
          #arrow-right
        >
          <VIcon
            class="v-datepicker-arrow-icon"
            icon="lucide:chevron-right"
          />
        </template>

        <!-- Arrow Up -->
        <template
          v-if="slots['arrow-up']"
          #arrow-up
        >
          <slot name="arrow-up" />
        </template>
        <template
          v-else
          #arrow-up
        >
          <VIcon
            class="v-datepicker-arrow-icon"
            icon="lucide:chevron-up"
          />
        </template>

        <!-- Arrow Down -->
        <template
          v-if="slots['arrow-down']"
          #arrow-down
        >
          <slot name="arrow-down" />
        </template>
        <template
          v-else
          #arrow-down
        >
          <VIcon
            class="v-datepicker-arrow-icon"
            icon="lucide:chevron-down"
          />
        </template>

        <!-- Clock Icon -->
        <template
          v-if="slots['clock-icon']"
          #clock-icon
        >
          <slot name="clock-icon" />
        </template>
        <template
          v-else
          #clock-icon
        >
          <VIcon
            class="v-datepicker-clock-icon"
            icon="lucide:clock"
          />
        </template>

        <!-- Calendar Icon -->
        <template
          v-if="slots['calendar-icon']"
          #calendar-icon
        >
          <slot name="calendar-icon" />
        </template>
        <template
          v-else
          #calendar-icon
        >
          <VIcon
            :icon="icon"
            class="v-datepicker-calendar-icon"
          />
        </template>

        <!-- Pass-through any other slots from parent -->
        <template
          v-for="(_slotValue, slotName) in slots"
          :key="slotName"
          #[slotName]="slotProps"
        >
          <slot
            v-if="!excludedSlots.includes(slotName as string)"
            :name="slotName"
            v-bind="slotProps"
          />
        </template>
      </VueDatePicker>

      <fieldset
        aria-hidden="true"
        class="v-datepicker-fieldset"
      >
        <legend
          v-if="name"
          class="v-datepicker-legend"
        >
          <span>{{ name }}</span>
        </legend>
      </fieldset>
    </div>

    <!-- Helper Text -->
    <p
      v-if="helperText && !validation?.$error"
      class="v-datepicker-helper-text"
    >
      {{ helperText }}
    </p>

    <!-- Error Message -->
    <transition
      mode="out-in"
      name="error-slide"
    >
      <p
        v-if="validation?.$error"
        class="form-error"
      >
        {{ validation?.$errors?.[0]?.$message }}
      </p>
    </transition>
  </div>
</template>

<style lang="scss" scoped>
@use "../../styles/components/inputs/vdatepicker.scss";
</style>
