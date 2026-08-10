import admin from "firebase-admin";

let initialized = false;

function buildServiceAccount() {
  const full = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (full) return JSON.parse(full);
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

export function getFirebaseAdmin() {
  if (!initialized) {
    const serviceAccount = buildServiceAccount();
    if (!serviceAccount) {
      console.warn(
        "⚠️ Firebase service account not set (FIREBASE_SERVICE_ACCOUNT or FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY) — password reset will update the DB record only, not the real Firebase login password."
      );
      return null;
    }
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    initialized = true;
  }
  return admin;
}

// Updates the actual Firebase Auth password so the generated password works at login.
export async function setFirebaseUserPassword(email, newPassword) {
  const fbAdmin = getFirebaseAdmin();
  if (!fbAdmin) return false;
  const userRecord = await fbAdmin.auth().getUserByEmail(email);
  await fbAdmin.auth().updateUser(userRecord.uid, { password: newPassword });
  return true;
}
