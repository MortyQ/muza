<script lang="ts" setup>
import { useTemplateRef } from "vue";

import { storeToRefs } from "pinia";
import { useRouter } from "vue-router";

import { VAvatar, VFloating, VIcon } from "@muzakit/ui";

import { RouteNames } from "@/app/routes/types/names";
import { useAuthStore } from "@/features/auth/store/useAuthStore";
import { useWorkspaceStore } from "@/shared/store/useWorkspaceStore";

const { collapsed = false } = defineProps<{
  /** Icon-only rail: the mode tile alone, the rest lives in the menu */
  collapsed?: boolean
}>();

const TONES = ["primary", "success", "warning"] as const;

const router = useRouter();
const authStore = useAuthStore();
const workspaceStore = useWorkspaceStore();

const { user } = storeToRefs(authStore);
const { modes, activeMode, activeIndex, switching } = storeToRefs(workspaceStore);

const floating = useTemplateRef<{ close: () => void }>("floating");

const toneClass = (index: number): string =>
  `workspace-tile--${TONES[index % TONES.length]}`;

const initials = (label: string): string =>
  label
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map(word => word[0])
    .join("")
    .toUpperCase();

const onSwitch = async (id: string): Promise<void> => {
  floating.value?.close();
  await workspaceStore.switchMode(id);
};

const goToProfile = (): void => {
  floating.value?.close();
  router.push({ name: RouteNames.SETTINGS_PROFILE });
};

const onLogout = (): void => {
  floating.value?.close();
  authStore.logout();
};
</script>

<template>
  <VFloating
    ref="floating"
    :class="{ 'workspace-context--collapsed': collapsed }"
    class="workspace-context"
    placement="bottom-left"
    unstyled
  >
    <template #trigger="{ isOpen }">
      <button
        :aria-expanded="isOpen"
        :class="{ 'workspace-trigger--open': isOpen, 'workspace-trigger--collapsed': collapsed }"
        :title="collapsed ? activeMode.label : undefined"
        aria-label="Workspace and account"
        class="workspace-trigger"
        type="button"
      >
        <span
          :class="toneClass(activeIndex)"
          class="workspace-tile"
        >
          {{ initials(activeMode.label) }}
        </span>

        <span
          v-if="!collapsed"
          class="workspace-trigger__text"
        >
          <span class="workspace-trigger__mode">{{ activeMode.label }}</span>
          <span
            v-if="user"
            class="workspace-trigger__user"
          >
            {{ user.name }} · {{ user.role }}
          </span>
        </span>

        <VAvatar
          v-if="user && !collapsed"
          :avatar="user.avatar"
          :name="user.name"
          shape="square"
          size="sm"
        />

        <VIcon
          v-if="!collapsed"
          :loading="switching"
          :size="14"
          class="workspace-trigger__chevron"
          icon="lucide:chevron-down"
        />
      </button>
    </template>

    <template #content>
      <div class="workspace-menu">
        <div class="workspace-menu__head">
          <span
            :class="toneClass(activeIndex)"
            class="workspace-tile workspace-tile--lg"
          >
            {{ initials(activeMode.label) }}
          </span>
          <span class="workspace-menu__text">
            <span class="workspace-menu__title">{{ activeMode.label }}</span>
            <span class="workspace-menu__caption">{{ activeMode.description }}</span>
          </span>
        </div>

        <div
          v-if="modes.length > 1"
          class="workspace-menu__section"
        >
          <p class="workspace-menu__heading">
            Switch mode
          </p>
          <button
            v-for="(mode, index) in modes"
            :key="mode.id"
            :aria-current="mode.id === activeMode.id ? 'true' : undefined"
            :disabled="mode.id === activeMode.id || switching"
            class="workspace-menu__item"
            type="button"
            @click="onSwitch(mode.id)"
          >
            <span
              :class="toneClass(index)"
              class="workspace-tile workspace-tile--sm"
            >
              {{ initials(mode.label) }}
            </span>
            <span class="workspace-menu__label">{{ mode.label }}</span>
            <VIcon
              v-if="mode.id === activeMode.id"
              :size="15"
              class="workspace-menu__check"
              icon="lucide:check"
            />
          </button>
        </div>

        <div class="workspace-menu__section">
          <button
            class="workspace-menu__item workspace-menu__item--user"
            type="button"
            @click="goToProfile"
          >
            <VAvatar
              :avatar="user?.avatar"
              :name="user?.name"
              shape="square"
              size="md"
            />
            <span class="workspace-menu__text">
              <span class="workspace-menu__title">{{ user?.name }}</span>
              <span class="workspace-menu__caption">{{ user?.email }}</span>
            </span>
            <VIcon
              :size="14"
              class="workspace-menu__arrow"
              icon="lucide:chevron-right"
            />
          </button>

          <button
            class="workspace-menu__item workspace-menu__item--danger"
            type="button"
            @click="onLogout"
          >
            <VIcon
              :size="15"
              icon="lucide:log-out"
            />
            <span class="workspace-menu__label">Log out</span>
          </button>
        </div>
      </div>
    </template>
  </VFloating>
