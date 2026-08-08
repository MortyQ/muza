<script setup lang="ts">
import { computed, nextTick, ref, toRaw, useTemplateRef } from "vue";

import type { FieldValidation } from "../../types/validation";
import VIcon from "../base/VIcon.vue";
import VTag from "../base/VTag.vue";
import VTooltip from "../overlay/VTooltip.vue";

import VInput from "./VInput.vue";
import { listEditorToTextList, type ListEditorItem } from "./VListEditor.utils";
import VToggleGroup, { type ToggleOption } from "./VToggleGroup.vue";

type ListEditorMode = "manual" | "bulk";

const {
  label = undefined,
  itemLabel = "Item",
  placeholder = undefined,
  marker = undefined,
  maxItems = undefined,
  maxLength = undefined,
  modes = "both",
  validation = undefined,
  itemError = undefined,
} = defineProps<{
  /** Section heading, e.g. "Wins". */
  label?: string
  /** Drives numbered placeholders — "Win 2", "Win 3"… */
  itemLabel?: string
  /** Placeholder for the first / empty row only. */
  placeholder?: string
  /** Bullet tone for each row. No marker is rendered when omitted. */
  marker?: "primary" | "success" | "warning" | "danger" | "info"
  maxItems?: number
  maxLength?: number
  /** Default "both" shows the Manual/Bulk toggle; a single mode locks to it and hides the toggle. */
  modes?: "manual" | "bulk" | "both"
  /** List-level validation — "at least one item", "max N" — same object shape as VInput. */
  validation?: FieldValidation
  /**
   * Row-level error, looked up by item (and its index) rather than an array
   * index — so removing a row mid-list can't shift an error onto the wrong
   * row, and server-side field errors (looked up by id) drop in without an
   * adapter.
   */
  itemError?: (item: ListEditorItem, index: number) => string | null
}>();

const items = defineModel<ListEditorItem[]>({ required: true });

const inputRefs = useTemplateRef<InstanceType<typeof VInput>[]>("inputs");

const showModeToggle = modes === "both";
const mode = ref<ListEditorMode>(modes === "bulk" ? "bulk" : "manual");
const bulkText = ref("");

const MODE_OPTIONS: ToggleOption<ListEditorMode>[] = [
  { value: "manual", label: "Manual", icon: "lucide:plus" },
  { value: "bulk", label: "Bulk", icon: "lucide:list" },
];

// ── Identity ────────────────────────────────────────────────────────────────
// The model must never carry a generated id — a fabricated one would make a
// backend consumer treat an existing entry as new. Row identity for `:key`
// (and for bulk-mode reconciliation below) is tracked out-of-band instead: a
// WeakMap from the raw item object to a locally-minted display key, keyed via
// `toRaw()` so Vue's reactive proxy wrapping can't split one object into two
// identities across renders.
const keyMap = new WeakMap<object, string>();
let keyCounter = 0;
const keyFor = (item: ListEditorItem): string => {
  const raw = toRaw(item);
  let key = keyMap.get(raw);
  if (!key) {
    key = `item-${++keyCounter}`;
    keyMap.set(raw, key);
  }
  return key;
};

const canAdd = computed(() => maxItems === undefined || items.value.length < maxItems);
const addLabel = computed(() => `Add ${itemLabel.toLowerCase()}`);

const placeholderFor = (index: number): string => (
  index === 0 ? (placeholder ?? `${itemLabel} 1`) : `${itemLabel} ${index + 1}`
);

// ── Validation ──────────────────────────────────────────────────────────────
// Same vocabulary as VInput: read `$error` / `$errors[0].$message` only, no
// separate validation engine. `$touch` only ever flips `$error` after it's
// called — Vuelidate's contract, not ours — so we call it on blur and after
// a removal; the optional chaining means a consumer passing a partial object
// (or none) can never crash this.
const hasListError = computed(() => !!validation?.$error);
const listErrorMessage = computed<string>(() =>
  String(validation?.$errors?.[0]?.$message ?? ""),
);

const touchList = (): void => {
  validation?.$touch?.();
};

const rowErrorFor = (item: ListEditorItem, index: number): string | undefined =>
  itemError?.(item, index) ?? undefined;

// ── Manual mode ───────────────────────────────────────────────────────────────

const focusRow = async (index: number): Promise<void> => {
  await nextTick();
  const input = inputRefs.value?.[index];
  input?.$el?.querySelector("textarea, input")?.focus();
};

