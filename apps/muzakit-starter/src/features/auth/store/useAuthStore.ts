import { computed } from "vue";

import { useApiPost, tokenManager } from "@ametie/vue-muza-use";
import { defineStore } from "pinia";

import { router } from "@/app/routes";
import { useUserStore } from "@/shared/store/useUserStore";

export const useAuthStore = defineStore("auth", () => {
  const userStore = useUserStore();

  const initLoading = computed(() => loginLoading.value || userStore.loading);

  const { loading: loginLoading, execute: loginExecute } = useApiPost<{
    accessToken: string
    refreshToken: string
  }>("/auth/login", {
    onSuccess: async ({ data }) => {
      tokenManager.setTokens(data);
      await userStore.initialize();
      await router.push("/");
    },
  });

  const login = async ({ email, password }: { email: string, password: string }): Promise<void> => {
    await loginExecute({
      data: {
        email,
        password,
      },
    });
  };

  const logout = async () => {
    tokenManager.clearTokens();
    userStore.cleanInitialState();
    await router.push("/auth");
  };

  return {
    initLoading,
    login,
    logout,
  };
});
