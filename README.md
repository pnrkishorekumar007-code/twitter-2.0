# Twiller — Internship Build

This adds all 6 mentor tasks on top of the original training project, plus a UI/UX pass:

 1. **Subscription plans + Razorpay** (Free/Bronze/Silver/Gold, tweet limits, 10–11 AM IST payment window, invoice email)
 2. **Forgot password** (email/phone, once/day, letters-only generated password, real Firebase password update)
 3. **Login history + device-aware auth** (browser/OS/device/IP logged, Chrome → email OTP, Microsoft Edge → no extra step, mobile → 10 AM–1 PM IST only)
 4. **Audio tweets** (record or upload, email OTP before upload, 5 min / 100 MB limits, 2–7 PM IST window)
 5. **Browser notifications** for tweets containing "cricket" or "science", toggle in profile settings
 6. **6-language support** (English, Spanish, Hindi, Portuguese, Chinese, French) — French switch needs an email OTP, others need a "mobile" OTP (see note below)
 7. **Advanced login security** (session JWTs, hashed 6-digit login OTPs, resend cooldown + rate limiting, paginated login history tab in the profile)

Everything is real, working code — not stubs — but a few features need **free third-party accounts** to actually run. Nothing costs money in test/free mode.

---

## What you need to sign up for (all free tier)

