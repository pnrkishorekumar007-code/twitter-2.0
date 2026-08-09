import axios from "axios";

// NOTE: Next.js only exposes env vars to the browser if they're
// prefixed NEXT_PUBLIC_. Set NEXT_PUBLIC_BACKEND_URL in your .env.local
// and in your Vercel project settings.
const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BACKEND_URL,
  headers: {
    "Content-Type": "application/json",
  },
});
export default axiosInstance;
