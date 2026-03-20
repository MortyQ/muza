import { useApi } from "@ametie/vue-muza-use";
import { defineStore } from "pinia";

import type { User } from "@/features/auth/types";

export const useUserStore = defineStore("user-store", () => {
  const { loading, execute: initialize, data: user, mutate } = useApi<User>("/me");

  const cleanInitialState = (): void => {
    mutate(null);
  };

  return {
    loading,
    initialize,
    user,
    cleanInitialState,
  };
});
