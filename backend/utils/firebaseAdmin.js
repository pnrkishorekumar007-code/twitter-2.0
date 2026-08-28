import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

let app = null;

function buildServiceAccount() {
  const full = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (full) {
    try { return JSON.parse(full); } catch { return null; }
  }
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  if (projectId && clientEmail && privateKey) {
    return {
      type: "service_account",
      project_id: projectId,
      client_email: clientEmail,
      private_key: privateKey.replace(/\\n/g, "\n"),
    };
  }
  return null;
}

// firebase-admin v14 is modular: the namespace no longer exposes .auth().
// This wrapper keeps the old shape (getFirebaseAdmin().auth()) for callers.
export function getFirebaseAdmin() {
  if (!app) {
    const serviceAccount = buildServiceAccount();
    if (!serviceAccount) {
      console.warn(
        "⚠️ Firebase service account not set (FIREBASE_SERVICE_ACCOUNT or FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY) — password reset will update the DB record only, not the real Firebase login password."
      );
      return null;
    }
    try {
      app = initializeApp({ credential: cert(serviceAccount) });
    } catch (err) {
      console.warn("⚠️ Firebase Admin SDK init failed:", err.message);
      return null;
    }
  }
  return {
    auth: () => getAuth(app),
  };
}

// Updates the actual Firebase Auth password so the generated password works at login.
// identifier may be an email or a phone number (E.164 like "+919876543210").
export async function setFirebaseUserPassword(identifier, newPassword) {
  const fbAdmin = getFirebaseAdmin();
  if (!fbAdmin) return false;

  const auth = fbAdmin.auth();
  let uid = null;

  try {
    const userRecord = await auth.getUserByEmail(identifier);
    uid = userRecord.uid;
  } catch (emailErr) {
    // Not an email (or no account with it) — try phone number.
    try {
      const phoneRecord = await auth.getUserByPhoneNumber(identifier);
      uid = phoneRecord.uid;
    } catch (phoneErr) {
      throw new Error("No Firebase Auth account found for the given email/phone.");
    }
  }

  await auth.updateUser(uid, { password: newPassword });
  return true;
}
