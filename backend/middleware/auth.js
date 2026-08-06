import admin from "../config/firebase.js";

const verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split("Bearer ")[1];

    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    if (!admin.apps.length) {
      return res
        .status(503)
        .json({ message: "Auth service not configured" });
    }

    const decoded = await admin.auth().verifyIdToken(token);

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

export default verifyToken;
