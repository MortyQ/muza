<script lang="ts" setup>
import { computed, nextTick, onBeforeUnmount, ref, useSlots } from "vue";

import Multiselect from "vue-multiselect";

import type { SelectOption } from "../../types/select";
import VIcon from "../base/VIcon.vue";

// Use a typed instance that exposes the root element for DOM queries.
type MultiselectInstance = InstanceType<typeof Multiselect> & { $el?: HTMLElement };

const {
  modelValue = null,
  options = [],
  placeholder = "Select option",
  disabled = false,
  multiple = false,
  searchable = true,
  clearOnSelect = true,
  closeOnSelect = true,
  label = "label",
  trackBy = "value",
  loading = false,
  taggable = false,
  maxHeight = 300,
  optionsLimit = 1000,
  teleportToBody = true,
  name = "",
  allowEmpty = false,
  noResultsText = "No results found",
  modern = true,
} = defineProps<{
  modelValue?: SelectOption | SelectOption[] | null
  options?: SelectOption[]
  placeholder?: string
  disabled?: boolean
  multiple?: boolean
  searchable?: boolean
  clearOnSelect?: boolean
  closeOnSelect?: boolean
  label?: string
  trackBy?: string
  loading?: boolean
  taggable?: boolean
  maxHeight?: number
  optionsLimit?: number
  teleportToBody?: boolean
  /** Floating label text — also used as aria label */
  name?: string
  allowEmpty?: boolean
  /** Empty-state text; override the `noResult` slot for richer content */
  noResultsText?: string
  /**
   * `VButton`'s modern chrome, and **the default**: 30px, 8px radius, 1px
   * hairline, 13.5px/510 type and the tonal neutral surface a `variant="neutral"`
   * modern button gets — so a filter select sits in a toolbar row with buttons
   * instead of towering 14px over them.
   *
   * It changes only how the control is drawn. Every behaviour prop keeps its
   * meaning, with one exception: **`name` (the MUI floating label) is ignored**,
   * because the notch needs vertical room this height does not have. Use a
   * `<label>` outside the component, or pass `:modern="false"`.
   *
   * so-platform ships this opt-in; here it matches `VButton`, where the modern
   * chrome is also the default.
   */
  modern?: boolean
}>();

const emit = defineEmits<{
  "update:modelValue": [value: SelectOption | SelectOption[] | null]
  select: [option: SelectOption]
  remove: [option: SelectOption]
  "search-change": [query: string]
  open: []
  close: []
}>();

const isFocused = ref(false);

/** The floating label is the one thing `modern` drops, so the slot above is free for it. */
const hasFloatingLabel = computed(() => !!name && !modern);

const hasValue = computed(() => {
  if (Array.isArray(modelValue)) return modelValue.length > 0;
  if (modelValue && typeof modelValue === "object") return true;
  return modelValue !== null && modelValue !== undefined;
});

// Hide placeholder when floating label is present and not focused (avoids duplication)
const computedPlaceholder = computed(() => {
  if (!hasFloatingLabel.value) return placeholder;
  return isFocused.value ? placeholder : "";
});

const handleInput = (value: SelectOption | SelectOption[] | null) => emit("update:modelValue", value);
const handleSelect = (option: SelectOption) => emit("select", option);
const handleRemove = (option: SelectOption) => emit("remove", option);
const handleSearchChange = (query: string) => emit("search-change", query);

// ── Floating dropdown (teleport to body) ──────────────────────────────────
const msRef = ref<MultiselectInstance | null>(null);

// Explicit annotation: without it the slots type resolves through the
// component's own type and TS collapses it to `any` (TS7022).
const slots: ReturnType<typeof useSlots> = useSlots();

// `noResult` is rendered by its own template below, which already wraps the
// consumer's slot around the noResultsText fallback. Forwarding it again here
// would declare the same slot twice.
const forwardedSlotNames = computed<string[]>(() =>
  Object.keys(slots).filter(name => name !== "noResult"),
);
let dropdownEl: HTMLElement | null = null;
let placeholderNode: Comment | null = null;
let originalParent: HTMLElement | null = null;

const updatePosition = () => {
  if (!dropdownEl || !msRef.value) return;

  const trigger = msRef.value.$el?.querySelector(".multiselect__tags") as HTMLElement | null;
  if (!trigger) return;

  const rect = trigger.getBoundingClientRect();
  const spaceBelow = window.innerHeight - rect.bottom;
  const dropdownHeight = Math.min(dropdownEl.scrollHeight, maxHeight);
  const openAbove = spaceBelow < dropdownHeight && rect.top > spaceBelow;

  const top = openAbove
    ? Math.max(4, rect.top - dropdownHeight - 4)
    : Math.min(window.innerHeight - dropdownHeight - 4, rect.bottom + 4);

  Object.assign(dropdownEl.style, {
    position: "fixed",
    top: `${top}px`,
    left: `${rect.left}px`,
    width: `${rect.width}px`,
    maxHeight: `${maxHeight}px`,
    zIndex: "10000",
  });

  dropdownEl.classList.toggle("opened-above", openAbove);
};

