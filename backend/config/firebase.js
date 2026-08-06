import admin from "firebase-admin";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let serviceAccount;

// Prefer env vars (Render): FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
if (
  process.env.FIREBASE_PROJECT_ID &&
  process.env.FIREBASE_CLIENT_EMAIL &&
  process.env.FIREBASE_PRIVATE_KEY
) {
  serviceAccount = {
    project_id: process.env.FIREBASE_PROJECT_ID,
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  };
} else {
  // Fallback: service account JSON file (local dev)
  const keyPath = path.join(__dirname, "serviceAccountKey.json");
  if (fs.existsSync(keyPath)) {
    serviceAccount = JSON.parse(fs.readFileSync(keyPath, "utf8"));
  }
}

if (serviceAccount && !admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
} else if (!serviceAccount) {
  console.warn(
    "Firebase Admin credentials missing (env vars or serviceAccountKey.json). Auth middleware will reject tokens."
  );
}

export default admin;
