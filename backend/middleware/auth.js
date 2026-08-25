import { getFirebaseAdmin } from "../utils/firebaseAdmin.js";
import { verifyAuthToken } from "../utils/jwt.js";

function extractToken(req) {
  const header = req.headers.authorization || "";
  if (header.startsWith("Bearer ")) return header.slice(7);
  return null;
}

// Verifies the Firebase ID token sent by the frontend (Authorization: Bearer ...).
// Attaches the authenticated user to req.user = { uid, email }.
export async function requireAuth(req, res, next) {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).send({ error: "Authentication required." });
  }

  let admin;
  try {
    admin = getFirebaseAdmin();
  } catch {
    return res.status(401).send({ error: "Authentication failed. Please log in again." });
  }
  if (!admin) {
    return res.status(401).send({
      error: "Firebase is not configured on the server. Set FIREBASE_* env vars.",
    });
  }

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    if (!decoded || !decoded.uid) {
      return res.status(401).send({ error: "Invalid authentication token." });
    }
    req.user = { uid: decoded.uid, email: decoded.email || "" };
    next();
  } catch (err) {
    return res.status(401).send({ error: "Invalid or expired authentication token." });
  }
}

// Accepts either a Twiller session JWT (type "auth", issued on completed login)
// or a Firebase ID token. Short-lived login tokens (type "login") are rejected
// — they only authorize the OTP endpoints, not general API access.
export async function requireAnyAuth(req, res, next) {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).send({ error: "Authentication required." });
  }

  // 1) Twiller JWT.
  try {
    const decoded = verifyAuthToken(token);
    if (decoded?.sub && (!decoded.type || decoded.type === "auth")) {
      req.user = {
        uid: String(decoded.sub),
        email: decoded.email || "",
        fromJwt: true,
      };
      return next();
    }
  } catch {
    // not a JWT — fall through to the Firebase check
  }

  // 2) Firebase ID token (existing sessions).
  let admin;
  try {
    admin = getFirebaseAdmin();
  } catch {
    // Firebase Admin SDK init failed (invalid/missing credentials).
    return res.status(401).send({ error: "Authentication failed. Please log in again." });
  }
  if (!admin) {
    return res.status(401).send({
      error: "Firebase is not configured on the server. Set FIREBASE_* env vars.",
    });
  }
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    if (!decoded || !decoded.uid) {
      return res.status(401).send({ error: "Invalid authentication token." });
    }
    req.user = { uid: decoded.uid, email: decoded.email || "" };
    next();
  } catch (err) {
    return res.status(401).send({ error: "Invalid or expired authentication token." });
  }
}
