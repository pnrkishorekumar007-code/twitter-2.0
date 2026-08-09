import admin from "firebase-admin";

let initialized = false;

export function getFirebaseAdmin() {
  if (!initialized) {
    if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
      console.warn(
        "⚠️ FIREBASE_SERVICE_ACCOUNT not set — password reset will update the DB record only, not the real Firebase login password."
      );
      return null;
    }
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
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
