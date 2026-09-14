import axios from "axios";
import { authClient, SERVER_URL } from "./auth-client";
import Constants from "expo-constants";

console.log("🚀 [API Client Initialized with Server URL]:", SERVER_URL);

export const apiClient = axios.create({
  baseURL: SERVER_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
  withCredentials: true,
});

apiClient.interceptors.request.use(
  async (config) => {
    if (!config.headers["Content-Type"]) {
      config.headers["Content-Type"] = "application/json";
    }

    const cookieClient = authClient as unknown as { getCookie?: () => Promise<string | undefined> };
    const cookieString = await cookieClient.getCookie?.();
    if (cookieString) {
      config.headers["cookie"] = cookieString;
    }
    config.headers["expo-origin"] = Constants.expoConfig?.scheme || "native";
    config.headers["x-skip-oauth-proxy"] = "true";

    console.log(
      `🌐 [Axios Request] ${config.method?.toUpperCase()} ${config.baseURL || ""}${config.url}`,
    );

    return config;
  },
  (error) => {
    console.error("❌ [Axios Request Error]:", error);
    return Promise.reject(error);
  },
);

apiClient.interceptors.response.use(
  (response) => {
    console.log(`✅ [Axios Response] ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    if (error.response) {
      console.log(
        `❌ [Axios Response Error] ${error.response.status} ${error.config?.url}:`,
        JSON.stringify(error.response.data),
      );
    } else if (error.request) {
      console.log(`❌ [Axios Network Error - No Response] ${error.config?.url}: ${error.message}`);
    } else {
      console.log(`❌ [Axios Error]:`, error.message);
    }
    return Promise.reject(error);
  },
);

export default apiClient;
