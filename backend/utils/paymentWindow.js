import { isWithinISTWindow } from "./time.js";

// Payments are only allowed 10:00 AM – 11:00 AM IST (10:00–10:59:59).
export const PAYMENT_WINDOW = {
  startHour: 10,
  startMin: 0,
  endHour: 11,
  endMin: 0,
};

// Grace period in minutes after window close for /payment/verify only.
// If a user completes payment at 10:59:50, Razorpay may redirect at 11:00:05.
// The verify endpoint still succeeds within this grace window.
const VERIFY_GRACE_MINUTES = 5;

export function isPaymentWindowOpen(date = new Date()) {
  return isWithinISTWindow(
    PAYMENT_WINDOW.startHour,
    PAYMENT_WINDOW.startMin,
    PAYMENT_WINDOW.endHour,
    PAYMENT_WINDOW.endMin,
    date
  );
}

// Like isPaymentWindowOpen but allows an extra VERIFY_GRACE_MINUTES after
// the window closes. Used only on the /payment/verify route.
export function isPaymentWindowOpenWithGrace(date = new Date()) {
  if (isPaymentWindowOpen(date)) return true;

  const { hour, minute } = (() => {
    const fmt = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const parts = fmt.formatToParts(date);
    return {
      hour: Number(parts.find((p) => p.type === "hour").value),
      minute: Number(parts.find((p) => p.type === "minute").value),
    };
  })();

  const nowMinutes = hour * 60 + minute;
  const endMinutes = PAYMENT_WINDOW.endHour * 60 + PAYMENT_WINDOW.endMin;
  return nowMinutes < endMinutes + VERIFY_GRACE_MINUTES;
}

// Returns the exact payload the spec asks for when the window is closed.
export function paymentWindowStatus(date = new Date()) {
  if (isPaymentWindowOpen(date)) {
    return {
      success: true,
      message: "Payment window is open.",
    };
  }
  return {
    success: false,
    message: "Payments are allowed only between 10:00 AM and 11:00 AM IST.",
  };
}
