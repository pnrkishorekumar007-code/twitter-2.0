import express from "express";
import Razorpay from "razorpay";
import crypto from "crypto";
import User from "../models/user.js";
import Subscription from "../models/subscription.js";
import { requireAnyAuth } from "../middleware/auth.js";
import { requirePaymentWindow, requirePaymentWindowWithGrace } from "../middleware/paymentWindow.js";
import { paymentWindowStatus } from "../utils/paymentWindow.js";
import { PLANS, storedTweetLimit } from "../utils/plans.js";
import { generateInvoicePdf } from "../utils/invoice.js";
import { sendSubscriptionActivatedEmail } from "../utils/mailer.js";
import { rateLimit } from "../utils/rateLimiter.js";
import sanitizeUser from "../utils/sanitizeUser.js";

const router = express.Router();

const SUBSCRIPTION_DAYS = 30;

function getRazorpay() {
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
}

function formatIST(date) {
  return new Date(date).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "long",
    timeStyle: "short",
  });
}

// Public: plan catalogue (client only renders; prices/limits validated server-side)
router.get("/plans", (req, res) => res.status(200).send(PLANS));

// Public: tells the frontend whether the payment window is open right now
router.get("/status", (req, res) => res.status(200).send(paymentWindowStatus()));

/**
 * Create a Razorpay order for a paid plan.
 * - Requires a valid Firebase ID token (auth)
 * - Only allowed inside the 10:00–11:00 AM IST window
 * - Plan + amount come from the server, never from the client
 */
router.post(
  "/create-order",
  requireAnyAuth,
  requirePaymentWindow,
  async (req, res) => {
    try {
      // Rate limit order creation: max 10 per hour per account.
      const limiter = rateLimit({
        key: `payment-order:${req.user.uid || req.user.email}`,
        windowMs: 60 * 60 * 1000,
        max: 10,
      });
      if (!limiter.allowed) {
        return res.status(429).send({
          error: "Too many payment attempts. Please try again later.",
        });
      }

      const { plan } = req.body || {};
      const planKey = String(plan || "").toUpperCase();
      const planInfo = PLANS[planKey];

      if (!planInfo || planInfo.price <= 0) {
        return res.status(400).send({ error: "Invalid paid plan." });
      }

      const user = await User.findOne({ email: req.user.email });
      if (!user) {
        return res.status(404).send({ error: "User not found" });
      }

      const razorpay = getRazorpay();
      const order = await razorpay.orders.create({
        amount: planInfo.price * 100, // paise
        currency: "INR",
        receipt: `rcpt_${Date.now()}`,
        notes: { plan: planKey, userId: String(user._id) },
      });

      // Store the pending order so verify can look it up and prevent replay.
      await Subscription.create({
        userId: user._id,
        planName: planKey,
        amount: planInfo.price,
        orderId: order.id,
        status: "PENDING",
      });

      return res.status(200).send({ order, key: process.env.RAZORPAY_KEY_ID });
    } catch (error) {
      return res.status(400).send({ error: error.message });
    }
  }
);

/**
 * Verify a Razorpay payment and activate the subscription.
 * - Signature validated with the server's key secret
 * - Plan/amount taken from the stored order (client cannot tamper)
 * - Status guard prevents duplicate processing / invoice regeneration
 */
