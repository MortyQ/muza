import { computed } from "vue";

import { useApiPost, tokenManager } from "@ametie/vue-muza-use";
import { defineStore } from "pinia";

import { router } from "@/app/routes";
import { useUserStore } from "@/shared/store/useUserStore";

export const useAuthStore = defineStore("auth", () => {
  const userStore = useUserStore();

  const user = computed(() => userStore.user);
  const isAuthenticated = computed(() => !!user.value);

  const initLoading = computed(() => loginLoading.value || userStore.loading);

  const { loading: loginLoading, execute: loginExecute } = useApiPost<{
    accessToken: string
    refreshToken: string
  }>("/auth/login", {
    onSuccess: async ({ data }) => {
      tokenManager.setTokens(data);
      await router.push("/");
    },
  });

  const login = async ({ email, password }: { email: string, password: string }): Promise<void> => {
    await loginExecute({
      data: { email, password },
    });
  };

  const initialize = async (): Promise<void> => {
    await userStore.initialize();
  };

  const logout = (): void => {
    tokenManager.clearTokens();
    userStore.cleanInitialState();
    router.push("/auth");
  };

  return {
    initLoading,
    isAuthenticated,
    user,
    login,
    logout,
    initialize,
  };
});
