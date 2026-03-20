import { createApiClient, tokenManager } from "@ametie/vue-muza-use";
import type { AxiosInstance } from "axios";

type OnAuthFailedCallback = () => void;
let _onAuthFailed: OnAuthFailedCallback = () => {
};

export const setOnAuthFailed = (cb: OnAuthFailedCallback) => {
  _onAuthFailed = cb;
};

export const myAxios: AxiosInstance = createApiClient({
  baseURL: import.meta.env.VITE_API_URL
    ? `${import.meta.env.VITE_API_URL}`
    : "/api",
  withAuth: true,
  timeout: 2 * 60 * 1000, // 2 minutes timeout
  authOptions: {
    refreshUrl: "/auth/refresh",
    onTokenRefreshed: ({ data }) => tokenManager.setTokens({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
    }),
    refreshPayload: () => ({
      refreshToken: tokenManager.getRefreshToken(),
    }),
    onTokenRefreshFailed: async () => {
      _onAuthFailed();
    },
  },
});
