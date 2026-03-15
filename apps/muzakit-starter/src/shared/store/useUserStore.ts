import { useApi } from "@ametie/vue-muza-use";
import { defineStore } from "pinia";

export const useUserStore = defineStore("user-store", () => {
  const { loading, execute: initialize, data: user, mutate } = useApi("/me");

  const cleanInitialState = () => {
    mutate(null);
  };

  return {
    loading,
    initialize,
    user,
    cleanInitialState,
  };
});
