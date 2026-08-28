import LoginHistory from "../models/LoginHistory.js";

/**
 * Records a successful login in the LoginHistory collection.
 * Never throws — a login must not fail because history recording broke.
 */
export async function recordLogin({ userId, deviceInfo, loginMethod }) {
  if (!userId) return null;
  try {
    return await LoginHistory.create({
      userId,
      browser: deviceInfo?.browser || "Unknown",
      browserVersion: deviceInfo?.browserVersion || "",
      os: deviceInfo?.os || "Unknown",
      deviceType: deviceInfo?.deviceType || deviceInfo?.device || "unknown",
      ipAddress: deviceInfo?.ipAddress || deviceInfo?.ip || "",
      loginMethod: loginMethod || "unknown",
    });
  } catch (err) {
    console.error("Failed to record login history:", err.message);
    return null;
  }
}

/**
 * Paginated login history for a user, newest first.
 *
 * @returns {Promise<{ items: Array, total: number, page: number, limit: number, totalPages: number }>}
 */
export async function getLoginHistory({ userId, page = 1, limit = 10 }) {
  const safePage = Math.max(1, parseInt(String(page), 10) || 1);
  const safeLimit = Math.min(50, Math.max(1, parseInt(String(limit), 10) || 10));

  const [items, total] = await Promise.all([
    LoginHistory.find({ userId })
      .sort({ loginTime: -1 })
      .skip((safePage - 1) * safeLimit)
      .limit(safeLimit)
      .lean(),
    LoginHistory.countDocuments({ userId }),
  ]);

  return {
    items,
    total,
    page: safePage,
    limit: safeLimit,
    totalPages: Math.max(1, Math.ceil(total / safeLimit)),
  };
}
