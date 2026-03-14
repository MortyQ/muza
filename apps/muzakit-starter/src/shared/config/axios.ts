import { createApiClient } from "@ametie/vue-muza-use";

// import { useAuthStore } from "@/features/auth/store/authStore";

import { router } from "@/app/routes";

export const myAxios = createApiClient({
  baseURL: import.meta.env.VITE_API_URL
    ? `${import.meta.env.VITE_API_URL}`
    : "/api",
  withAuth: true,
  timeout: 2 * 60 * 1000, // 2 minutes timeout
  authOptions: {
    refreshUrl: "/auth/refresh",
    onTokenRefreshFailed: () => {
      // Use authStore.logout() to properly reset all state and redirect
      // const authStore = useAuthStore();
      // authStore.logout().finally(() => {
      // });
      router.push("/login");
    },
  },
});
