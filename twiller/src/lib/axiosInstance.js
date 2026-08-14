import axios from "axios";
import { auth } from "@/context/firebase";

// NOTE: Next.js only exposes env vars to the browser if they're
// prefixed NEXT_PUBLIC_. Set NEXT_PUBLIC_BACKEND_URL in your .env.local
// and in your Vercel project settings.
const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

// Attach the current session token so protected routes can authenticate.
// Prefers the Twiller session JWT (issued after a completed login); falls back
// to the Firebase ID token for accounts signed in through the older flow.
axiosInstance.interceptors.request.use(async (config) => {
  try {
    if (typeof window !== "undefined") {
      const jwtToken = localStorage.getItem("twiller-jwt");
      if (jwtToken) {
        config.headers.Authorization = `Bearer ${jwtToken}`;
        return config;
      }
    }
    const firebaseUser = auth?.currentUser;
    if (firebaseUser) {
      const token = await firebaseUser.getIdToken();
      if (token) config.headers.Authorization = `Bearer ${token}`;
    }
  } catch {
    // Token fetch failure — let the server reject if auth is required.
  }
  return config;
});

// If the stored Twiller JWT was rejected (expired or signed with an old
// secret), clear it and retry the request once with the Firebase ID token
// instead. Without this, a stale "twiller-jwt" in localStorage would keep
// every protected call failing with 401 even while signed in via Firebase.
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
      if (localStorage.getItem("twiller-jwt")) {
        localStorage.removeItem("twiller-jwt");
      }
      const firebaseUser = auth?.currentUser;
      if (firebaseUser) {
        try {
          const token = await firebaseUser.getIdToken();
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
