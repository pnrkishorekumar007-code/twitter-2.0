export function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function simulateSendOtp(
  target: string,
  channel: "email" | "phone"
): string {
  const otp = generateOtp();
  localStorage.setItem("twiller-otp", otp);
  localStorage.setItem("twiller-otp-target", target);
  localStorage.setItem("twiller-otp-channel", channel);
  return otp;
}

export function verifyOtp(input: string): boolean {
  const expected = localStorage.getItem("twiller-otp");
  return Boolean(expected && input === expected);
}

export function consumeOtp(): void {
  localStorage.removeItem("twiller-otp");
  localStorage.removeItem("twiller-otp-target");
  localStorage.removeItem("twiller-otp-channel");
}

export function getOtpContext(): { target: string | null; channel: string | null } {
  return {
    target: localStorage.getItem("twiller-otp-target"),
    channel: localStorage.getItem("twiller-otp-channel"),
  };
}

export function generateLettersPassword(length = 12): string {
  const lower = "abcdefghijklmnopqrstuvwxyz";
  const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const all = lower + upper;
  const chars = [];
  chars.push(lower[Math.floor(Math.random() * lower.length)]);
  chars.push(upper[Math.floor(Math.random() * upper.length)]);
  for (let i = chars.length; i < length; i++) {
    chars.push(all[Math.floor(Math.random() * all.length)]);
  }
  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

export function getIstHour(): number {
  const ist = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
  );
  return ist.getHours();
}

export function getIstTimeLabel(): string {
  return new Date().toLocaleString("en-US", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export function isPaymentWindowOpen(): boolean {
  const hour = getIstHour();
  return hour >= 10 && hour < 11;
}

export function isAudioWindowOpen(): boolean {
  const hour = getIstHour();
  return hour >= 14 && hour < 19;
}

export function detectBrowser(): string {
  const ua = navigator.userAgent;
  if (ua.includes("Edg/")) return "Microsoft Edge";
  if (ua.includes("OPR/") || ua.includes("Opera")) return "Opera";
  if (ua.includes("Chrome")) return "Google Chrome";
  if (ua.includes("Firefox")) return "Mozilla Firefox";
  if (ua.includes("Safari")) return "Safari";
  return "Unknown";
}

export function detectOS(): string {
  const ua = navigator.userAgent;
  if (ua.includes("Windows")) return "Windows";
  if (ua.includes("Mac OS")) return "macOS";
  if (ua.includes("Linux")) return "Linux";
  if (ua.includes("Android")) return "Android";
  if (ua.includes("iPhone") || ua.includes("iPad")) return "iOS";
  return "Unknown";
}

export function detectDevice(): "desktop" | "laptop" | "mobile" {
  const ua = navigator.userAgent;
  const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(ua);
  if (isMobile) return "mobile";
  if (/Mac|Windows|Linux/i.test(ua)) return "laptop";
  return "desktop";
}

export async function detectIp(): Promise<string> {
  try {
    const controllers = new AbortController();
    const timer = setTimeout(() => controllers.abort(), 5000);
    const res = await fetch("https://api.ipify.org?format=json", {
      signal: controllers.signal,
    });
    clearTimeout(timer);
    const data = await res.json();
    return data.ip || "Unknown";
  } catch {
    return "Unknown";
  }
}

export function pluralize(
  count: number,
  single: string,
  multi: string
): string {
  return count === 1 ? single : multi;
}
