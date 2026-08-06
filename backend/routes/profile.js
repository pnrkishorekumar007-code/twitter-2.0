import express from "express";
import verifyToken from "../middleware/auth.js";
import User from "../models/user.js";

const router = express.Router();

router.get("/profile", verifyToken, async (req, res) => {
  try {
    const { email } = req.user;
    const dbUser = await User.findOne({ email });
    res.json({
      uid: req.user.uid,
      email,
      user: dbUser ?? null,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
