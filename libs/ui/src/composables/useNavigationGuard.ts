import { type MaybeRefOrGetter, type Ref, ref, toValue, watch } from "vue";

import { type RouteLocationNormalized, onBeforeRouteLeave, useRouter } from "vue-router";

export interface UseNavigationGuardOptions {
  /** Guard is active while this is true; defaults to always active. */
  when?: MaybeRefOrGetter<boolean>
}

export interface UseNavigationGuardReturn {
  isPending: Ref<boolean>
  pendingTo: Ref<RouteLocationNormalized | null>
  isEnabled: Ref<boolean>
  confirm: () => void
  cancel: () => void
  enable: () => void
  disable: () => void
}

/**
 * Blocks router navigation while a condition holds, exposing the pending
 * navigation so a confirmation UI can resolve it.
 *
 * Must be called from `<script setup>` of a component rendered inside
 * `<router-view>` — `onBeforeRouteLeave` is silently a no-op elsewhere.
 *
 * A target route can opt out with `meta.skipNavigationGuard: true`.
 */
export const useNavigationGuard = (
  options?: UseNavigationGuardOptions,
): UseNavigationGuardReturn => {
  const router = useRouter();
  const isEnabled = ref(true);
  const isPending = ref(false);
  const pendingTo = ref<RouteLocationNormalized | null>(null);

  const isActive = (): boolean => isEnabled.value && toValue(options?.when ?? true);

  const cancel = (): void => {
    isPending.value = false;
    pendingTo.value = null;
  };

  onBeforeRouteLeave((to) => {
    if (to.meta.skipNavigationGuard === true) return true;
    if (!isActive()) return true;

    isPending.value = true;
    pendingTo.value = to;
    return false;
  });

  // Close the prompt if the condition stops holding while it is open
  watch(
    [() => toValue(options?.when ?? true), isEnabled],
    ([nowActive, nowEnabled]) => {
      if ((!nowActive || !nowEnabled) && isPending.value) {
        cancel();
      }
    },
  );

  const confirm = (): void => {
    if (!pendingTo.value) return;

    const to = pendingTo.value;
    // Disable first so the guard does not intercept its own navigation
    isEnabled.value = false;
    isPending.value = false;
    pendingTo.value = null;

    router.push(to).finally(() => {
      isEnabled.value = true;
    });
  };

  const enable = (): void => {
    isEnabled.value = true;
  };

  const disable = (): void => {
    isEnabled.value = false;
  };

  return { isPending, pendingTo, isEnabled, confirm, cancel, enable, disable };
};
