import { isWithinISTWindow } from "../utils/time.js";

// Returns Express middleware that blocks the request outside [startHour:startMin, endHour:endMin) IST
export function requireISTWindow(startHour, startMin, endHour, endMin, featureName = "This action") {
  return (req, res, next) => {
    if (!isWithinISTWindow(startHour, startMin, endHour, endMin)) {
      const fmt = (h, m) => `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      return res.status(403).send({
        error: `${featureName} is only allowed between ${fmt(startHour, startMin)} and ${fmt(
          endHour,
          endMin
        )} IST. Please try again during that window.`,
      });
    }
    next();
  };
}
