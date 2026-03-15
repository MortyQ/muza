import { createApiClient } from "@ametie/vue-muza-use";

type OnAuthFailedCallback = () => void;
let _onAuthFailed: OnAuthFailedCallback = () => {
};

export const setOnAuthFailed = (cb: OnAuthFailedCallback) => {
  _onAuthFailed = cb;
};

export const myAxios = createApiClient({
  baseURL: import.meta.env.VITE_API_URL
    ? `${import.meta.env.VITE_API_URL}`
    : "/api",
  withAuth: true,
  timeout: 2 * 60 * 1000, // 2 minutes timeout
  authOptions: {
    refreshUrl: "/auth/refresh",
    onTokenRefreshFailed: async () => {
      _onAuthFailed();
    },
  },
});