const handleScroll = () => requestAnimationFrame(updatePosition);

const enableFloating = () => {
  if (!teleportToBody) return;

  nextTick(() => {
    dropdownEl = msRef.value?.$el?.querySelector(".multiselect__content-wrapper") as HTMLElement | null;
    if (!dropdownEl) return;

    if (!placeholderNode) {
      originalParent = dropdownEl.parentElement;
      placeholderNode = document.createComment("v-multiselect-anchor");
      originalParent?.replaceChild(placeholderNode, dropdownEl);
      document.body.appendChild(dropdownEl);
    }

    // The panel is moved to `body`, so no scoped selector reaches it — the chrome
    // has to travel with the element as its own class.
    dropdownEl.classList.add("v-ms-floating");
    if (modern) dropdownEl.classList.add("v-ms-modern");
    updatePosition();

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll, { passive: true });
  });
};

const disableFloating = () => {
  if (!dropdownEl) return;

  window.removeEventListener("scroll", handleScroll);
  window.removeEventListener("resize", handleScroll);

  dropdownEl.classList.remove("v-ms-floating", "v-ms-modern", "opened-above");
  dropdownEl.removeAttribute("style");

  if (placeholderNode && originalParent) {
    originalParent.replaceChild(dropdownEl, placeholderNode);
  }

  placeholderNode = null;
  originalParent = null;
  dropdownEl = null;
};

const handleOpen = () => {
  enableFloating();
  isFocused.value = true;
  emit("open");
};

const handleClose = () => {
  disableFloating();
  isFocused.value = false;
  emit("close");
};

onBeforeUnmount(() => disableFloating());
</script>

<template>
  <div
    class="v-select"
    :class="{ 'v-select--disabled': disabled, 'v-select--modern': modern }"
  >
    <!-- Floating label -->
    <label
      v-if="hasFloatingLabel"
      :class="{ 'v-select__label--active': isFocused || hasValue }"
      class="v-select__label"
    >
      {{ name }}
    </label>

    <!-- Multiselect input -->
    <Multiselect
      ref="msRef"
      :allow-empty="allowEmpty"
      :clear-on-select="clearOnSelect"
      :close-on-select="closeOnSelect"
      :disabled="disabled"
      :label="label"
      :loading="loading"
      :max-height="maxHeight"
      :model-value="modelValue"
      :multiple="multiple"
      :options="(options as any[])"
      :options-limit="optionsLimit"
      :placeholder="computedPlaceholder"
      :searchable="searchable"
      :show-labels="false"
      :taggable="taggable"
      :track-by="trackBy"
      v-bind="$attrs"
      @close="handleClose"
      @open="handleOpen"
      @remove="handleRemove"
      @select="handleSelect"
      @update:model-value="handleInput"
      @search-change="handleSearchChange"
    >
      <!-- Custom caret / loader -->
      <template #caret>
        <div class="multiselect__select">
          <VIcon
            :loading="loading"
            class="v-select__caret-icon"
            icon="mdi:chevron-down"
          />
        </div>
      </template>

      <!-- Empty state: prop by default, overridable via the noResult slot -->
      <template #noResult>
        <slot name="noResult">
          {{ noResultsText }}
        </slot>
      </template>

      <!-- Forward any other provided slots. `noResult` is excluded because it
           already has an explicit template above; declaring it twice would
           make the later one silently replace the fallback. -->
      <template
        v-for="slotName in forwardedSlotNames"
        :key="slotName"
        #[slotName]="slotProps"
      >
        <slot
          :name="slotName"
          v-bind="slotProps ?? {}"
        />
      </template>
    </Multiselect>

    <!-- Fieldset border (visual only) -->
    <fieldset
      :class="{ 'v-select__fieldset--active': isFocused }"
      aria-hidden="true"
      class="v-select__fieldset"
    >
      <legend
        :class="{ 'v-select__legend--visible': hasFloatingLabel && (hasValue || isFocused) }"
        class="v-select__legend"
      >
        <span>{{ name }}</span>
      </legend>
    </fieldset>
  </div>
</template>

<!-- vue-multiselect base reset -->
<style src="vue-multiselect/dist/vue-multiselect.css"></style>

<!--
  Teleported dropdown styles. Unscoped because vue-multiselect appends the
  content wrapper to <body>, which puts it outside this component's scoped
  subtree — see the file header for the full reasoning.
  teleported: intentional exception to the one-scoped-block rule.
-->
<style lang="scss">
@use "../../styles/components/inputs/vselect-floating.scss";
</style>

<style lang="scss" scoped>
@use "../../styles/components/inputs/vselect.scss";
</style>
