import { paymentWindowStatus } from "../utils/paymentWindow.js";

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