router.post(
  "/verify",
  requireAnyAuth,
  requirePaymentWindowWithGrace,
  async (req, res) => {
    try {
      // Rate limit verification attempts: max 20 per hour per account.
      const limiter = rateLimit({
        key: `payment-verify:${req.user.uid || req.user.email}`,
        windowMs: 60 * 60 * 1000,
        max: 20,
      });
      if (!limiter.allowed) {
        return res.status(429).send({
          error: "Too many payment attempts. Please try again later.",
        });
      }

      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
        req.body || {};

      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return res.status(400).send({ error: "Missing payment verification data." });
      }

      // 1. Validate the Razorpay signature (constant-time comparison)
      const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest("hex");
      const sigBuf = Buffer.from(razorpay_signature, "hex");
      const expectedBuf = Buffer.from(expectedSignature, "hex");
      if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
        return res.status(400).send({ error: "Payment verification failed." });
      }

      // 2. Atomically claim the order — only one request can process it
      const subscription = await Subscription.findOneAndUpdate(
        { orderId: razorpay_order_id, status: "PENDING", paymentId: null },
        { $set: { status: "PROCESSING" } },
        { new: true }
      );
      if (!subscription) {
        return res.status(400).send({ error: "This order has already been processed or is invalid." });
      }

      const user = await User.findById(subscription.userId);
      if (!user) {
        return res.status(404).send({ error: "User not found" });
      }
      if (user.email !== req.user.email) {
        return res
          .status(403)
          .send({ error: "You are not authorized to verify this order." });
      }

      // 3. Confirm with Razorpay that the payment really was captured for this order
      const razorpay = getRazorpay();
      const payment = await razorpay.payments.fetch(razorpay_payment_id);
      if (!payment || payment.status !== "captured") {
        await Subscription.findByIdAndUpdate(subscription._id, { status: "FAILED" });
        return res.status(400).send({ error: "Payment was not captured." });
      }
      if (
        payment.order_id !== razorpay_order_id ||
        payment.amount !== subscription.amount * 100
      ) {
        await Subscription.findByIdAndUpdate(subscription._id, { status: "FAILED" });
        return res.status(400).send({ error: "Payment does not match the order." });
      }

      // 4. Apply the plan to the user
      const startDate = new Date();
      const endDate = new Date(Date.now() + SUBSCRIPTION_DAYS * 24 * 60 * 60 * 1000);
      user.subscriptionPlan = subscription.planName;
      user.tweetLimit = storedTweetLimit(subscription.planName);
      user.tweetsUsed = 0;
      user.subscriptionStartDate = startDate;
      user.subscriptionEndDate = endDate;
      user.paymentStatus = "active";
      await user.save();

      // 5. Generate invoice + finalise the subscription record
      const invoiceNumber = `INV-${startDate
        .toISOString()
        .slice(0, 10)
        .replace(/-/g, "")}-${String(user._id)
        .slice(-4)
        .toUpperCase()}${Math.floor(1000 + Math.random() * 9000)}`;

      const invoicePdf = await generateInvoicePdf({
        invoiceNumber,
        customerName: user.displayName,
        customerEmail: user.email,
        planName: PLANS[subscription.planName].label,
        amount: subscription.amount,
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
        purchaseDate: formatIST(startDate),
        expiryDate: formatIST(endDate),
      });

      subscription.paymentId = razorpay_payment_id;
      subscription.invoiceNumber = invoiceNumber;
      subscription.status = "ACTIVE";
      subscription.startDate = startDate;
      subscription.endDate = endDate;
      await subscription.save();

      // 6. Email the invoice (best-effort — never fail a payment over email issues)
      try {
        await sendSubscriptionActivatedEmail({
          to: user.email,
          customerName: user.displayName,
          planLabel: PLANS[subscription.planName].label,
          amount: subscription.amount,
          startDate: formatIST(startDate),
          expiryDate: formatIST(endDate),
          invoiceNumber,
          invoicePdfBuffer: invoicePdf,
        });
      } catch (emailErr) {
        console.error("Subscription email failed:", emailErr.message);
      }

      return res.status(200).send({ success: true, user: sanitizeUser(user), subscription });
    } catch (error) {
      return res.status(400).send({ error: error.message });
    }
  }
);

/**
 * Razorpay webhook — called asynchronously by Razorpay when a payment event
 * occurs. If the user's browser closed before /verify ran, this is the
 * fallback that still activates the subscription.
 *
 * The raw body is needed for HMAC signature verification. The express.json
 * middleware above already parsed it, so we re-serialise; alternatively
 * the raw body can be preserved with a custom middleware if preferred.
 */
