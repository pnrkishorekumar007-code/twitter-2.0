import { isWithinISTWindow } from "./time.js";

// Payments are only allowed 10:00 AM – 11:00 AM IST (10:00–10:59:59).
export const PAYMENT_WINDOW = {
  startHour: 10,
  startMin: 0,
  endHour: 11,
  endMin: 0,
};

export function isPaymentWindowOpen(date = new Date()) {
  return isWithinISTWindow(
    PAYMENT_WINDOW.startHour,
    PAYMENT_WINDOW.startMin,
    PAYMENT_WINDOW.endHour,
    PAYMENT_WINDOW.endMin,
    date
  );
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