</template>

<style lang="scss" scoped>
/* ── Mode tile ───────────────────────────────────────────── */
.workspace-tile {
  --tile-tone: var(--ui-primary);
  --tile-tone-deep: var(--ui-primary-hover);
  --tile-fg: var(--ui-primary-foreground);

  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 1.625rem;
  height: 1.625rem;
  border-radius: var(--ui-radius-lg);
  background: linear-gradient(135deg, var(--tile-tone-deep), var(--tile-tone));
  color: var(--tile-fg);
  font-size: var(--ui-text-2xs);
  font-weight: 700;
  letter-spacing: 0.02em;

  &--sm {
    width: 1.25rem;
    height: 1.25rem;
    border-radius: var(--ui-radius);
    font-size: 0.5625rem;
  }

  &--lg {
    width: var(--ui-control-h-md);
    height: var(--ui-control-h-md);
    font-size: var(--ui-text-xs);
  }

  &--success {
    --tile-tone: var(--ui-success);
    --tile-tone-deep: var(--ui-success-hover);
    --tile-fg: var(--ui-success-foreground);
  }

  &--warning {
    --tile-tone: var(--ui-warning);
    --tile-tone-deep: var(--ui-warning-hover);
    --tile-fg: var(--ui-warning-foreground);
  }
}

/* Doubled with VFloating's own root class so it outranks that inline-block */
.v-floating.workspace-context {
  display: block;
  width: 100%;

  &--collapsed {
    width: auto;
  }
}

/* ── Trigger: primary tonal, the VButton recipe at the lg step ── */
.workspace-trigger {
  display: flex;
  width: 100%;
  align-items: center;
  gap: var(--ui-space-md);
  height: var(--ui-control-h-lg);
  padding: 0 var(--ui-space-md) 0 var(--ui-space-xs);
  border: 1px solid color-mix(in oklch, var(--ui-primary) 16%, transparent);
  border-radius: var(--ui-radius-lg);
  background-color: color-mix(in oklch, var(--ui-primary) 7%, transparent);
  color: var(--ui-foreground);
  text-align: left;
  cursor: pointer;
  transition: background-color 120ms ease, border-color 120ms ease;

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      border-color: color-mix(in oklch, var(--ui-primary) 26%, transparent);
      background-color: color-mix(in oklch, var(--ui-primary) 11%, transparent);
    }
  }

  &--open {
    border-color: color-mix(in oklch, var(--ui-primary) 26%, transparent);
    background-color: color-mix(in oklch, var(--ui-primary) 11%, transparent);
  }

  &:focus-visible {
    outline: 2px solid var(--ui-ring);
    outline-offset: 2px;
  }

  /* Rail: a square the size of the icon-only rows, tonal only on hover */
  &--collapsed {
    justify-content: center;
    width: var(--ui-control-h);
    height: var(--ui-control-h);
    padding: 0;
    border-color: transparent;
    background-color: transparent;
  }

  &__text {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-width: 0;
  }

  &__mode {
    overflow: hidden;
    font-size: var(--ui-text-sm);
    font-weight: 600;
    line-height: var(--ui-leading-sm);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__user {
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: var(--ui-text-2xs);
    line-height: var(--ui-leading-2xs);
    color: var(--ui-foreground-muted);
    white-space: nowrap;
  }

  &__chevron {
    flex-shrink: 0;
    color: color-mix(in oklch, var(--ui-primary) 60%, transparent);
    transition: transform 200ms cubic-bezier(0.23, 1, 0.32, 1);
  }

  &--open &__chevron {
    transform: rotate(180deg);
  }
}

