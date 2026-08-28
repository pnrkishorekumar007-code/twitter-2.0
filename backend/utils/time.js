// All "IST window" checks convert current time to Asia/Kolkata regardless
// of the server's own timezone (Render servers run in UTC).
export function getISTParts(date = new Date()) {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(date);
  const hour = Number(parts.find((p) => p.type === "hour").value);
  const minute = Number(parts.find((p) => p.type === "minute").value);
  return { hour, minute };
}

// Inclusive-start, exclusive-end window check, e.g. isWithinISTWindow(10,0, 11,0)
export function isWithinISTWindow(startHour, startMin, endHour, endMin, date = new Date()) {
  const { hour, minute } = getISTParts(date);
  const nowMinutes = hour * 60 + minute;
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;
  return nowMinutes >= startMinutes && nowMinutes < endMinutes;
}
