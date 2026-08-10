import express from "express";
import User from "../models/user.js";
import { deviceDetect } from "../middleware/deviceDetect.js";
import { isWithinISTWindow } from "../utils/time.js";
import { issueOtp, verifyOtp } from "../utils/otp.js";
import { generateLetterPassword } from "../utils/passwordGenerator.js";
import { setFirebaseUserPassword } from "../utils/firebaseAdmin.js";

const router = express.Router();

/**
 * TASK 3: Login with device/browser awareness
 * - Records browser/OS/device/IP into loginHistory
 * - Chrome -> requires email OTP (2-step: /login/start then /login/verify)
 * - Microsoft Edge / IE -> no extra auth
 * - Mobile device -> only allowed 10:00-13:00 IST
 */
router.post("/login/start", deviceDetect, async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).send({ error: "User not found" });

    const { browser, device } = req.deviceInfo;

    if (device === "mobile" && !isWithinISTWindow(10, 0, 13, 0)) {
      return res.status(403).send({
        error: "Mobile login is only allowed between 10:00 and 13:00 IST.",
      });
    }

    const isChrome = /chrome/i.test(browser) && !/edge|edg/i.test(browser);
    const isMicrosoft = /edge|edg|internet explorer/i.test(browser);

    if (isChrome) {
      await issueOtp({
        identifier: user.email,
        purpose: "login",
        emailTo: user.email,
        label: "Login verification",
      });
      return res.status(200).send({ requiresOtp: true, channel: "email" });
    }

    // Microsoft browsers (or anything else) skip extra auth
    user.loginHistory.unshift({ ...req.deviceInfo, loggedInAt: new Date() });
    user.loginHistory = user.loginHistory.slice(0, 25);
    await user.save();
    return res.status(200).send({ requiresOtp: false, user });
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});

router.post("/login/verify", deviceDetect, async (req, res) => {
  try {
    const { email, code } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).send({ error: "User not found" });

    const result = await verifyOtp({ identifier: email, purpose: "login", code });
    if (!result.ok) return res.status(400).send({ error: result.reason });

    user.loginHistory.unshift({ ...req.deviceInfo, loggedInAt: new Date() });
    user.loginHistory = user.loginHistory.slice(0, 25);
    await user.save();
    return res.status(200).send({ user });
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});

/**
 * TASK 2: Forgot password
 * - Reset via email OR phone (both routed to email OTP for delivery, since
 *   SMS needs a paid provider — see README)
 * - Once per calendar day
 * - Generates a letters-only password
 */
router.post("/forgot-password/request", async (req, res) => {
  try {
    const { identifier } = req.body; // email or phone
    const user = await User.findOne({ $or: [{ email: identifier }, { phone: identifier }] });
    if (!user) return res.status(404).send({ error: "No account found with that email/phone" });

    const last = user.passwordReset?.lastRequestedAt;
    if (last) {
      const sameDay =
        new Date(last).toDateString() === new Date().toDateString();
      if (sameDay) {
        return res
          .status(429)
          .send({ error: "You can use this option only one time per day." });
      }
    }

    await issueOtp({
      identifier: user.email,
      purpose: "password_reset",
      emailTo: user.email,
      label: "Password reset",
    });

    user.set("passwordReset.lastRequestedAt", new Date());
    await user.save();

    return res.status(200).send({ message: "OTP sent to your registered email." });
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});

router.post("/forgot-password/verify", async (req, res) => {
  try {
    const { identifier, code } = req.body;
    const user = await User.findOne({ $or: [{ email: identifier }, { phone: identifier }] });
    if (!user) return res.status(404).send({ error: "No account found" });

    const result = await verifyOtp({ identifier: user.email, purpose: "password_reset", code });
    if (!result.ok) return res.status(400).send({ error: result.reason });

    const newPassword = generateLetterPassword(12);
    user.password = newPassword; // NOTE: hash this with bcrypt if you also use it for non-Firebase login
    await user.save();

    let firebaseUpdated = false;
    try {
      firebaseUpdated = await setFirebaseUserPassword(user.email, newPassword);
    } catch (e) {
      console.error("Firebase password update failed:", e.message);
    }

    return res.status(200).send({
      newPassword,
      note: firebaseUpdated
        ? "This password now works for your account login."
        : "Saved to your record, but FIREBASE_SERVICE_ACCOUNT isn't configured on the server, so your actual login password wasn't changed yet.",
    });
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});

export default router;
