import express from "express";
import User from "../models/user.js";
import { issueOtp, verifyOtp } from "../utils/otp.js";

const router = express.Router();

/**
 * TASK 5: Notification preference toggle
 */
router.patch("/notifications/:email", async (req, res) => {
  try {
    const { email } = req.params;
    const { enabled } = req.body;
    const user = await User.findOneAndUpdate(
      { email },
      { $set: { notificationsEnabled: !!enabled } },
      { new: true }
    );
    return res.status(200).send(user);
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});

/**
 * TASK 6: Multi-language support
 * French -> email OTP. Any other language -> "mobile" OTP.
 * (Free-tier note: real SMS needs a paid provider like Twilio; until you add
 * one, the "mobile" OTP is also delivered to the user's email so the flow
 * still works end-to-end — see README for swapping in real SMS.)
 */
router.post("/language/otp/request", async (req, res) => {
  try {
    const { email, targetLanguage } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).send({ error: "User not found" });

    const purpose = "language_switch";
    const channelLabel = targetLanguage === "fr" ? "email" : "mobile";

    await issueOtp({
      identifier: email,
      purpose,
      emailTo: email,
      label: `Language switch to "${targetLanguage}" (sent via ${channelLabel} channel)`,
    });

    return res.status(200).send({ message: `OTP sent via ${channelLabel}`, channel: channelLabel });
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});

router.post("/language/otp/verify", async (req, res) => {
  try {
    const { email, code, targetLanguage } = req.body;
    const result = await verifyOtp({ identifier: email, purpose: "language_switch", code });
    if (!result.ok) return res.status(400).send({ error: result.reason });

    const user = await User.findOneAndUpdate(
      { email },
      { $set: { preferredLanguage: targetLanguage } },
      { new: true }
    );
    return res.status(200).send(user);
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});

export default router;
