import { isWithinISTWindow } from "../utils/time.js";

// Formats an hour in 12-hour clock, e.g. 14 -> "2:00 PM".
function fmt12(h) {
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:00 ${period}`;
}

// Returns Express middleware that blocks the request outside [startHour:startMin, endHour:endMin) IST.
// Responds with the message both as `message` (spec) and `error` (legacy error extraction).
export function requireISTWindow(startHour, startMin, endHour, endMin, featureName = "This action") {
  return (req, res, next) => {
    if (!isWithinISTWindow(startHour, startMin, endHour, endMin)) {
      const message = `${featureName} are allowed only between ${fmt12(startHour)} and ${fmt12(
        endHour
      )} IST.`;
      return res.status(403).send({ success: false, message, error: message });
    }
    next();
  };
}
