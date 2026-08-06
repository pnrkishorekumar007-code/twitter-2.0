import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";

// Configure these via .env.local (NEXT_PUBLIC_FIREBASE_*) or paste below.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
};

let app: FirebaseApp | null = null;

// Only initialize on the client and only when credentials are present.
// This avoids crashing server-side prerendering / the build.
export const auth: Auth | null =
  typeof window !== "undefined" && firebaseConfig.apiKey
    ? (() => {
        app = initializeApp(firebaseConfig);
        return getAuth(app);
      })()
    : null;

export default app;
