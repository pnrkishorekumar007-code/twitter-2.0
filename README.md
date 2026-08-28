# Twiller 2.0

A full-stack Twitter/X clone built as an internship project — featuring subscriptions, OTP-gated security, audio tweets, real-time notifications, and 7-language support.

---

## Features

| Feature | Description |
|---|---|
| **Subscription Plans** | Free / Bronze / Silver / Gold via Razorpay with tweet limits, 10–11 AM IST payment window, and invoice emails |
| **Forgot Password** | Email/phone recovery, once/day, auto-generated password, real Firebase Auth update |
| **Device-Aware Login** | Browser/OS/IP logging, Chrome → email OTP, Edge → instant, mobile → 10 AM–1 PM IST only |
| **Audio Tweets** | Record or upload, email OTP gating, 5 min / 100 MB limits, 2–7 PM IST window |
| **Keyword Notifications** | Browser push alerts for tweets containing "cricket" or "science" via Socket.IO |
| **7-Language Support** | English, Spanish, Hindi, Portuguese, Chinese, French, Tamil — OTP-gated switching |
| **Advanced Security** | Session JWTs, HMAC-SHA256 hashed OTPs, rate limiting, paginated login history |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS v4, Radix UI, Framer Motion |
| Backend | Express 5, Node.js (ES modules), Socket.IO |
| Database | MongoDB Atlas (Mongoose) |
| Auth | Firebase Auth + session JWTs |
| Payments | Razorpay (test mode) |
| Storage | Cloudinary (audio), imgbb (images) |
| Email | Nodemailer (Gmail SMTP) + optional Brevo API |
| Hosting | Vercel (frontend) + Render (backend) |

---

## Project Structure

```
twitter-2.0/
├── backend/                  # Express API server
│   ├── index.js              # Entry point (Express + Socket.IO)
│   ├── socket.js             # Real-time notification server
│   ├── routes/               # API routes (auth, user, audio, payment, etc.)
│   ├── models/               # Mongoose schemas (user, tweet, OTP, etc.)
│   ├── services/             # Business logic (OTP, notifications, SMS)
│   ├── middleware/            # Auth, CSRF, device detection, rate limiting
│   └── utils/                # JWT, OTP generation, mailer, helpers
│
└── twiller/                  # Next.js frontend (App Router)
    └── src/
        ├── app/              # Pages (home, profile, settings, messages, etc.)
        ├── components/       # UI components (34+ files)
        ├── context/          # React contexts (Auth, Theme, Language, etc.)
        ├── hooks/            # Custom hooks (notifications, scroll lock)
        └── lib/              # Utilities, socket client, translations
```

---

## Prerequisites

Sign up for these **free-tier** services:

