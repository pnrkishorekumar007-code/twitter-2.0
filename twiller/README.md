# Twiller (frontend)

Next.js 16 frontend for Twiller. The Express backend (`../backend`) is hosted separately on Render — Vercel only serves this Next.js app.

## Local development

```bash
npm install
cp .env.example .env.local   # fill in real values
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy on Vercel

1. Push the repo to GitHub and import it in the [Vercel dashboard](https://vercel.com/new).
2. Set the **Root Directory** to `twiller`. Keep `npm install` / `npm run build` defaults.
3. Add these Environment Variables in Project → Settings → Environment Variables:

   | Variable | Example |
   |---|---|
   | `NEXT_PUBLIC_BACKEND_URL` | `https://your-backend.onrender.com` |
   | `NEXT_PUBLIC_FIREBASE_API_KEY` | from Firebase Console |
   | `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | `your-project.firebaseapp.com` |
   | `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | your Firebase project id |
   | `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | `your-project.firebasestorage.app` |
   | `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | from Firebase Console |
   | `NEXT_PUBLIC_FIREBASE_APP_ID` | from Firebase Console |
   | `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` | `G-XXXXXXX` |
   | `NEXT_PUBLIC_IMGBB_KEY` | imgbb API key (optional) |
   | `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Razorpay test-mode key id |

4. Add the Vercel URL to the backend's CORS allowlist (backend `FRONTEND_ORIGIN` env var on Render) so cookies and API calls work cross-origin.
5. Deploy.

`NEXT_PUBLIC_*` variables are inlined at build time, so changes require a redeploy.

## Notes

- The app uses `next/font` (Geist) and builds fully static pages.
- `next.config.ts` pins `turbopack.root` to this directory so the repo's multiple lockfiles don't confuse build root detection.
- No files in this directory should be committed beyond `.env.example` (see `.gitignore`).