const addRow = (afterIndex?: number): void => {
  if (!canAdd.value) return;

  const insertIndex = afterIndex === undefined ? items.value.length : afterIndex + 1;
  items.value.splice(insertIndex, 0, { text: "" });
  void focusRow(insertIndex);
};

const removeRow = (index: number): void => {
  if (items.value.length <= 1) return;

  items.value.splice(index, 1);
  touchList();
  void focusRow(Math.max(0, index - 1));
};

const onEnter = (index: number): void => {
  addRow(index);
};

const onBackspace = (index: number, text: string): void => {
  if (text.length > 0) return;
  removeRow(index);
};

const onAddClick = (): void => {
  addRow();
};

// ── Bulk mode ─────────────────────────────────────────────────────────────────

const SEPARATOR_CHECKS = [
  { char: "\n", label: "newline", regex: /\n/ },
  { char: ",", label: "comma", regex: /,/ },
  { char: ";", label: "semicolon", regex: /;/ },
  { char: "|", label: "pipe", regex: /\|/ },
  { char: "/", label: "slash", regex: /\// },
  { char: "\t", label: "tab", regex: /\t/ },
] satisfies Array<{ char: string, label: string, regex: RegExp }>;

const detectedSeparators = computed(() =>
  SEPARATOR_CHECKS.filter(s => s.regex.test(bulkText.value)));

const parsedLines = computed<string[]>(() => {
  const text = bulkText.value.trim();
  if (!text) return [];

  const splitRegex = detectedSeparators.value.length
    ? new RegExp(detectedSeparators.value.map(s => s.regex.source).join("|"))
    : /\s+/;
  const lines = [...new Set(text.split(splitRegex).map(s => s.trim()).filter(Boolean))]
    .map(line => (maxLength ? line.slice(0, maxLength) : line));

  return maxItems ? lines.slice(0, maxItems) : lines;
});

/**
 * Server ids must survive bulk editing — losing one means a backend consumer
 * deletes the old row and mints a brand-new id on the next save. Since bulk
 * mode only ever gives us plain text, the only way to keep an id is to
 * re-match each parsed line against the items that existed before this edit,
 * by exact text. First match wins and is consumed from the pool so duplicate
 * lines don't all claim the same object. Only genuinely new lines end up as
 * fresh `{ text }` objects with no id.
 */
const reconcileFromText = (texts: string[]): ListEditorItem[] => {
  const pool = [...items.value];
  return texts.map((text) => {
    const matchIndex = pool.findIndex(item => item.text === text);
    if (matchIndex !== -1) {
      const [matched] = pool.splice(matchIndex, 1);
      return matched as ListEditorItem;
    }
    return { text };
  });
};

// Bulk mode has no per-row input to show a row error on, so the offending
// entries are flagged on their preview chip instead. Matched by exact text
// against the reconciled items — `items.value` is already in sync with
// `parsedLines` by the time this is read (see `commitBulkText`).
const chipErrors = computed<Record<string, string | undefined>>(() => {
  if (!itemError) return {};

  const result: Record<string, string | undefined> = {};
  parsedLines.value.forEach((line) => {
    const index = items.value.findIndex(item => item.text === line);
    if (index === -1) return;
    result[line] = itemError(items.value[index], index) ?? undefined;
  });
  return result;
});

const commitBulkText = (text: string): void => {
  bulkText.value = text;
  items.value = reconcileFromText(parsedLines.value);
};

const onBulkInput = (value: string | number | undefined): void => {
  commitBulkText(String(value ?? ""));
};

const clearBulk = (): void => {
  commitBulkText("");
};

const removeChip = (line: string): void => {
  commitBulkText(parsedLines.value.filter(l => l !== line).join("\n"));
};

const onModeChange = (newMode: ListEditorMode): void => {
  if (newMode === mode.value) return;

  if (newMode === "bulk") {
    // Seed only — no reconciliation needed yet, the text mirrors the current
    // items exactly, so the next edit-triggered reconcile will re-match them.
    bulkText.value = listEditorToTextList(items.value).join("\n");
  }
  else {
    const reconciled = reconcileFromText(parsedLines.value);
    items.value = reconciled.length ? reconciled : [{ text: "" }];
    bulkText.value = "";
  }

  mode.value = newMode;
};

defineExpose({ focusRow });
</script>

<template>
  <div class="v-list-editor">
    <div class="v-list-editor__header">
      <span
        v-if="label"
        class="v-list-editor__label"
      >{{ label }}</span>

      <div class="v-list-editor__tools">
        <!--
          Add lives in the header rather than under the rows: it keeps the row
          container visually whole, and the control stays put instead of
          drifting further down every time the list grows.
        -->
        <VTooltip
          v-if="mode === 'manual'"
          placement="top"
          :text="canAdd ? '' : `Up to ${maxItems} ${itemLabel.toLowerCase()}s`"
        >
          <button
            :disabled="!canAdd"
            class="v-list-editor__add"
            type="button"
            @click="onAddClick"
          >
            <VIcon
              :size="14"
              icon="lucide:plus"
            />
            {{ addLabel }}
          </button>
        </VTooltip>

        <VToggleGroup
          v-if="showModeToggle"
          :model-value="mode"
          :options="MODE_OPTIONS"
          size="sm"
          @update:model-value="onModeChange"
        />
      </div>
    </div>

    <div
      v-if="mode === 'manual'"
      class="v-list-editor__manual"
    >
      <!--
        Rows and the add affordance share one bordered surface so the whole
        thing reads as a single control. The add button sits inside it, in the
        row rhythm, because "add" produces the next row — a link floating
        underneath the box would not say that.
      -->
      <div
        :class="{ 'v-list-editor__box--error': hasListError }"
        class="v-list-editor__box"
      >
        <TransitionGroup
          class="v-list-editor__rows"
          name="v-list-editor-row"
          tag="div"
        >
          <div
            v-for="(item, index) in items"
            :key="keyFor(item)"
            class="v-list-editor__row"
          >
            <span
              v-if="marker"
              :class="`v-list-editor__marker--${marker}`"
              class="v-list-editor__marker"
            />
            <VInput
              ref="inputs"
              v-model="item.text"
              :error="rowErrorFor(item, index)"
              :maxlength="maxLength"
              :placeholder="placeholderFor(index)"
              :show-clear-button="false"
              class="v-list-editor__input"
              name=""
              @blur="touchList"
              @keydown.enter.exact.prevent.stop="onEnter(index)"
              @keydown.backspace.stop="onBackspace(index, item.text)"
            />
            <button
              v-if="items.length > 1"
              aria-label="Remove"
              class="v-list-editor__remove"
              type="button"
              @click="removeRow(index)"
            >
              <VIcon
                :size="14"
                icon="lucide:x"
              />
            </button>
          </div>
        </TransitionGroup>
      </div>

      <p
        v-if="hasListError"
        class="v-list-editor__error"
      >
        {{ listErrorMessage }}
      </p>
    </div>

    <div
      v-else
      class="v-list-editor__bulk"
    >
      <VInput
        :error="hasListError ? listErrorMessage : undefined"
        :model-value="bulkText"
        :placeholder="`Enter ${itemLabel.toLowerCase()}s, one per line or comma-separated`"
        :rows="4"
        :textarea="true"
        name=""
        @blur="touchList"
        @update:model-value="onBulkInput"
      />

      <p class="v-list-editor__hint">
        Separate by: newline · , · ; · | · / · tab
        <template v-if="detectedSeparators.length">
          ·
          <span class="v-list-editor__hint-detected">
            Detected: {{ detectedSeparators.map(s => s.label).join(", ") }}
          </span>
        </template>
      </p>

      <template v-if="parsedLines.length > 0">
        <div class="v-list-editor__summary">
          <span class="v-list-editor__count">
            {{ parsedLines.length }} {{ parsedLines.length === 1 ? "item" : "items" }} detected
          </span>
          <button
            class="v-list-editor__clear"
            type="button"
            @click="clearBulk"
          >
            Clear all
          </button>
        </div>

        <TransitionGroup
          class="v-list-editor__preview"
          name="v-list-editor-chip"
          tag="div"
        >
          <VTooltip
            v-for="line in parsedLines"
            :key="line"
            placement="top"
            :text="chipErrors[line] ?? ''"
          >
            <VTag
              :color="chipErrors[line] ? 'error' : 'primary'"
              :label="line"
              class="v-list-editor__chip"
              size="md"
              variant="outline"
            >
              <template #icon-right>
                <button
                  class="v-list-editor__chip-remove"
                  type="button"
                  @click="removeChip(line)"
                >
                  <VIcon
                    :size="10"
                    icon="lucide:x"
                  />
                </button>
              </template>
            </VTag>
          </VTooltip>
        </TransitionGroup>
      </template>
    </div>
  </div>
</template>

<style scoped>
@import "../../styles/components/inputs/vlisteditor.scss";
</style>
