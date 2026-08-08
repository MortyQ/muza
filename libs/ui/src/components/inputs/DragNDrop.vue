<script lang="ts" setup>
import { computed, ref, useId, useTemplateRef } from "vue";

import { formatBytes, getFileExtension, truncateString } from "@muzakit/utils";

import VButton from "../base/VButton.vue";
import VIcon from "../base/VIcon.vue";
import VLoader from "../feedback/VLoader.vue";

const {
  loading = false,
  multiple = false,
  button = false,
  accept = "",
  maxSize = 10 * 1024 * 1024,
  maxFiles = 10,
  disabled = false,
} = defineProps<{
  loading?: boolean
  multiple?: boolean
  /** Render a submit button under the file list */
  button?: boolean
  /** Accepted file types, e.g. "image/*,.pdf" */
  accept?: string
  /** Maximum size per file, in bytes */
  maxSize?: number
  /** Only applies in multiple mode */
  maxFiles?: number
  disabled?: boolean
}>();

const emit = defineEmits<{
  upload: [files: File[]]
  submit: [files: File[], done: () => void]
  error: [message: string]
}>();

const FILE_ICONS: Record<string, string> = {
  pdf: "mdi:file-pdf-box",
  doc: "mdi:file-word-box",
  docx: "mdi:file-word-box",
  xls: "mdi:file-excel-box",
  xlsx: "mdi:file-excel-box",
  ppt: "mdi:file-powerpoint-box",
  pptx: "mdi:file-powerpoint-box",
  zip: "mdi:folder-zip",
  rar: "mdi:folder-zip",
  jpg: "mdi:file-image",
  jpeg: "mdi:file-image",
  png: "mdi:file-image",
  gif: "mdi:file-image",
  svg: "mdi:file-image",
  txt: "mdi:file-document",
  csv: "mdi:file-delimited",
};

const inputId = useId();
const isDragging = ref(false);
const files = ref<File[]>([]);
const fileInput = useTemplateRef<HTMLInputElement>("fileInput");

const hasFiles = computed(() => files.value.length > 0);
const isBlocked = computed(() => disabled || loading);
const canAddMore = computed(() => !multiple || files.value.length < maxFiles);

const getFileIcon = (filename: string): string =>
  FILE_ICONS[getFileExtension(filename).toLowerCase()] ?? "mdi:file-document-outline";

const clearFiles = (): void => {
  files.value = [];
};

const remove = (index: number): void => {
  files.value.splice(index, 1);
  emit("upload", files.value);
};

const handleFiles = (incoming: File[]): void => {
  const valid = incoming.filter((file) => {
    if (maxSize && file.size > maxSize) {
      emit("error", `File "${file.name}" exceeds maximum size of ${formatBytes(maxSize)}`);
      return false;
    }
    return true;
  });

  if (valid.length === 0) return;

  if (!multiple) {
    files.value = [valid[0]];
  }
  else {
    const remainingSlots = maxFiles - files.value.length;

    if (valid.length > remainingSlots) {
      emit("error", `Maximum ${maxFiles} files allowed`);
    }

    files.value = [...files.value, ...valid.slice(0, remainingSlots)];
  }

  emit("upload", files.value);
};

const triggerFileInput = (): void => {
  if (isBlocked.value || !canAddMore.value) return;
  fileInput.value?.click();
};

const onDragOver = (event: DragEvent): void => {
  if (isBlocked.value) return;
  event.preventDefault();
  isDragging.value = true;
};

const onDragLeave = (event: DragEvent): void => {
  event.preventDefault();
  isDragging.value = false;
};

const onDrop = (event: DragEvent): void => {
  event.preventDefault();
  isDragging.value = false;

  if (isBlocked.value || !canAddMore.value) return;

  handleFiles(Array.from(event.dataTransfer?.files ?? []));
};

const onChange = (event: Event): void => {
  const target = event.target as HTMLInputElement;
  handleFiles(Array.from(target.files ?? []));

  // Reset so selecting the same file again still fires a change event
  target.value = "";
};

const submit = (): void => {
  if (!hasFiles.value) return;
  emit("submit", files.value, clearFiles);
};

