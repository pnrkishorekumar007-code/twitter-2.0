import { UAParser } from "ua-parser-js";

// Robust device detection. Attaches req.deviceInfo:
//
//   { browser, browserVersion, os, deviceType, ipAddress, device, ip }
//
// `device` and `ip` are kept as aliases so the legacy routes that write into
// the embedded User.loginHistory array keep working unchanged.
//
// Classification:
//  - mobile / tablet come straight from the User-Agent (ua-parser-js).
//  - desktop vs laptop can't be read from a User-Agent alone (no screen info),
//    so the frontend may pass optional client hints ({ screenWidth, hasTouch })
//    to refine the guess. Without hints we default to desktop.
export function deviceDetect(req, res, next) {
  const ua = req.headers["user-agent"] || "";
  const parser = new UAParser(ua);
  const result = parser.getResult();
  const uaType = result.device.type;

  const hint =
    (typeof req.body?.clientInfo === "object" && req.body.clientInfo) ||
    (typeof req.query?.clientInfo === "object" && req.query.clientInfo) ||
    {};

  let deviceType = "desktop";
  if (uaType === "mobile" || uaType === "wearable" || uaType === "console") {
    deviceType = "mobile";
  } else if (uaType === "tablet") {
    deviceType = "tablet";
  } else if (uaType === "smarttv") {
    deviceType = "desktop";
  } else {
    const hasTouch = hint?.hasTouch === true;
    const width = Number(hint?.screenWidth) || 0;
    if (hasTouch && width > 0 && width < 1500) deviceType = "laptop";
    else deviceType = "desktop";
  }

  const rawIp =
    String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() ||
    req.socket?.remoteAddress ||
    req.ip ||
    "";
  const ip = String(rawIp).replace(/^::ffff:/, "");

  const browserVersion =
    result.browser.version || (result.engine?.version ? `${result.engine.name} ${result.engine.version}` : "");

  req.deviceInfo = {
    browser: result.browser.name || "Unknown",
    browserVersion,
    os: result.os.name || "Unknown",
    deviceType,
    ipAddress: ip,
    // backward-compat aliases
    device: deviceType,
    ip,
  };
  next();
}
