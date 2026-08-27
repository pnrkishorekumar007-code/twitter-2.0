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
  timeout: 15000,
});

// Cached Firebase ID token — avoids a forced refresh on every request.
let cachedFirebaseToken: string | null = null;
let cachedFirebaseUid: string | null = null;

function clearFirebaseTokenCache() {
  cachedFirebaseToken = null;
  cachedFirebaseUid = null;
}

async function getFirebaseIdToken(forceRefresh = false): Promise<string | null> {
  const firebaseUser = auth?.currentUser;
  if (!firebaseUser) return null;

  // Return cached token if same user and not forcing refresh.
  if (!forceRefresh && cachedFirebaseToken && cachedFirebaseUid === firebaseUser.uid) {
    return cachedFirebaseToken;
  }

  try {
    const token = await firebaseUser.getIdToken(forceRefresh);
    cachedFirebaseToken = token;
    cachedFirebaseUid = firebaseUser.uid;
    return token;
  } catch {
    return null;
  }
}

// Clear cache on sign-out. Guard against stacking if module reloads.
if (typeof window !== "undefined" && !(localStorage as Record<string, unknown>).__twillerPatched) {
  const origSetItem = localStorage.setItem.bind(localStorage);
  (localStorage as Record<string, unknown>).__twillerPatched = true;
  localStorage.setItem = (key: string, value: string) => {
    origSetItem(key, value);
    if (key === "twiller-jwt" && (!value || value === "null" || value === "undefined")) clearFirebaseTokenCache();
  };
}

axiosInstance.interceptors.request.use(async (config: TwillerRequestConfig) => {
  try {
    if (typeof window !== "undefined") {
      const jwtToken = localStorage.getItem("twiller-jwt");
      if (jwtToken) {
        config.headers.Authorization = `Bearer ${jwtToken}`;
        return config;
      }
    }
    // No JWT — use cached Firebase ID token (no forced refresh).
    const token = await getFirebaseIdToken(false);
    if (token) config.headers.Authorization = `Bearer ${token}`;
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
      // Force refresh only on 401 retry.
      const token = await getFirebaseIdToken(true);
      if (token) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
        return axiosInstance(config);
      }
    }
    return Promise.reject(error);
  }
);

export { clearFirebaseTokenCache };
export default axiosInstance;
