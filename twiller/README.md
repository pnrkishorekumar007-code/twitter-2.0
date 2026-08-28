# Twiller — Frontend

Next.js 16 + React 19 frontend for the Twiller Twitter/X clone. The Express backend (`../backend`) is hosted separately on Render.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **UI**: React 19, TypeScript, Tailwind CSS v4
- **Components**: Radix UI, Framer Motion
- **Auth**: Firebase Auth (Google OAuth + email/password)
- **Real-time**: Socket.IO client
- **Fonts**: Geist via `next/font`

## Local Development

```bash
npm install
cp .env.example .env.local   # fill in real values
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

Copy `.env.example` to `.env.local` and fill in:

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_BACKEND_URL` | Yes | Backend API URL (e.g. `http://localhost:5000`) |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Yes | Firebase web app config |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Yes | Firebase auth domain |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Yes | Firebase project ID |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Yes | Firebase storage bucket |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Yes | Firebase messaging sender ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Yes | Firebase app ID |
| `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` | Yes | Firebase measurement ID |
| `NEXT_PUBLIC_IMGBB_KEY` | No | imgbb API key (optional) |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Yes | Razorpay test-mode key ID |

> All `NEXT_PUBLIC_*` variables are inlined at build time — changes require a redeploy.

## Deploy on Vercel

1. Push the repo to GitHub and import it in the [Vercel dashboard](https://vercel.com/new).
2. Set **Root Directory** to `twiller` (critical — must not be the repo root).
3. Framework preset: **Next.js** | Build: `npm run build`
4. Add all environment variables in Project → Settings → Environment Variables.
5. Add the Vercel URL to the backend's `FRONTEND_ORIGIN` env var on Render.
6. Deploy.

> **404 fix:** If Vercel returns 404 on `/`, the Root Directory is misconfigured. Set it to `twiller/` and redeploy.

## Project Structure

```
twiller/src/
├── app/                    # App Router pages
│   ├── (app)/              # Authenticated routes (home, profile, settings, etc.)
│   ├── forgot-password/    # Password recovery flow
│   ├── reset-password/     # Password reset form
│   └── verify-login-otp/   # OTP verification page
├── components/             # 34+ React components
│   ├── audio/              # Audio tweet recorder/player
│   ├── feed/               # Tweet feed components
│   ├── layout/             # Navigation, sidebar, main layout
│   ├── language/           # Language settings & switcher
│   ├── otp/                # Shared OTP modal
│   ├── pricing/            # Subscription plan cards
│   ├── ui/                 # Reusable UI primitives
│   └── widgets/            # Right sidebar widgets
├── context/                # React contexts (Auth, Theme, Language, etc.)
├── hooks/                  # Custom hooks (notifications, scroll lock)
└── lib/                    # Utilities, socket client, translations, types
```

## Notes

- `next.config.ts` pins `turbopack.root` to this directory so the monorepo's multiple lockfiles don't confuse build root detection.
- No files beyond `.env.example` should be committed (see `.gitignore`).