| Service | Used for | Free tier |
|---|---|---|
| [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register) | Database | M0 cluster, free forever |
| [Render](https://render.com) | Hosting the backend | Free web service |
| [Vercel](https://vercel.com) | Hosting the frontend | Free hobby plan |
| [Firebase](https://console.firebase.google.com) | User auth (already in the project) + admin password resets | Spark (free) plan |
| [Cloudinary](https://cloudinary.com/users/register/free) | Storing uploaded audio tweets | Free tier (25 GB) |
| [Razorpay](https://dashboard.razorpay.com/signup) | Payments | Test mode is free, no KYC needed |
| Gmail | Sending OTP/invoice emails | Free, via an "App Password" |

---

## 1. MongoDB Atlas

1. Create a free M0 cluster.
2. Database Access → add a user with a username/password.
3. Network Access → Add IP Address → **Allow access from anywhere** (0.0.0.0/0) — needed because Render's IP isn't fixed on the free tier.
4. Get your connection string (Connect → Drivers → Node.js), it looks like:
   `mongodb+srv://<user>:<password>@<cluster>.mongodb.net/twiller?retryWrites=true&w=majority`

## 2. Gmail App Password (for OTP + invoice emails)

1. Turn on 2-Step Verification on the Gmail account you'll send from.
2. Go to Google Account → Security → App passwords → generate one for "Mail".
3. Copy the 16-character password (no spaces) — this is `EMAIL_PASS`.

## 3. Cloudinary (audio storage)

1. Sign up free, go to the Dashboard.
2. Copy `Cloud name`, `API Key`, `API Secret`.

## 4. Razorpay (test mode)

1. Sign up, stay in **Test Mode** (toggle top-right of dashboard).
2. Settings → API Keys → Generate Test Key → copy Key ID and Key Secret.
3. Test payments use Razorpay's [test card numbers](https://razorpay.com/docs/payments/payments/test-card-upi-details/) — no real money moves.

## 5. Firebase

The project already uses Firebase for login/signup (`src/context/firebase.tsx`). Fill in your web app config there if it's not already set.

For the **real** password-reset-to-work feature, the backend also needs a **service account**:

1. Firebase Console → Project settings → Service accounts → Generate new private key.
2. Open the downloaded JSON, and paste its entire contents as **one line** into `FIREBASE_SERVICE_ACCOUNT` in Render's env vars.
3. If you skip this, forgot-password still works and shows a new password, but it won't actually update the login — the note in the API response will tell you that.

---

## 6. Deploy the backend (Render)

1. Push this repo to GitHub.
2. Render → New → Web Service → connect your repo, set **root directory to `backend`**.
3. Build command: `npm install` — Start command: `npm start`
4. Add environment variables (Render dashboard → Environment):

```
MONGODB_URL=<your Atlas connection string>
EMAIL_USER=<your gmail address>
EMAIL_PASS=<your 16-char app password>
RAZORPAY_KEY_ID=<test key id>
RAZORPAY_KEY_SECRET=<test key secret>
CLOUDINARY_CLOUD_NAME=<cloud name>
CLOUDINARY_API_KEY=<api key>
CLOUDINARY_API_SECRET=<api secret>
FIREBASE_SERVICE_ACCOUNT=<service account JSON, all on one line>
JWT_SECRET=<random long string, e.g. from `openssl rand -hex 32`>
LOGIN_OTP_SECRET=<random string, can be the same format as JWT_SECRET>
LOGIN_OTP_TTL_MINUTES=5
```

5. Deploy. Render gives you a URL like `https://twiller-backend.onrender.com`.
   Note: on Render's free tier the service **sleeps after 15 min of inactivity** and takes ~30–60s to wake up on the next request — this is normal, not a bug.

## 7. Deploy the frontend (Vercel)

This is a **monorepo** (`backend/` + `twiller/`). The frontend app lives in the `twiller/` subfolder, so Vercel **must** build from there.

> **If your Vercel URL returns `404 Not Found` on `/`**, the project's Root Directory is pointing at the repo root instead of `twiller/` — the Next.js app was never built. Fix it, then redeploy (see step 4).

Option A — existing project:
1. Vercel → Project → **Settings → General → Root Directory**: set it to `twiller`.
2. Framework preset: **Next.js**. Build: `npm run build`.
3. **Deploy** → select main branch → Redeploy.

Option B — fresh import (auto-detects the app via the root `workspaces` config):
1. Vercel → New Project → import the same repo. Vercel detects the `twiller` workspace app automatically.
2. Add environment variable:

```
NEXT_PUBLIC_BACKEND_URL=https://twiller-backend.onrender.com
```

   (must start with `NEXT_PUBLIC_` or the browser can't see it — this was actually a bug in the original project that's now fixed.)

3. Deploy. You'll get a URL like `https://twiller.vercel.app`.
4. Go back to Render and make sure CORS isn't an issue — the backend uses `cors()` with no restrictions, so it already allows your Vercel domain.

## 8. Connecting them locally (for development)

Backend:
```bash
cd backend
cp .env.example .env   # fill in real values
npm install
npm run dev             # http://localhost:5000
```

Frontend:
```bash
cd twiller
echo "NEXT_PUBLIC_BACKEND_URL=http://localhost:5000" > .env.local
npm install
npm run dev              # http://localhost:3000
```

---

## Advanced Login Security (task 7)

### How it works

The client authenticates the credentials first (Firebase), then calls the device-aware login endpoint. The backend classifies the browser/device and decides the flow:

| Browser / device | Behavior |
|---|---|
| **Google Chrome** | A 6-digit code is emailed; the user is sent to `/verify-login-otp`. A session JWT is only issued after the code is verified. |
| **Microsoft Edge / IE** | Logged in immediately (exception — no extra step). |
| **Any other browser** | Logged in immediately. |
| **Mobile / tablet** | Login (both direct and Google) is only allowed between **10:00 AM and 1:00 PM IST**; outside that window the request is rejected with `403` and the client rolls the session back. |

Every successful login is recorded (browser, version, OS, device type, IP, method, time) in the `LoginHistory` collection and shown on the profile's **Login history** tab, newest first, paginated.

### API endpoints

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| POST | `/auth/login` | optional Firebase ID token | Device gate + OTP decision; Chrome → sends OTP + returns a short-lived `loginToken`; otherwise records the login and returns a 7-day session JWT |
| POST | `/auth/send-login-otp` | `loginToken` in body | (Re)sends the login OTP. 60-second resend cooldown + max 5 requests per 10 min per account |
| POST | `/auth/verify-login-otp` | `loginToken` in body | Validates the 6-digit code (hashed, max 3 attempts, single-use), records the login, issues the session JWT |
| GET | `/login-history` | session JWT **or** Firebase ID token | Paginated history (`?page=1&limit=10`), newest first |

### Security details

- Login OTPs are **never stored in plaintext** — only an HMAC-SHA256 hash is saved, and codes are single-use (`consumed` flag) with a 5-minute TTL.
- Short-lived **login tokens** (type `login`, 10 min) only authorize the OTP endpoints; they are rejected by normal authenticated routes (`requireAnyAuth`).
- **Session JWTs** (type `auth`, 7 days) are signed with `JWT_SECRET` and sent in the `Authorization: Bearer` header; the axios interceptor prefers them over the Firebase ID token.
- Per-account **rate limiting** (`utils/rateLimiter.js`, in-memory sliding window) throttles OTP requests.

### Local dev

Set the secrets in `backend/.env` (see `.env.example`):

```
JWT_SECRET=<openssl rand -hex 32>
LOGIN_OTP_SECRET=<openssl rand -hex 32>
LOGIN_OTP_TTL_MINUTES=5
```

When `EMAIL_USER`/`EMAIL_PASS` are not configured, the API returns a `devCode` field so you can complete the OTP flow without sending email.

> Note: the rate limiter is in-memory, so it resets on restart and only throttles within a single server instance. For production with multiple instances, move it to Redis.

---

## Keyword-based browser notifications

### How it works

When a new tweet (text or audio caption) contains **"cricket"** or **"science"** (case-insensitive), the backend detects it and pushes a `keyword-tweet` event over **Socket.IO** to every logged-in user who has keyword notifications enabled. The frontend shows a browser popup:

```
Title: New Keyword Tweet
Body:  <full tweet content>
Icon:  the tweet author's avatar (project logo fallback)
```

A **polling fallback** (`hooks/useTweetNotifications.ts`) also watches the feed for new keyword tweets, but stands down automatically while the real-time socket is connected — so no duplicate popups.

### User flow

1. Profile → Settings → **Notification Settings** card.
2. Toggle **Enable Keyword Notifications** (default: **ON**) and press **Save**.
3. The card shows the browser permission status:
   - **Allowed** — popups will appear.
   - **Blocked** — shows "Browser notifications are disabled. Please enable them in browser settings."
   - **Not requested** — shows an "Enable browser notifications" button that triggers the browser permission dialog.
4. When a keyword tweet is posted, everyone online with notifications enabled + permission granted gets a popup. When the toggle is **OFF**, no notifications are shown.

### Folder structure (feature files)

```
backend/
  socket.js                          # Socket.IO server + auth middleware + "keyword-tweets" room
  services/notificationService.js    # detects keyword tweets, sanitizes, broadcasts
  utils/keywordDetector.js           # containsKeyword() + DEFAULT_KEYWORDS
  routes/user.js                     # GET/PUT /user/notification-settings
  models/user.js                     # + keywordNotifications (Boolean, default true)
  index.js                           # http server + initSocket(); hooks POST /post
  routes/audio.js                    # hooks audio-tweet uploads

twiller/src/
  context/NotificationsContext.tsx   # provider: settings, permission, socket, Notification API
  hooks/useNotifications.ts          # public hook entry point
  hooks/useTweetNotifications.ts     # polling fallback (socket-aware)
  lib/socketClient.ts                # singleton Socket.IO client + token auth
  components/NotificationSettingsCard.tsx  # settings UI
  components/layout/Mainlayout.tsx   # mounts the provider
```

### API endpoints

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| GET | `/user/notification-settings` | session JWT **or** Firebase ID token | Returns `{ keywordNotifications, keywords }` |
| PUT | `/user/notification-settings` | session JWT **or** Firebase ID token | Body `{ keywordNotifications: true \| false }` |

### Security notes

- **Authentication required**: both settings endpoints and the socket handshake verify the session (Twiller JWT first, Firebase ID token fallback); short-lived login tokens are rejected.
- **User ownership**: settings are read/written for the authenticated user's email only — never keyed by a client-supplied id.
- **Sanitized content**: broadcast bodies strip HTML, collapse whitespace, and cap at 280 chars.
- **Spam prevention**: events are only broadcast from the two server-side tweet-creation points, and the content is checked against the fixed keyword list before any broadcast.
- **Respects preferences & permissions**: the browser never renders a popup unless `Notification.permission === "granted"`, and the socket never delivers to users who disabled the setting (they're not in the room).
- The in-memory polling fallback never fires for pre-existing tweets (first pass is a baseline).

### Local dev

No extra env vars are needed — `socket.io` (backend) and `socket.io-client` (frontend) were added to `package.json`. The client connects to `NEXT_PUBLIC_BACKEND_URL` (defaults to `http://localhost:5000`). Restart both dev servers after pulling.

---

## Multi-language support with OTP verification

### How it works

Six languages are supported (English, Spanish, Hindi, Portuguese, Chinese, French) — the task-6 feature, now upgraded to the same production-grade OTP pattern as login:

| Language | Verification channel |
|---|---|
| **French** | Email OTP (6-digit code sent to the account email) |
| **All others** | "Mobile" OTP via SMS (falls back to email in dev/test when no SMS provider keys are set) |

An OTP is only needed **when switching languages** — reading the app in the current language needs no code. Once verified, the new language is stored on the user's profile (`preferredLanguage`) and in the browser (`localStorage`), and the whole UI reacts through `LanguageContext`.

### User flow

1. Profile → Settings → **Language** card → pick a target language.
2. A verification code is sent (email for French, SMS for others). The modal shows a **60-second resend cooldown** and, in dev mode, the code itself (`devCode`) so you can test without email/SMS.
3. Enter the code → the language switches instantly and persists across visits.

### API endpoints

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| POST | `/language/request-otp` | session JWT **or** Firebase ID token | Body `{ targetLanguage }`; returns `{ channel, devCode?, resendAfterSec? }` (10 req / 10 min rate limit) |
| POST | `/language/verify-otp` | session JWT **or** Firebase ID token | Body `{ targetLanguage, otp }`; validates + issues a short-lived `language-change` token |
| PUT | `/language/change` | `language-change` token | Applies the language change to the user's profile |
| GET | `/language/current` | session JWT **or** Firebase ID token | Returns `{ language }`; used by the frontend to hydrate once per session |

**Legacy aliases still work** (used by the task-6 client): `POST /language/otp/request` and `POST /language/otp/verify` (the verify alias also applies the change inline and returns the user).

### Security details

- OTPs are **hashed** (HMAC-SHA256) — never stored in plaintext; single-use, **5-minute TTL**, max **3 attempts**, **60-second resend cooldown**.
- The OTP is **pinned to the target language** in the request, so a code requested for Spanish can't be replayed to switch to French.
- The language change itself is gated by a short-lived JWT (`type: "language-change"`, 10 min) that only works for `PUT /language/change` — it is rejected by `requireAnyAuth` routes.
- Per-user **rate limiting** on OTP requests (`language-otp:user`, in-memory sliding window).
- Channel routing is server-decided (`isEmailChannel` / `getChannelForLanguage`), so a client can't force email vs SMS.

### Folder structure (feature files)

```
backend/
  models/LanguageChangeOTP.js        # OTP collection (hash, attempts, TTL index)
  services/languageOtpService.js     # issue/verify OTP + language-change token
  services/smsService.js             # real SMS hook + email dev fallback
  routes/user.js                     # /language/* endpoints + rate limiter

twiller/src/
  context/LanguageContext.tsx        # request/verify flow, per-session hydration
  lib/translations.ts                # all 6 languages (t() falls back to en)
  components/language/LanguageSettingsCard.tsx  # settings UI (selector + OTP modal)
  components/language/LanguageSwitcher.tsx      # compact dropdown (nav usage)
  components/otp/OtpModal.tsx        # shared OTP modal (resend countdown, devCode)
  components/NotificationSettingsCard.tsx       # translated via t()
```

### Local dev

Add to `backend/.env` (see `.env.example`):

```
LANGUAGE_OTP_SECRET=<openssl rand -hex 32>
SMS_PROVIDER_API_KEY=<optional, real SMS>
SMS_PROVIDER_SECRET=<optional>
SMS_PROVIDER_URL=<optional, e.g. https://api.msg91.com/api/v5/otp>
```

With no SMS keys set, "mobile" OTPs are emailed to the account and the `devCode` is returned so the flow works end-to-end offline.

---

## Honest notes on scope / limitations

- **SMS OTP**: true SMS requires a paid provider (Twilio, MSG91, etc — none have a meaningful free tier for OTP). In dev/test the "mobile" OTPs (language switching for non-French languages) are delivered by email as a fallback via `services/smsService.js`. Wiring a real provider is a one-function change (`sendSms`); every OTP in the build is otherwise delivered by email.
- **Password login vs Firebase**: this project's real authentication is Firebase (email/password + Google). The Forgot Password flow generates a new password and updates it in **both** MongoDB and Firebase Auth (via `firebase-admin`), so it genuinely works for logging back in — but only if you've set `FIREBASE_SERVICE_ACCOUNT`.
- **Multi-language coverage**: the OTP-gated switching mechanism and the language state are fully implemented and applied app-wide via `LanguageContext`. Translation *content* currently covers the core navigation/UI strings (nav items, composer placeholder, auth labels, settings). Extending full coverage to every string in every component is mechanical — read strings from `useLanguage().t('key')` instead of hardcoding — but wasn't fully completed for every screen given time constraints.
- **Audio storage**: Render's free tier has no persistent disk, so audio files are uploaded straight to Cloudinary rather than saved to the server's filesystem.
- **Tweet limit enforcement**: enforced server-side in `POST /post`, based on `user.subscription.tweetLimit`, which is set on successful payment and resets every 30 days.
- Every route that has a time-of-day restriction converts the server clock to **Asia/Kolkata** regardless of what timezone the host server itself runs in (Render defaults to UTC), so the windows are correct for IST regardless of hosting region.
