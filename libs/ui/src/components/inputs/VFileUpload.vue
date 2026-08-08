<script lang="ts" setup>
import { computed, ref, useTemplateRef } from "vue";

import { formatBytes, truncateString } from "@muzakit/utils";

import VIcon from "../base/VIcon.vue";
import VLoader from "../feedback/VLoader.vue";

const {
  accept = "*",
  multiple = false,
  loading = false,
  disabled = false,
  maxSize = undefined,
  subLabel = "SVG, PNG, JPG or GIF",
  showList = true,
  variant = "default",
  immediate = false,
} = defineProps<{
  accept?: string
  multiple?: boolean
  loading?: boolean
  disabled?: boolean
  /** Maximum size per file, in bytes */
  maxSize?: number
  subLabel?: string
  showList?: boolean
  variant?: "default" | "compact"
  /** Emit the selection straight to the parent instead of keeping a list */
  immediate?: boolean
}>();

const emit = defineEmits<{
  change: [files: File[]]
  upload: [files: File[], reset: () => void]
  error: [message: string]
  "file-select": [file: File | null]
}>();

// defineModel falls back to internal state when no v-model is bound,
// so controlled and uncontrolled usage share one code path.
const files = defineModel<File[]>({ default: () => [] });

const isDragging = ref(false);
const inputRef = useTemplateRef<HTMLInputElement>("input");

const isBlocked = computed(() => loading || disabled);

const reset = (): void => {
  files.value = [];
  if (inputRef.value) inputRef.value.value = "";
};

const handleFiles = (incoming: File[]): void => {
  if (isBlocked.value) return;

  if (maxSize !== undefined && incoming.some(f => f.size > maxSize)) {
    emit("error", `File size exceeds limit of ${formatBytes(maxSize)}`);
    return;
  }

  if (immediate) {
    emit("file-select", incoming[0] ?? null);
    emit("upload", incoming, reset);
    return;
  }

  files.value = multiple ? [...files.value, ...incoming] : incoming.slice(0, 1);

  emit("change", files.value);
  emit("upload", files.value, reset);
};

const onDrop = (event: DragEvent): void => {
  isDragging.value = false;
  const dropped = Array.from(event.dataTransfer?.files ?? []);
  if (dropped.length) handleFiles(dropped);
};

const onChange = (event: Event): void => {
  const target = event.target as HTMLInputElement;
  const selected = Array.from(target.files ?? []);
  if (selected.length) handleFiles(selected);
};

const removeFile = (index: number): void => {
  if (isBlocked.value) return;

  const next = [...files.value];
  next.splice(index, 1);
  files.value = next;
  emit("change", next);
};

const openFileDialog = (): void => {
  if (!isBlocked.value) inputRef.value?.click();
};

defineExpose({ reset });
</script>

<template>
  <div class="v-file-upload">
    <div
      :class="{
        'v-file-upload__dropzone--dragging': isDragging,
        'v-file-upload__dropzone--loading': loading,
        'v-file-upload__dropzone--disabled': disabled,
        'v-file-upload__dropzone--compact': variant === 'compact',
      }"
      class="v-file-upload__dropzone"
      @click="openFileDialog"
      @dragenter.prevent="isDragging = true"
      @dragleave.prevent="isDragging = false"
      @dragover.prevent="isDragging = true"
      @drop.prevent="onDrop"
    >
      <input
        ref="input"
        :accept="accept"
        :disabled="isBlocked"
        :multiple="multiple"
        class="v-file-upload__input"
        type="file"
        @change="onChange"
      >

      <div class="v-file-upload__content">
        <template v-if="loading">
          <VLoader :size="variant === 'compact' ? 'sm' : 'md'" />
          <p class="v-file-upload__hint">
            Uploading...
          </p>
        </template>

        <template v-else>
          <div class="v-file-upload__icon-wrapper">
            <slot name="icon">
              <VIcon
                :size="variant === 'compact' ? 20 : 28"
                icon="lucide:cloud-upload"
              />
            </slot>
          </div>

          <div class="v-file-upload__text-container">
            <div class="v-file-upload__text">
              <span class="v-file-upload__action">Click to upload</span>
              <span class="v-file-upload__hint">or drag and drop</span>
            </div>
            <p
              v-if="subLabel"
              class="v-file-upload__sub-label"
            >
              {{ subLabel }}
            </p>
          </div>
        </template>
      </div>
    </div>

    <div
      v-if="showList && files.length > 0 && !immediate"
      class="v-file-upload__list"
    >
      <div
        v-for="(file, index) in files"
        :key="`${file.name}-${file.size}-${index}`"
        class="v-file-upload__item"
      >
        <div class="v-file-upload__item-main">
          <div class="v-file-upload__item-icon">
            <VIcon
              :size="16"
              icon="lucide:file"
            />
          </div>

          <div class="v-file-upload__item-text">
            <span
              :title="file.name"
              class="v-file-upload__item-name"
            >
              {{ truncateString(file.name, 30) }}
            </span>
            <span class="v-file-upload__item-size">{{ formatBytes(file.size) }}</span>
          </div>
        </div>

        <button
          :disabled="isBlocked"
          class="v-file-upload__remove"
          type="button"
          @click.stop="removeFile(index)"
        >
          <VIcon
            :size="20"
            icon="lucide:trash-2"
          />
        </button>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@import "../../styles/components/inputs/vfileupload.scss";
</style>
