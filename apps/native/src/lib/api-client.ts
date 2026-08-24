import axios from "axios";
import { env } from "@secured_attendance/env/native";
import { authClient } from "./auth-client";
import Constants from "expo-constants";

export const apiClient = axios.create({
  baseURL: env.EXPO_PUBLIC_SERVER_URL,
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

    const cookieString = await (authClient as any).getCookie();
    if (cookieString) {
      config.headers["cookie"] = cookieString;
    }
    config.headers["expo-origin"] = Constants.expoConfig?.scheme || "native";
    config.headers["x-skip-oauth-proxy"] = "true";

    return config;
  },
  (error) => {
    console.error("Request Error:", error);
    return Promise.reject(error);
  },
);

apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error("API Error:", error.message);
    if (error.response) {
      console.error("Error Response:", error.response.status, error.response.data);
    } else if (error.request) {
      console.error("Network Error - No response received");
    }
    return Promise.reject(error);
  },
);

export default apiClient;
