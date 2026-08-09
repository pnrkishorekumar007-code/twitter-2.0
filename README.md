# Twiller — Internship Build

This adds all 6 mentor tasks on top of the original training project, plus a UI/UX pass:

1. **Subscription plans + Razorpay** (Free/Bronze/Silver/Gold, tweet limits, 10–11 AM IST payment window, invoice email)
2. **Forgot password** (email/phone, once/day, letters-only generated password, real Firebase password update)
3. **Login history + device-aware auth** (browser/OS/device/IP logged, Chrome → email OTP, Microsoft Edge → no extra step, mobile → 10 AM–1 PM IST only)
4. **Audio tweets** (record or upload, email OTP before upload, 5 min / 100 MB limits, 2–7 PM IST window)
5. **Browser notifications** for tweets containing "cricket" or "science", toggle in profile settings
6. **6-language support** (English, Spanish, Hindi, Portuguese, Chinese, French) — French switch needs an email OTP, others need a "mobile" OTP (see note below)

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
```

5. Deploy. Render gives you a URL like `https://twiller-backend.onrender.com`.
   Note: on Render's free tier the service **sleeps after 15 min of inactivity** and takes ~30–60s to wake up on the next request — this is normal, not a bug.

## 7. Deploy the frontend (Vercel)

1. Vercel → New Project → import the same repo, set **root directory to `twiller`**.
2. Framework preset: Next.js (auto-detected).
3. Add environment variable:

```
NEXT_PUBLIC_BACKEND_URL=https://twiller-backend.onrender.com
```

   (must start with `NEXT_PUBLIC_` or the browser can't see it — this was actually a bug in the original project that's now fixed.)

4. Deploy. You'll get a URL like `https://twiller.vercel.app`.
5. Go back to Render and make sure CORS isn't an issue — the backend uses `cors()` with no restrictions, so it already allows your Vercel domain.

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

## Honest notes on scope / limitations

- **SMS OTP**: true SMS requires a paid provider (Twilio, MSG91, etc — none have a meaningful free tier for OTP). Every OTP in this build is delivered by email, including the ones the task description calls "mobile OTP" (language switching for non-French languages, mobile login). The code is written so that swapping in a real SMS provider only means editing `utils/otp.js`'s `issueOtp` to call an SMS API instead of/alongside `sendMail`.
- **Password login vs Firebase**: this project's real authentication is Firebase (email/password + Google). The Forgot Password flow generates a new password and updates it in **both** MongoDB and Firebase Auth (via `firebase-admin`), so it genuinely works for logging back in — but only if you've set `FIREBASE_SERVICE_ACCOUNT`.
- **Multi-language coverage**: the OTP-gated switching mechanism and the language state are fully implemented and applied app-wide via `LanguageContext`. Translation *content* currently covers the core navigation/UI strings (nav items, composer placeholder, auth labels, settings). Extending full coverage to every string in every component is mechanical — read strings from `useLanguage().t('key')` instead of hardcoding — but wasn't fully completed for every screen given time constraints.
- **Audio storage**: Render's free tier has no persistent disk, so audio files are uploaded straight to Cloudinary rather than saved to the server's filesystem.
- **Tweet limit enforcement**: enforced server-side in `POST /post`, based on `user.subscription.tweetLimit`, which is set on successful payment and resets every 30 days.
- Every route that has a time-of-day restriction converts the server clock to **Asia/Kolkata** regardless of what timezone the host server itself runs in (Render defaults to UTC), so the windows are correct for IST regardless of hosting region.
