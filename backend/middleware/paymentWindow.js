import { paymentWindowStatus, isPaymentWindowOpenWithGrace } from "../utils/paymentWindow.js";

// Blocks payment-related requests outside the 10:00–11:00 AM IST window.
export function requirePaymentWindow(req, res, next) {
  const status = paymentWindowStatus();
  if (!status.success) {
    return res.status(403).send({
      success: false,
      message: status.message,
    });
  }
  next();
}

// Same as requirePaymentWindow but allows a 5-minute grace period after
// the window closes. Used on /payment/verify so late Razorpay redirects
// still go through.
export function requirePaymentWindowWithGrace(req, res, next) {
  if (isPaymentWindowOpenWithGrace()) return next();
  return res.status(403).send({
    success: false,
    message: "Payment verification window has expired. Please try again during the next window.",
  });
}
