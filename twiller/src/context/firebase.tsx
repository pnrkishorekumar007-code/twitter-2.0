
import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
// keep your credentials in NEXT_PUBLIC_FIREBASE_* env vars
const clean = (value?: string) => (value ?? "").trim().replace(/^["']+|["']+$/g, "");

const firebaseConfig = {
  apiKey: clean(process.env.NEXT_PUBLIC_FIREBASE_API_KEY),
  authDomain: clean(process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN),
  projectId: clean(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID),
  storageBucket: clean(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET),
  messagingSenderId: clean(process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID),
  appId: clean(process.env.NEXT_PUBLIC_FIREBASE_APP_ID),
  measurementId: clean(process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID),
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
