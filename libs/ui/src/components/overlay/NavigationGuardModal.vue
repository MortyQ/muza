<script lang="ts" setup>
import { type MaybeRefOrGetter, toValue, useTemplateRef } from "vue";

import { useDialogFocus } from "../../composables/useDialogFocus";
import { useNavigationGuard } from "../../composables/useNavigationGuard";
import VButton from "../base/VButton.vue";
import VIcon from "../base/VIcon.vue";

export interface NavigationGuardModalProps {
  /** Block navigation while this is true */
  when: MaybeRefOrGetter<boolean>
  title?: string
  description?: string
  confirmLabel?: string
  leaveLabel?: string
}

const {
  when,
  title = "Unsaved changes",
  description = "Leaving now will discard your changes. This cannot be undone.",
  confirmLabel = "Keep editing",
  leaveLabel = "Discard & leave",
} = defineProps<NavigationGuardModalProps>();

const { isPending, confirm, cancel } = useNavigationGuard({ when: () => toValue(when) });

// Focus in on open, Tab kept inside, focus back to the trigger on close.
const { trapTab } = useDialogFocus(isPending, useTemplateRef<HTMLDivElement>("dialog"));
</script>

<template>
  <Teleport to="body">
    <Transition name="v-nav-guard-fade">
      <div
        v-if="isPending"
        ref="dialog"
        :aria-label="title"
        aria-modal="true"
        class="v-nav-guard__backdrop"
        role="dialog"
        tabindex="-1"
        @click.self="cancel"
        @keydown="trapTab"
        @keydown.esc="cancel"
      >
        <Transition
          appear
          name="v-nav-guard-pop"
        >
          <div class="v-nav-guard__card">
            <div class="v-nav-guard__accent" />

            <div class="v-nav-guard__body">
              <div class="v-nav-guard__head">
                <span class="v-nav-guard__badge">
                  <VIcon
                    :size="16"
                    icon="lucide:triangle-alert"
                  />
                </span>

                <div class="v-nav-guard__text">
                  <h2 class="v-nav-guard__title">
                    {{ title }}
                  </h2>
                  <div class="v-nav-guard__description">
                    <slot name="description">
                      {{ description }}
                    </slot>
                  </div>
                </div>

                <button
                  aria-label="Cancel and keep editing"
                  class="v-nav-guard__close"
                  type="button"
                  @click="cancel"
                >
                  <VIcon
                    :size="14"
                    icon="lucide:x"
                  />
                </button>
              </div>

              <div class="v-nav-guard__footer">
                <VButton
                  :text="leaveLabel"
                  variant="negative"
                  @click="confirm"
                />
                <VButton
                  :text="confirmLabel"
                  variant="primary"
                  @click="cancel"
                />
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
@import "../../styles/components/overlay/navigationguardmodal.scss";
</style>