router.post("/webhook", async (req, res) => {
  const event = req.body;

  // Verify the webhook signature using the raw body captured before parsing.
  const rawBody = req.rawBody;
  const signature = req.headers["x-razorpay-signature"];
  if (!rawBody || !signature) {
    return res.status(400).send({ error: "Missing signature or body" });
  }
  // Validate hex format and length before calling timingSafeEqual (which throws on mismatched lengths)
  if (!/^[0-9a-f]{64}$/i.test(signature)) {
    return res.status(400).send({ error: "Invalid webhook signature format" });
  }
  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(rawBody)
    .digest("hex");
  if (!crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(signature, "hex"))) {
    return res.status(400).send({ error: "Invalid webhook signature" });
  }

  if (event.event === "payment.captured") {
    const { order_id, id: payment_id } = event.payload?.payment?.entity || {};
    if (!order_id || !payment_id) {
      return res.status(200).send({ ok: true });
    }

    try {
      const subscription = await Subscription.findOneAndUpdate(
        { orderId: order_id, status: "PENDING" },
        { $set: { status: "PROCESSING" } },
        { new: true }
      );
      if (!subscription) {
        return res.status(200).send({ ok: true });
      }

      const razorpay = getRazorpay();
      const payment = await razorpay.payments.fetch(payment_id);
      if (!payment || payment.status !== "captured") {
        return res.status(200).send({ ok: true });
      }

      const user = await User.findById(subscription.userId);
      if (!user) return res.status(200).send({ ok: true });

      const startDate = new Date();
      const endDate = new Date(Date.now() + SUBSCRIPTION_DAYS * 24 * 60 * 60 * 1000);
      user.subscriptionPlan = subscription.planName;
      user.tweetLimit = storedTweetLimit(subscription.planName);
      user.tweetsUsed = 0;
      user.subscriptionStartDate = startDate;
      user.subscriptionEndDate = endDate;
      user.paymentStatus = "active";
      await user.save();

      const invoiceNumber = `INV-${startDate.toISOString().slice(0, 10).replace(/-/g, "")}-${String(user._id).slice(-4).toUpperCase()}${Math.floor(1000 + Math.random() * 9000)}`;

      const invoicePdf = await generateInvoicePdf({
        invoiceNumber,
        customerName: user.displayName,
        customerEmail: user.email,
        planName: PLANS[subscription.planName].label,
        amount: subscription.amount,
        paymentId: payment_id,
        orderId: order_id,
        purchaseDate: formatIST(startDate),
        expiryDate: formatIST(endDate),
      });

      subscription.paymentId = payment_id;
      subscription.invoiceNumber = invoiceNumber;
      subscription.status = "ACTIVE";
      subscription.startDate = startDate;
      subscription.endDate = endDate;
      await subscription.save();

      try {
        await sendSubscriptionActivatedEmail({
          to: user.email,
          customerName: user.displayName,
          planLabel: PLANS[subscription.planName].label,
          amount: subscription.amount,
          startDate: formatIST(startDate),
          expiryDate: formatIST(endDate),
          invoiceNumber,
          invoicePdfBuffer: invoicePdf,
        });
      } catch (emailErr) {
        console.error("Webhook email failed:", emailErr.message);
      }
    } catch (err) {
      console.error("Webhook processing error:", err.message);
    }
  }

  // Always return 200 so Razorpay does not retry.
  return res.status(200).send({ ok: true });
});

// Signature verifier used as the express.json verify callback for the webhook
// route. Re-attaches the raw body so HMAC can be validated.
function verifyRazorpaySignature(req, _res, buf) {
  const signature = req.headers["x-razorpay-signature"];
  if (!signature) return;

  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(buf)
    .digest("hex");

  if (expectedSignature !== signature) {
    throw new Error("Invalid Razorpay webhook signature");
  }
}

/**
 * Subscription history — returns all past subscriptions for the current user.
 */
router.get("/history", requireAnyAuth, async (req, res) => {
  try {
    const user = await User.findOne({ email: req.user.email });
    if (!user) return res.status(404).send({ error: "User not found" });

    const subscriptions = await Subscription.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .select("planName amount status invoiceNumber startDate endDate createdAt")
      .lean();

    return res.status(200).send({ subscriptions });
  } catch (error) {
    return res.status(500).send({ error: error.message });
  }
});

export default router;
