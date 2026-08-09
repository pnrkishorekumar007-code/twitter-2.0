import { UAParser } from "ua-parser-js";

// Attaches req.deviceInfo = { browser, os, device, ip }
export function deviceDetect(req, res, next) {
  const ua = req.headers["user-agent"] || "";
  const parser = new UAParser(ua);
  const result = parser.getResult();

  let device = "desktop";
  if (result.device.type === "mobile") device = "mobile";
  else if (result.device.type === "tablet") device = "mobile"; // treat tablets like mobile for the rule
  else if (result.device.type === undefined) device = "laptop"; // best-effort default

  const ip =
    (req.headers["x-forwarded-for"] || "").split(",")[0].trim() ||
    req.socket?.remoteAddress ||
    req.ip;

  req.deviceInfo = {
    browser: result.browser.name || "Unknown",
    os: result.os.name || "Unknown",
    device,
    ip,
  };
  next();
}
