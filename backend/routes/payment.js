import express from "express";
import Razorpay from "razorpay";
import crypto from "crypto";
import User from "../models/user.js";
import { requireISTWindow } from "../middleware/timeWindow.js";
import { sendMail } from "../utils/mailer.js";
import { PLANS } from "../utils/plans.js";

const router = express.Router();

function getRazorpay() {
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
}

router.get("/plans", (req, res) => res.status(200).send(PLANS));

/**
 * TASK 1: Subscription plans + Razorpay
 * Payments only allowed 10:00-11:00 IST.
 */
router.post(
  "/create-order",
  requireISTWindow(10, 0, 11, 0, "Payments"),
  async (req, res) => {
    try {
      const { plan } = req.body;
      const planInfo = PLANS[plan];
      if (!planInfo || planInfo.price === 0) {
        return res.status(400).send({ error: "Invalid paid plan" });
      }
      const razorpay = getRazorpay();
      const order = await razorpay.orders.create({
        amount: planInfo.price * 100, // paise
        currency: "INR",
        receipt: `receipt_${Date.now()}`,
        notes: { plan },
      });
      return res.status(200).send({ order, key: process.env.RAZORPAY_KEY_ID });
    } catch (error) {
      return res.status(400).send({ error: error.message });
    }
  }
);

router.post(
  "/verify",
  requireISTWindow(10, 0, 11, 0, "Payments"),
  async (req, res) => {
    try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan, email } =
        req.body;

      const body = `${razorpay_order_id}|${razorpay_payment_id}`;
      const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(body)
        .digest("hex");

      if (expectedSignature !== razorpay_signature) {
        return res.status(400).send({ error: "Payment verification failed" });
      }

      const planInfo = PLANS[plan];
      if (!planInfo) {
        return res.status(400).send({ error: "Invalid plan" });
      }
      const user = await User.findOneAndUpdate(
        { email },
        {
          $set: {
            "subscription.plan": plan,
            "subscription.tweetLimit": planInfo.tweetLimit === Infinity ? 999999 : planInfo.tweetLimit,
            "subscription.tweetsUsedThisCycle": 0,
            "subscription.cycleStart": new Date(),
            "subscription.renewsAt": new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        },
        { new: true }
      );

      await sendMail({
        to: email,
        subject: `Your Twiller ${planInfo.label} plan invoice`,
        html: `
          <h2>Payment successful ✅</h2>
          <p>Thanks for subscribing to Twiller.</p>
          <table cellpadding="6" style="border-collapse:collapse">
            <tr><td><b>Plan</b></td><td>${planInfo.label}</td></tr>
            <tr><td><b>Amount</b></td><td>₹${planInfo.price}</td></tr>
            <tr><td><b>Tweet limit</b></td><td>${planInfo.tweetLimit === Infinity ? "Unlimited" : planInfo.tweetLimit} / month</td></tr>
            <tr><td><b>Payment ID</b></td><td>${razorpay_payment_id}</td></tr>
            <tr><td><b>Order ID</b></td><td>${razorpay_order_id}</td></tr>
            <tr><td><b>Date</b></td><td>${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</td></tr>
          </table>
        `,
      });

      return res.status(200).send({ user });
    } catch (error) {
      return res.status(400).send({ error: error.message });
    }
  }
);

export default router;