| Service | Purpose | Free Tier |
|---|---|---|
| [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register) | Database | M0 cluster |
| [Firebase](https://console.firebase.google.com) | Authentication | Spark plan |
| [Razorpay](https://dashboard.razorpay.com/signup) | Payments (test mode) | Free, no KYC |
| [Cloudinary](https://cloudinary.com/users/register/free) | Audio tweet storage | 25 GB |
| [Gmail](https://myaccount.google.com/apppasswords) | OTP + invoice emails | App Password |
| [Vercel](https://vercel.com) | Frontend hosting | Hobby plan |
| [Render](https://render.com) | Backend hosting | Free web service |

---

## Quick Start

### Backend

```bash
cd backend
cp .env.example .env    # fill in your values
npm install
npm run dev             # http://localhost:5000
```

### Frontend

```bash
cd twiller
echo "NEXT_PUBLIC_BACKEND_URL=http://localhost:5000" > .env.local
npm install
npm run dev             # http://localhost:3000
```

---

## Service Setup

### MongoDB Atlas

1. Create a free M0 cluster.
2. **Database Access** → add a user with username/password.
3. **Network Access** → Allow access from anywhere (`0.0.0.0/0`).
4. Get the connection string: `mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/twiller?retryWrites=true&w=majority`

### Gmail App Password

1. Enable 2-Step Verification on your Gmail account.
2. Google Account → Security → App Passwords → generate one for "Mail".
3. Use the 16-character password as `EMAIL_PASS`.

### Cloudinary

Sign up → Dashboard → copy **Cloud name**, **API Key**, **API Secret**.

### Razorpay (Test Mode)

1. Sign up → stay in **Test Mode**.
2. Settings → API Keys → Generate Test Key → copy Key ID and Key Secret.
3. Test with Razorpay's [test card numbers](https://razorpay.com/docs/payments/payments/test-card-upi-details/).

### Firebase Service Account (for real password reset)

1. Firebase Console → Project Settings → Service Accounts → Generate new private key.
2. Paste the JSON contents (one line) as `FIREBASE_SERVICE_ACCOUNT` in your env.
3. Without this, forgot-password still works but won't actually update Firebase login.

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|---|---|---|
| `MONGODB_URL` | Yes | MongoDB Atlas connection string |
| `PORT` | No | Server port (default: `5000`) |
| `FRONTEND_ORIGIN` | Yes | Comma-separated allowed origins |
| `EMAIL_USER` | Yes | Gmail address for OTP/invoice emails |
| `EMAIL_PASS` | Yes | Gmail App Password |
| `BREVO_API_KEY` | No | Brevo API key (optional, recommended) |
| `BREVO_FROM_EMAIL` | No | Brevo verified sender email |
| `BREVO_FROM_NAME` | No | Brevo sender name |
| `RAZORPAY_KEY_ID` | Yes | Razorpay test-mode key ID |
| `RAZORPAY_KEY_SECRET` | Yes | Razorpay test-mode key secret |
| `CLOUDINARY_CLOUD_NAME` | Yes | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Yes | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Yes | Cloudinary API secret |
| `FIREBASE_PROJECT_ID` | Yes | Firebase project ID |
| `FIREBASE_CLIENT_EMAIL` | Yes | Firebase service account email |
| `FIREBASE_PRIVATE_KEY` | Yes | Firebase service account private key |
| `JWT_SECRET` | Yes | Long random string for session JWTs |
| `LOGIN_OTP_SECRET` | Yes | Long random string for login OTPs |
| `LOGIN_OTP_TTL_MINUTES` | No | Login OTP TTL (default: `5`) |
| `AUDIO_OTP_SECRET` | Yes | Long random string for audio OTPs |
| `LANGUAGE_OTP_SECRET` | Yes | Long random string for language OTPs |
| `SMS_PROVIDER_API_KEY` | No | SMS provider key (falls back to email) |
| `SMS_PROVIDER_SECRET` | No | SMS provider secret |
| `SMS_PROVIDER_URL` | No | SMS provider endpoint |

Generate secrets with:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### Frontend (`twiller/.env.local`)

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_BACKEND_URL` | Yes | Backend URL (e.g. `http://localhost:5000`) |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Yes | Firebase web app config |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Yes | Firebase auth domain |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Yes | Firebase project ID |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Yes | Firebase storage bucket |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Yes | Firebase messaging sender ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Yes | Firebase app ID |
| `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` | Yes | Firebase measurement ID |
| `NEXT_PUBLIC_IMGBB_KEY` | No | imgbb API key (optional) |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Yes | Razorpay test-mode key ID |

---

## Deployment

### Backend (Render)

1. Push repo to GitHub.
2. Render → New → Web Service → connect repo, **root directory: `backend`**.
3. Build: `npm install` | Start: `npm start`
4. Add all backend env vars in Render dashboard.
5. Deploy. URL: `https://twiller-backend.onrender.com`

> **Note:** Render free tier sleeps after 15 min of inactivity. First request takes ~30–60s to wake up.

### Frontend (Vercel)

1. Vercel → New Project → import repo.
2. **Root Directory**: `twiller` (critical — must be set correctly).
3. Framework: **Next.js** | Build: `npm run build`
4. Add `NEXT_PUBLIC_BACKEND_URL` pointing to your Render backend URL.
5. Deploy. URL: `https://twiller.vercel.app`

> **404 fix:** If Vercel returns 404, the Root Directory is pointing at the repo root instead of `twiller/`.

---

## API Endpoints

### Authentication

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/auth/login` | Device gate + OTP decision |
| POST | `/auth/send-login-otp` | (Re)send login OTP |
| POST | `/auth/verify-login-otp` | Verify login OTP, issue session JWT |
| GET | `/login-history` | Paginated login history |

### Language

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/language/request-otp` | Request language change OTP |
| POST | `/language/verify-otp` | Verify OTP, get change token |
| PUT | `/language/change` | Apply language change |
| GET | `/language/current` | Get current language |

### Notifications

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/user/notification-settings` | Get notification preferences |
| PUT | `/user/notification-settings` | Update notification preferences |

---

## Security

- **OTP hashing**: All OTPs stored as HMAC-SHA256 hashes — never plaintext.
- **Single-use codes**: OTPs have `consumed` flag, 5-min TTL, max 3 attempts.
- **Session JWTs**: 7-day expiry, signed with `JWT_SECRET`, sent via `Authorization: Bearer`.
- **Login tokens**: Short-lived (10 min), only authorize OTP endpoints.
- **Rate limiting**: In-memory sliding window per account (resets on server restart).
- **CORS**: Configurable via `FRONTEND_ORIGIN` env var.
- **Dev mode**: When `EMAIL_USER`/`EMAIL_PASS` are unset, OTPs return `devCode` for testing.

---

## Limitations

- **SMS OTP**: True SMS requires a paid provider (Twilio, MSG91). Dev/test falls back to email delivery.
- **Multi-language coverage**: OTP switching mechanism is complete; UI string coverage varies by component.
- **Audio storage**: No persistent disk on Render free tier — audio goes directly to Cloudinary.
- **Rate limiter**: In-memory only — resets on restart, single-instance. Use Redis for production multi-instance.
- **IST time windows**: All time restrictions use Asia/Kolkata regardless of server timezone.

---

## License

ISC