defineExpose({ clearFiles });
</script>

<template>
  <div class="v-dragndrop">
    <input
      :id="inputId"
      ref="fileInput"
      :accept="accept"
      :disabled="isBlocked"
      :multiple="multiple"
      class="v-dragndrop__input"
      name="file"
      type="file"
      @change="onChange"
    >

    <div
      :class="{
        'v-dragndrop__dropzone--dragging': isDragging,
        'v-dragndrop__dropzone--disabled': isBlocked,
        'v-dragndrop__dropzone--has-files': hasFiles,
      }"
      class="v-dragndrop__dropzone"
      @click="triggerFileInput"
      @dragleave="onDragLeave"
      @dragover="onDragOver"
      @drop="onDrop"
    >
      <div
        v-if="loading"
        class="v-dragndrop__loading"
      >
        <VLoader />
        <p class="v-dragndrop__hint">
          Processing files...
        </p>
      </div>

      <div
        v-else-if="!hasFiles"
        class="v-dragndrop__content"
      >
        <div class="v-dragndrop__icon-wrapper">
          <VIcon
            :icon="isDragging ? 'mdi:cloud-download' : 'mdi:cloud-upload-outline'"
            :size="48"
            class="v-dragndrop__icon"
          />
        </div>

        <div class="v-dragndrop__text">
          <p
            v-if="isDragging"
            class="v-dragndrop__title v-dragndrop__title--accent"
          >
            Release to drop files here
          </p>
          <template v-else>
            <slot name="title">
              <p class="v-dragndrop__title">
                Drop files here or click to browse
              </p>
            </slot>
            <slot name="subtitle">
              <p class="v-dragndrop__hint">
                <span v-if="accept">Supported: {{ accept }}</span>
                <span v-if="accept && maxSize"> • </span>
                <span v-if="maxSize">Max: {{ formatBytes(maxSize) }}</span>
              </p>
            </slot>
          </template>
        </div>

        <slot name="action">
          <VButton
            icon="mdi:folder-open-outline"
            text="Browse Files"
            variant="primary"
            @click.stop="triggerFileInput"
          />
        </slot>
      </div>

      <div
        v-else
        class="v-dragndrop__preview"
      >
        <div class="v-dragndrop__preview-header">
          <VIcon
            :size="24"
            icon="mdi:file-multiple-outline"
          />
          <span class="v-dragndrop__title">
            {{ files.length }} file{{ files.length > 1 ? "s" : "" }} selected
          </span>
        </div>
        <p class="v-dragndrop__hint">
          Click to add {{ multiple ? "more" : "another" }} file{{ multiple ? "s" : "" }}
        </p>
      </div>
    </div>

    <TransitionGroup
      v-if="hasFiles && !loading"
      class="v-dragndrop__files"
      name="v-dragndrop-file"
      tag="div"
    >
      <div
        v-for="(file, index) in files"
        :key="`${file.name}-${file.size}-${index}`"
        class="v-dragndrop__file"
      >
        <div class="v-dragndrop__file-icon">
          <VIcon
            :icon="getFileIcon(file.name)"
            :size="20"
          />
        </div>

        <div class="v-dragndrop__file-info">
          <p
            :title="file.name"
            class="v-dragndrop__file-name"
          >
            {{ truncateString(file.name, 40) }}
          </p>
          <p class="v-dragndrop__file-size">
            {{ formatBytes(file.size) }}
          </p>
        </div>

        <button
          :disabled="loading"
          class="v-dragndrop__file-remove"
          type="button"
          @click.stop="remove(index)"
        >
          <VIcon
            :size="20"
            icon="mdi:close-circle"
          />
        </button>
      </div>
    </TransitionGroup>

    <div
      v-if="hasFiles && button && !loading"
      class="v-dragndrop__actions"
    >
      <VButton
        icon="mdi:check-circle-outline"
        text="Submit Files"
        variant="primary"
        @click="submit"
      />
    </div>
  </div>
</template>

<style lang="scss" scoped>
@import "../../styles/components/inputs/dragndrop.scss";
</style>
