import { createApiClient } from "@ametie/vue-muza-use";
import type { AxiosInstance } from "axios";

import { API_BASE_URL, authSession } from "./authSession";

export { setOnAuthFailed } from "./authSession";

export const myAxios: AxiosInstance = createApiClient({
  baseURL: API_BASE_URL,
  timeout: 2 * 60 * 1000, // 2 minutes timeout
  authSession,
});
