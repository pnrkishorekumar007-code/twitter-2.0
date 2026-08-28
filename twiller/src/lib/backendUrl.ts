// Single source of truth for the deployed backend base URL.
//
//   • Development (localhost): NEXT_PUBLIC_BACKEND_URL is used when set, and the
//     local backend at http://localhost:5000 is the safe fallback.
//   • Production (Vercel): NEXT_PUBLIC_BACKEND_URL MUST be set to the deployed
//     Express/Render URL. There is deliberately NO fallback to http://localhost:5000
//     here — pointing the deployed site at localhost would make it call the
//     visitor's own machine and every request would fail with "Network Error".

const DEFAULT_DEV_BACKEND_URL = "http://localhost:5000";

export function getBackendBaseUrl(): string {
  const envUrl = (process.env.NEXT_PUBLIC_BACKEND_URL || "")
    .trim()
    .replace(/\/+$/, "");

  if (envUrl && /^https?:\/\//i.test(envUrl)) {
    const isLocalHost = /^https?:\/\/localhost/i.test(envUrl);
    if (process.env.NODE_ENV === "production" && isLocalHost) {
      if (typeof window !== "undefined") {
        console.error(
          "[Twiller] NEXT_PUBLIC_BACKEND_URL points at http://localhost — the deployed site cannot reach your local machine. Set it to the deployed backend URL (e.g. https://twiller-backend.onrender.com) in Vercel -> Project -> Settings -> Environment Variables, then redeploy."
        );
      }
      return "";
    }
    return envUrl;
  }

  if (process.env.NODE_ENV !== "production") {
    return DEFAULT_DEV_BACKEND_URL;
  }

  if (typeof window !== "undefined") {
    console.error(
      "[Twiller] NEXT_PUBLIC_BACKEND_URL is not set. Set it to the deployed backend URL (e.g. https://twiller-backend.onrender.com) in Vercel -> Project -> Settings -> Environment Variables, then redeploy."
    );
  }
  return "";
}