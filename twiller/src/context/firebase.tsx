
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

// Missing/blank web API key is the #1 cause of the Identity Toolkit 400
// (auth/invalid-api-key) on accounts:signUp and accounts:signInWithPassword.
// Fail loudly instead of silently sending an empty key to the endpoint.
const missingKeys = ([
  ["NEXT_PUBLIC_FIREBASE_API_KEY", firebaseConfig.apiKey],
] as const).filter(([, v]) => !v);

if (typeof window !== "undefined" && missingKeys.length > 0) {
  console.error(
    `[Twiller] Firebase auth disabled: ${missingKeys
      .map(([k]) => k)
      .join(", ")} is not set in twiller/.env.local. ` +
      `Get it from Firebase Console -> Project settings -> Your apps -> SDK setup.`
  );
}

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
