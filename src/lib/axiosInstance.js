import axios from "axios";
import { auth } from "../context/firebase";

const axiosInstance = axios.create({
  baseURL:
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    process.env.BACKEND_URL ||
    "http://localhost:8000",
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach the Firebase ID token to every request (if a user is signed in).
axiosInstance.interceptors.request.use(async (config) => {
  const user = auth?.currentUser;
  if (user) {
    try {
      const token = await user.getIdToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      // Token fetch failed — proceed without Authorization header.
    }
  }
  return config;
});

export default axiosInstance;
