import axios, { type InternalAxiosRequestConfig } from "axios";
import { auth } from "@/context/firebase";

interface TwillerRequestConfig extends InternalAxiosRequestConfig {
  _twillerRetried?: boolean;
}

const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

axiosInstance.interceptors.request.use(async (config: TwillerRequestConfig) => {
  try {
    if (typeof window !== "undefined") {
      const jwtToken = localStorage.getItem("twiller-jwt");
      if (jwtToken) {
        config.headers.Authorization = `Bearer ${jwtToken}`;
        return config;
      }
    }
    // No JWT — try a fresh Firebase ID token (forceRefresh avoids a stale
    // cached token that the server might reject).
    const firebaseUser = auth?.currentUser;
    if (firebaseUser) {
      const token = await firebaseUser.getIdToken(true);
      if (token) config.headers.Authorization = `Bearer ${token}`;
    }
  } catch {
    // Token fetch failure — let the server reject if auth is required.
  }
  return config;
});

axiosInstance.interceptors.response.use(
  (res) => res,
  async (error) => {
    const { config, response } = error;
    if (
      response?.status === 401 &&
      config &&
      !config._twillerRetried &&
      typeof window !== "undefined"
    ) {
      config._twillerRetried = true;
      // Remove stale JWT and try with a fresh Firebase ID token.
      if (localStorage.getItem("twiller-jwt")) {
        localStorage.removeItem("twiller-jwt");
      }
      const firebaseUser = auth?.currentUser;
      if (firebaseUser) {
        try {
          const token = await firebaseUser.getIdToken(true);
          if (token) {
            config.headers = config.headers || {};
            config.headers.Authorization = `Bearer ${token}`;
            return axiosInstance(config);
          }
        } catch {
          // Retry failed — reject the original error.
        }
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
