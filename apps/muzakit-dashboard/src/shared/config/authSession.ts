import { createAuthSession, tokenManager } from "@ametie/vue-muza-use";

// The declarative refresh does not inherit a client's base URL, so the session and `myAxios`
// must read the same constant.
export const API_BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}`
  : "/api";

type OnAuthFailedCallback = () => void;
let onAuthFailed: OnAuthFailedCallback = () => {};

// Set from the layout once the auth store exists: Pinia is not available while this module is
// evaluated.
export const setOnAuthFailed = (callback: OnAuthFailedCallback): void => {
  onAuthFailed = callback;
};

// This backend takes the refresh token in the request body and returns both tokens in the
// response, so the token store keeps the refresh token (the default — the session does not
// reconfigure storage) and the body carries it explicitly.
export const authSession = createAuthSession({
  refresh: {
    url: "/auth/refresh",
    baseURL: API_BASE_URL,
    payload: () => ({ refreshToken: tokenManager.getRefreshToken() }),
    extractTokens: ({ data }) => ({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
    }),
  },
});

authSession.on("refreshFailed", () => onAuthFailed());