/* ── Menu ────────────────────────────────────────────────── */
.workspace-menu {
  width: 16rem;
  padding: var(--ui-space-xs);
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius-xl);
  background-color: var(--ui-surface-overlay);
  box-shadow: var(--ui-shadow-lg);
  color: var(--ui-foreground);
  transform-origin: left top;

  &__head {
    display: flex;
    align-items: center;
    gap: var(--ui-space-md);
    padding: var(--ui-space-sm) var(--ui-space-sm) var(--ui-space-md);
  }

  &__text {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-width: 0;
  }

  &__title {
    overflow: hidden;
    font-size: var(--ui-text-base);
    font-weight: 600;
    line-height: var(--ui-leading-base);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__caption {
    overflow: hidden;
    font-size: var(--ui-text-xs);
    line-height: var(--ui-leading-xs);
    color: var(--ui-foreground-muted);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__section {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-2xs);
    padding-top: var(--ui-space-xs);
    margin-top: var(--ui-space-xs);
    border-top: 1px solid var(--ui-border-subtle);
  }

  &__heading {
    padding: var(--ui-space-xs) var(--ui-space-sm) var(--ui-space-2xs);
    font-size: var(--ui-text-2xs);
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--ui-foreground-muted);
  }

  /* A ghost VButton row, as in the sidebar flyout */
  &__item {
    display: flex;
    align-items: center;
    gap: var(--ui-control-gap);
    width: 100%;
    min-height: var(--ui-control-h);
    padding: 0 var(--ui-space-sm);
    border: 1px solid transparent;
    border-radius: var(--ui-radius-lg);
    background: transparent;
    color: var(--ui-foreground-secondary);
    font-size: var(--ui-text-base);
    font-weight: 450;
    text-align: left;
    cursor: pointer;
    transition: background-color 120ms ease, color 120ms ease;

    @media (hover: hover) and (pointer: fine) {
      &:hover:not(:disabled) {
        border-color: color-mix(in oklch, var(--ui-foreground) 8%, transparent);
        background-color: color-mix(in oklch, var(--ui-foreground) 4%, transparent);
        color: var(--ui-foreground);
      }
    }

    &:disabled {
      cursor: default;
    }

    &[aria-current="true"] {
      color: var(--ui-foreground);
      font-weight: 500;
    }

    &:focus-visible {
      outline: 2px solid var(--ui-ring);
      outline-offset: -2px;
    }

    &--user {
      gap: var(--ui-space-md);
      padding-block: var(--ui-space-sm);
    }

    &--danger {
      color: var(--ui-danger);

      @media (hover: hover) and (pointer: fine) {
        &:hover:not(:disabled) {
          border-color: color-mix(in oklch, var(--ui-danger) 16%, transparent);
          background-color: color-mix(in oklch, var(--ui-danger) 9%, transparent);
          color: var(--ui-danger);
        }
      }
    }
  }

  &__label {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__check {
    flex-shrink: 0;
    color: var(--ui-primary);
  }

  &__arrow {
    flex-shrink: 0;
    color: var(--ui-foreground-subtle);
    transition: transform 150ms ease;
  }

  &__item--user:hover &__arrow {
    transform: translateX(2px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .workspace-trigger__chevron,
  .workspace-menu__arrow {
    transition: none;
  }
}
</style>
