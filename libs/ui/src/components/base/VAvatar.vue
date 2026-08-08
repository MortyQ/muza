<script lang="ts" setup>
import { computed, ref, watch } from "vue";

const {
  name = "",
  avatar = undefined,
  size = "md",
  customSize = undefined,
  shape = "circle",
  online = false,
  alt = "User avatar",
} = defineProps<{
  /** User name, used for the initials fallback and the deterministic tone */
  name?: string
  /** Avatar image URL */
  avatar?: string
  /** Size preset */
  size?: "xs" | "sm" | "md" | "lg" | "xl"
  /** Explicit size in pixels, overrides the preset */
  customSize?: number
  shape?: "circle" | "square"
  /** Show the online status dot */
  online?: boolean
  alt?: string
}>();

const AVATAR_TONE_COUNT = 8;

const imageFailed = ref(false);

watch(() => avatar, () => {
  imageFailed.value = false;
});

const hasAvatar = computed(() => !!avatar && !imageFailed.value);

const initials = computed(() => {
  if (!name) return "?";

  const parts = name.trim().split(/\s+/);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return name.substring(0, 2).toUpperCase();
});

/** Stable per-name tone so the same user always gets the same colour */
const toneIndex = computed(() => {
  if (!name) return null;

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  return Math.abs(hash) % AVATAR_TONE_COUNT;
});

const rootClass = computed(() => [
  `v-avatar--${size}`,
  `v-avatar--${shape}`,
  {
    [`v-avatar--tone-${toneIndex.value}`]: !hasAvatar.value && toneIndex.value !== null,
    "v-avatar--empty": !hasAvatar.value && toneIndex.value === null,
  },
]);

const rootStyle = computed(() =>
  customSize ? { "--v-avatar-size": `${customSize}px` } : undefined,
);
</script>

<template>
  <div
    :class="rootClass"
    :style="rootStyle"
    class="v-avatar"
  >
    <img
      v-if="hasAvatar"
      :alt="alt"
      :src="avatar"
      class="v-avatar__image"
      @error="imageFailed = true"
    >

    <span
      v-else
      class="v-avatar__initials"
    >
      {{ initials }}
    </span>

    <span
      v-if="online"
      aria-label="Online"
      class="v-avatar__status"
    />
  </div>
</template>

<style scoped>
@import "../../styles/components/base/vavatar.scss";
</style>
