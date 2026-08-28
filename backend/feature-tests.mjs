import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), ".env") });

import mongoose from "mongoose";
import User from "./models/user.js";
import Tweet from "./models/tweet.js";
import AudioTweet from "./models/AudioTweet.js";
import LoginHistory from "./models/LoginHistory.js";
import LoginOTP from "./models/LoginOTP.js";
import AudioTweetOTP from "./models/AudioTweetOTP.js";
import LanguageChangeOTP from "./models/LanguageChangeOTP.js";
import Otp from "./models/otp.js";
import { hashOtp as loginHash } from "./services/loginOtpService.js";
import { hashOtp as audioHash } from "./services/audioOtpService.js";
import { hashOtp as langHash } from "./services/languageOtpService.js";
import { generateLetterPassword } from "./utils/passwordGenerator.js";
import { generateInvoicePdf } from "./utils/invoice.js";
import { sendSubscriptionActivatedEmail } from "./utils/mailer.js";
import { containsKeyword } from "./utils/keywordDetector.js";

const BASE = process.env.TEST_BASE || "http://localhost:5000";

const CHROME_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
const EDGE_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.2592.61";
const FIREFOX_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:127.0) Gecko/20100101 Firefox/127.0";
const IPHONE_UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";

let passed = 0;
let failed = 0;
const lines = [];

function check(name, cond, detail = "") {
  if (cond) {
    passed++;
    lines.push(`  PASS  ${name}`);
  } else {
    failed++;
    lines.push(`  FAIL  ${name} ${detail}`);
  }
}

function section(title) {
  lines.push("");
  lines.push(`## ${title}`);
}

async function req(method, p, { body, token, ua, form } = {}) {
  const h = {};
  if (token) h["Authorization"] = `Bearer ${token}`;
  if (ua) h["User-Agent"] = ua;
  let payload;
  if (form) {
    payload = form;
  } else if (body !== undefined) {
    payload = JSON.stringify(body);
    h["Content-Type"] = "application/json";
  }
  const res = await fetch(BASE + p, { method, headers: h, body: payload });
  let json = null;
  try {
    json = await res.json();
  } catch {}
  return { status: res.status, json };
}

async function makeUser(tag) {
  const rand = Math.random().toString(36).slice(2, 10);
  const email = `tftest-${tag}-${rand}@example.com`.toLowerCase();
  const body = {
    username: `tf_${tag}_${rand}`,
    displayName: `TF ${tag}`,
    avatar: "https://example.com/avatar.png",
    email,
  };
  const reg = await req("POST", "/register", { body });
  return { email, userId: String(reg.json?._id || "") };
}

async function login(email, ua) {
  return req("POST", "/auth/login", { body: { email }, ua });
}

async function planUser(plan, tweetLimit, tweetCount) {
  const u = await makeUser(`plan_${plan}`);
  await User.updateOne(
    { email: u.email },
    {
      $set: {
        subscriptionPlan: plan,
        tweetLimit,
        tweetsUsed: 0,
        quotaMonth: null,
        paymentStatus: plan === "FREE" ? "inactive" : "active",
        subscriptionEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    }
  );
  const tok = (await login(u.email, FIREFOX_UA)).json.token;
  const statuses = [];
  for (let i = 0; i < tweetCount; i++) {
    const r = await req("POST", "/post", { body: { content: `${plan} tweet ${i}` }, token: tok });
    statuses.push(r.status);
  }
  return statuses;
}

function makeWav(seconds = 2, sampleRate = 8000) {
  const numSamples = sampleRate * seconds;
  const dataSize = numSamples * 2;
  const buf = Buffer.alloc(44 + dataSize);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(dataSize, 40);
  return buf;
}

async function run() {
  const allIds = [];
  const allEmails = [];
  const track = (u) => {
    allIds.push(u.userId);
    allEmails.push(u.email);
  };

  section("TASK 1 — Subscriptions / Payments");
  {
    const plans = await req("GET", "/payment/plans");
    check("GET /payment/plans -> 200", plans.status === 200);
    const p = plans.json || {};
    check("FREE = price 0, limit 1", p.FREE?.price === 0 && p.FREE?.tweetLimit === 1);
    check("BRONZE = Rs.100, limit 3", p.BRONZE?.price === 100 && p.BRONZE?.tweetLimit === 3);
    check("SILVER = Rs.300, limit 5", p.SILVER?.price === 300 && p.SILVER?.tweetLimit === 5);
    check("GOLD = Rs.1000", p.GOLD?.price === 1000);

    const status = await req("GET", "/payment/status");
    check(
      "GET /payment/status reports window closed (after 11:00 IST)",
      status.status === 200 && status.json?.success === false
    );

    const payUser = await makeUser("pay");
    track(payUser);
    const payToken = (await login(payUser.email, FIREFOX_UA)).json.token;
    const ord = await req("POST", "/payment/create-order", {
      body: { plan: "BRONZE" },
      token: payToken,
    });
    check(
      "POST /payment/create-order blocked outside 10-11 IST window -> 403",
      ord.status === 403 && /10:00 AM and 11:00 AM IST/i.test(ord.json?.message || ord.json?.error || "")
    );
  }

  section("TASK 1 — Per-plan tweet limits");
  {
    const free = await planUser("FREE", 1, 2);
    check("FREE (limit 1): 2nd tweet blocked", free[0] === 201 && free[1] === 403);

    const bronze = await planUser("BRONZE", 3, 4);
    check(
      "BRONZE (limit 3): 4th tweet blocked",
      bronze[0] === 201 && bronze[1] === 201 && bronze[2] === 201 && bronze[3] === 403,
      `-> statuses: ${JSON.stringify(bronze)}`
    );

    const silver = await planUser("SILVER", 5, 6);
    check(
      "SILVER (limit 5): 6th tweet blocked",
      silver[0] === 201 && silver[1] === 201 && silver[2] === 201 && silver[3] === 201 && silver[4] === 201 && silver[5] === 403,
      `-> statuses: ${JSON.stringify(silver)}`
    );

    const gold = await planUser("GOLD", Number.MAX_SAFE_INTEGER, 3);
    check(
      "GOLD (unlimited): all 3 tweets allowed",
      gold[0] === 201 && gold[1] === 201 && gold[2] === 201,
      `-> statuses: ${JSON.stringify(gold)}`
    );
  }

  section("TASK 1 — Invoice PDF + subscription email");
  {
    const u = await makeUser("inv");
    track(u);
    const pdf = await generateInvoicePdf({
      invoiceNumber: "INV-TEST-0001",
      customerName: "TF inv",
      customerEmail: u.email,
      planName: "Bronze",
      amount: 100,
      paymentId: "pay_test123",
      orderId: "order_test123",
      purchaseDate: "Aug 15, 2026",
      expiryDate: "Sep 14, 2026",
    });
    check(
      "generateInvoicePdf returns a PDF buffer",
      Buffer.isBuffer(pdf) && pdf.subarray(0, 4).toString() === "%PDF" && pdf.length > 500
    );
    try {
      const mail = await sendSubscriptionActivatedEmail({
        to: u.email,
        customerName: "TF inv",
        planLabel: "Bronze",
        amount: 100,
        startDate: "Aug 15, 2026",
        expiryDate: "Sep 14, 2026",
        invoiceNumber: "INV-TEST-0001",
        invoicePdfBuffer: pdf,
      });
      check("sendSubscriptionActivatedEmail delivered", mail?.skipped !== true && mail?.accepted?.length >= 0);
    } catch (e) {
      check("sendSubscriptionActivatedEmail delivered", false, `-> ${e.message}`);
    }
  }

  section("TASK 2 — Forgot password (two-step OTP)");
  {
    const fg = await makeUser("fg");
    track(fg);
    const r1 = await req("POST", "/auth/forgot-password", { body: { identifier: fg.email } });
    check("email identifier -> 200 success", r1.status === 200 && r1.json?.success === true);
    check(
      "password never leaked in response",
      r1.json?.newPassword === undefined && r1.json?.password === undefined
    );
    check(
      "OTP channel email + 10min expiry reported",
      r1.json?.channel === "email" && r1.json?.expiresIn === 600
    );
    check(
      "request response is an OTP (no plaintext code)",
      r1.json?.code === undefined && /verification code/i.test(r1.json?.message || "")
    );

    const r2 = await req("POST", "/auth/forgot-password", { body: { identifier: fg.email } });
    check(
      "second request same day -> 429 once-per-day",
      r2.status === 429 && /one time per day/i.test(r2.json?.message || "")
    );

    const fp = await makeUser("fgp");
    track(fp);
    await User.updateOne({ email: fp.email }, { $set: { phone: "919876543210" } });
    const rp = await req("POST", "/auth/forgot-password", { body: { identifier: "919876543210" } });
    check(
      "phone identifier -> 200 with SMS->email fallback",
      rp.status === 200 &&
        rp.json?.success === true &&
        rp.json?.smsFallback === true &&
        rp.json?.channel === "email"
    );
    check("phone reset never leaks password", rp.json?.newPassword === undefined);

    // OTP verification: wrong code, expired code, then the correct code.
    const fgv = await makeUser("fgv");
    track(fgv);
    const goodCode = "123456";
    const createdAt = new Date();
    await Otp.create({
      identifier: fgv.email.toLowerCase(),
      purpose: "password_reset",
      code: goodCode,
      expiresAt: new Date(createdAt.getTime() + 10 * 60 * 1000),
      createdAt,
    });

    const rBad = await req("POST", "/auth/forgot-password/verify", {
      body: { identifier: fgv.email, code: "000000" },
    });
    check("wrong code -> 400", rBad.status === 400 && /incorrect/i.test(rBad.json?.error || ""));

    const fgx = await makeUser("fgx");
    track(fgx);
    await Otp.create({
      identifier: fgx.email.toLowerCase(),
      purpose: "password_reset",
      code: "654321",
      expiresAt: new Date(Date.now() - 60 * 1000),
      createdAt,
    });
    const rExp = await req("POST", "/auth/forgot-password/verify", {
      body: { identifier: fgx.email, code: "654321" },
    });
    check("expired OTP -> 400 'OTP expired'", rExp.status === 400 && /expired/i.test(rExp.json?.error || ""));

    const rOk = await req("POST", "/auth/forgot-password/verify", {
      body: { identifier: fgv.email, code: goodCode },
    });
    check(
      "correct code -> 200 password reset + delivered",
      rOk.status === 200 && rOk.json?.success === true
    );
    const afterUser = await User.findOne({ email: fgv.email });
    check(
      "stored password is scrypt-hashed (not plaintext)",
      afterUser && typeof afterUser.password === "string" && afterUser.password.startsWith("scrypt$")
    );
    check("reset response never leaks password", rOk.json?.newPassword === undefined);

    let lettersOnly = true;
    let lenOk = true;
    for (let i = 0; i < 200; i++) {
      const pw = generateLetterPassword(10);
      if (!/^[A-Za-z]+$/.test(pw)) lettersOnly = false;
      if (pw.length !== 10) lenOk = false;
    }
    check("generateLetterPassword: letters-only, length 10", lettersOnly && lenOk);
  }

  section("TASK 3 — Login security (Chrome OTP / Edge / Mobile window)");
  {
    const sec = await makeUser("sec");
    track(sec);

    const chrome = await req("POST", "/auth/login", { body: { email: sec.email }, ua: CHROME_UA });
    check(
      "Chrome login -> requiresOtp true (email)",
      chrome.status === 200 && chrome.json?.requiresOtp === true && chrome.json?.channel === "email"
    );
    check(
      "Chrome login response has no devCode/mailError",
      chrome.json?.devCode === undefined && chrome.json?.mailError === undefined
    );
    check("Chrome login returns short-lived loginToken", typeof chrome.json?.loginToken === "string" && chrome.json?.loginToken.length > 10);

    const edge = await req("POST", "/auth/login", { body: { email: sec.email }, ua: EDGE_UA });
    check(
      "Edge login -> direct JWT (no OTP)",
      edge.status === 200 && edge.json?.requiresOtp === false && typeof edge.json?.token === "string"
    );

    const ff = await req("POST", "/auth/login", { body: { email: sec.email }, ua: FIREFOX_UA });
    check(
      "Firefox login -> direct JWT (no OTP)",
      ff.status === 200 && ff.json?.requiresOtp === false && typeof ff.json?.token === "string"
    );

    const mob = await req("POST", "/auth/login", { body: { email: sec.email }, ua: IPHONE_UA });
    check(
      "Mobile login outside 10-13 IST -> 403",
      mob.status === 403 && /Mobile login is allowed only/i.test(mob.json?.message || mob.json?.error || "")
    );

    await LoginOTP.create({
      userId: sec.userId,
      otpHash: loginHash("424242"),
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      consumed: false,
      attempts: 0,
    });

    const wrong = await req("POST", "/auth/verify-login-otp", {
      body: { email: sec.email, code: "000000", loginToken: chrome.json.loginToken },
      ua: CHROME_UA,
    });
    check("verify-login-otp wrong code -> 400", wrong.status === 400);

    const verify = await req("POST", "/auth/verify-login-otp", {
      body: { email: sec.email, code: "424242", loginToken: chrome.json.loginToken },
      ua: CHROME_UA,
    });
    check(
      "verify-login-otp correct code -> 200 + session JWT",
      verify.status === 200 && verify.json?.success === true && typeof verify.json?.token === "string"
    );

    const hist = await req("GET", "/login-history?page=1&limit=10", { token: edge.json.token });
    const items = hist.json?.items || [];
    check("login-history endpoint -> 200 paginated", hist.status === 200 && hist.json?.total >= 2);
    check("login-history records Edge", items.some((i) => /edge/i.test(i.browser || "")));
    check(
      "login-history records Chrome",
      items.some((i) => /chrome/i.test(i.browser || "") && !/edge/i.test(i.browser || ""))
    );
    check(
      "login-history captures deviceType + ip",
      items.some((i) => (i.deviceType || i.device) && i.ipAddress)
    );
  }

  section("TASK 4 — Audio tweets");
  {
    const au = await makeUser("audio");
    track(au);
    const auToken = (await login(au.email, FIREFOX_UA)).json.token;

    const snd = await req("POST", "/audio/send-otp", { token: auToken });
    check(
      "POST /audio/send-otp -> 200 (code emailed)",
      snd.status === 200 && snd.json?.success === true && !!snd.json?.expiresAt
    );

    await AudioTweetOTP.create({
      userId: au.userId,
      otpHash: audioHash("777777"),
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      attempts: 0,
    });

    const wv = await req("POST", "/audio/verify-otp", { body: { code: "000000" }, token: auToken });
    check("audio verify wrong code -> 400", wv.status === 400);

    const av = await req("POST", "/audio/verify-otp", { body: { code: "777777" }, token: auToken });
    check(
      "audio verify correct code -> 200 + audioToken",
      av.status === 200 && typeof av.json?.audioToken === "string"
    );
    const audioToken = av.json?.audioToken || "";

    const fd = new FormData();
    fd.append("caption", "audio upload without token");
    const noauth = await req("POST", "/audio/upload", { token: auToken, form: fd });
    check(
      "audio upload without audioToken -> 401",
      noauth.status === 401 && /not authorized/i.test(noauth.json?.message || "")
    );
    await new Promise((r) => setTimeout(r, 500));

    const wav = makeWav(2);
    const fd2 = new FormData();
    fd2.append("audio", new Blob([wav], { type: "audio/wav" }), "test.wav");
    fd2.append("caption", "real audio tweet test");
    fd2.append("audioToken", audioToken);
    fd2.append("durationSeconds", "2");
    const up = await req("POST", "/audio/upload", { token: auToken, form: fd2 });
    check(
      "audio upload (valid WAV + token) -> 201",
      up.status === 201 && up.json?.success === true && !!up.json?.tweet?.audioUrl,
      `-> status ${up.status}, body: ${JSON.stringify(up.json)?.slice(0, 300)}`
    );

    const big = Buffer.alloc(100 * 1024 * 1024 + 1024);
    const fdb = new FormData();
    fdb.append("audio", new Blob([big], { type: "audio/wav" }), "big.wav");
    fdb.append("audioToken", audioToken);
    fdb.append("durationSeconds", "1");
    const bigUp = await req("POST", "/audio/upload", { token: auToken, form: fdb });
    check(
      "audio upload >100MB -> 400 (size limit)",
      bigUp.status === 400 && /100 MB/i.test(bigUp.json?.message || "")
    );
  }

  section("TASK 5 — Notifications");
  {
    const nf = await makeUser("note");
    track(nf);
    const nfToken = (await login(nf.email, FIREFOX_UA)).json.token;

    const s1 = await req("GET", "/user/notification-settings", { token: nfToken });
    check(
      "default settings: keywordNotifications true, [cricket, science]",
      s1.status === 200 &&
        s1.json?.keywordNotifications === true &&
        JSON.stringify(s1.json?.keywords) === JSON.stringify(["cricket", "science"])
    );

    const off = await req("PUT", "/user/notification-settings", {
      body: { keywordNotifications: false },
      token: nfToken,
    });
    check("disable -> false", off.json?.keywordNotifications === false);

    const on = await req("PUT", "/user/notification-settings", {
      body: { keywordNotifications: true },
      token: nfToken,
    });
    check("re-enable -> true", on.json?.keywordNotifications === true);

    const kw = await req("POST", "/post", { body: { content: "Big cricket match today" }, token: nfToken });
    check("keyword tweet (cricket) posts -> 201", kw.status === 201);
  }

  section("TASK 5 — keyword detection (unit)");
  {
    check("'Cricket World Cup' matches", containsKeyword("Cricket World Cup") === true);
    check("'a SCIENCE paper' matches", containsKeyword("a SCIENCE paper") === true);
    check("'hello world' does not match", containsKeyword("hello world") === false);
    check("empty text does not match", containsKeyword("") === false);
  }

  section("TASK 6 — Multi-language OTP");
  {
    const fr = await makeUser("langfr");
    track(fr);
    const frToken = (await login(fr.email, FIREFOX_UA)).json.token;

    const cur = await req("GET", "/language/current", { token: frToken });
    check(
      "language/current: en + 7 supported codes",
      cur.status === 200 && cur.json?.preferredLanguage === "en" && cur.json?.supportedLanguages?.length === 7
    );

    const frReq = await req("POST", "/language/request-otp", {
      body: { targetLanguage: "fr" },
      token: frToken,
    });
    check(
      "fr -> email channel, code emailed",
      frReq.status === 200 && frReq.json?.channel === "email" && frReq.json?.deliveredTo === "email"
    );

    const bad = await req("POST", "/language/request-otp", {
      body: { targetLanguage: "xx" },
      token: frToken,
    });
    check("unsupported language -> 400", bad.status === 400);

    const wl = await req("POST", "/language/verify-otp", {
      body: { targetLanguage: "fr", code: "555555" },
      token: frToken,
    });
    check("language verify wrong code -> 400", wl.status === 400);

    await LanguageChangeOTP.create({
      userId: fr.userId,
      otpHash: langHash("888888"),
      deliveryMethod: "email",
      targetLanguage: "fr",
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      attempts: 0,
    });

    const vl = await req("POST", "/language/verify-otp", {
      body: { targetLanguage: "fr", code: "888888" },
      token: frToken,
    });
    check(
      "language verify correct code -> 200 + languageToken",
      vl.status === 200 && typeof vl.json?.languageToken === "string"
    );
    const langTok = vl.json?.languageToken || "";

    const chgNoTok = await req("PUT", "/language/change", {
      body: { targetLanguage: "fr" },
      token: frToken,
    });
    check("language change without token -> 401", chgNoTok.status === 401);

    const chg = await req("PUT", "/language/change", {
      body: { targetLanguage: "fr", languageToken: langTok },
      token: frToken,
    });
    check(
      "language change with token -> 200 + fr",
      chg.status === 200 && chg.json?.preferredLanguage === "fr"
    );

    const cur2 = await req("GET", "/language/current", { token: frToken });
    check("language/current now reports fr", cur2.json?.preferredLanguage === "fr");

    const hi = await makeUser("langhi");
    track(hi);
    const hiToken = (await login(hi.email, FIREFOX_UA)).json.token;
    const hiReq = await req("POST", "/language/request-otp", {
      body: { targetLanguage: "hi" },
      token: hiToken,
    });
    check(
      "hi -> sms channel with email fallback (no SMS provider)",
      hiReq.status === 200 && hiReq.json?.channel === "sms" && hiReq.json?.deliveredTo === "email"
    );
  }

  try {
    if (allIds.length) {
      await User.deleteMany({ _id: { $in: allIds } });
      await LoginHistory.deleteMany({ userId: { $in: allIds } });
      await LoginOTP.deleteMany({ userId: { $in: allIds } });
      await AudioTweetOTP.deleteMany({ userId: { $in: allIds } });
      await LanguageChangeOTP.deleteMany({ userId: { $in: allIds } });
      await Tweet.deleteMany({ author: { $in: allIds } });
      await AudioTweet.deleteMany({ userId: { $in: allIds } });
    }
  } catch (e) {
    lines.push(`\n  (cleanup warning: ${e.message})`);
  }
}

const istNow = new Date(
  new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
);
console.log(`IST now: ${istNow.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", hour12: false })}`);
console.log(`Target: ${BASE}`);

try {
  const url = process.env.MONGODB_URL || process.env.MONGODB_URI;
  await mongoose.connect(url);
  console.log(`Suite DB: host=${mongoose.connection.host} name=${mongoose.connection.name}`);
  await run();
} catch (e) {
  failed++;
  lines.push(`  FATAL  ${e.message}`);
} finally {
  try {
    await mongoose.disconnect();
  } catch {}
}

console.log(lines.join("\n"));
console.log("\n========================================");
console.log(`RESULT: ${passed} passed, ${failed} failed`);
console.log("========================================");
process.exit(failed > 0 ? 1 : 0);
