# Twiller UI/UX Redesign — What Changed

## Design System

### X-style color tokens (`src/app/globals.css`)

| Token | Dark mode | Light mode |
| --- | --- | --- |
| `--background` | `#000000` | `#FFFFFF` |
| `--card` / `--secondary` / `--muted` | `#16181C` | `#F7F9F9` |
| `--border` | `#2F3336` | `#EFF3F4` |
| `--foreground` | `#E7E9EA` | `#0F1419` |
| `--muted-foreground` | `#71767B` | `#536471` |
| `--accent` (hover) | `#181818` | `#F7F9F9` |
| `--brand` | `#1D9BF0` (X blue, both modes) | |
| `--destructive` | `#F4212E` (X red, both modes) | |

- Fonts: Geist (fallback stack kept). Focus-visible ring uses brand blue.
- Custom scrollbar, X-style selection color, animated brand gradient (`bg-brand-gradient`) kept as the Twiller signature.

## Layout

- Grid: `280px sidebar · 600px feed · 350px right panel` (X proportions).
- Sidebar collapses to an 88px icon rail on `md–lg` and hides on mobile (bottom nav instead).
- Feed column has `border-x`, right panel is sticky, page transitions via `AnimatePresence`.

## New / Redesigned Components

- **`Sidebar`** — logo button, nav with active pill + bold + ping dot on Notifications, hover scale, Post pill (gradient), account dropdown (Settings / Premium / Log out).
- **`Feed`** — sticky blur header, mobile avatar, cosmetic "For you / Following" tab bar with animated underline, skeleton loaders, staggered card entrance, redesigned empty state.
- **`TweetCard`** — hero-layout card, verified badge, animated like (spring pop + fill), colored hover rings per action (Reply blue / Repost green / Like red / Bookmark / Share), memoized with `React.memo`, bookmark toggle (local), image hover zoom, audio card.
- **`TweetComposer`** — auto-resizing textarea, gradient Post pill with 200-char counter ring, emoji picker grid (animated), image preview + remove, audio recorder preserved, tweet-limit chip, buttons disabled until valid content.
- **`TweetDetailModal`** — `AnimatePresence` scale/fade, backdrop blur, Escape to close, skeleton + full interaction row, reply composer, replies list.
- **`RightSidebar`** — polished search pill, Premium card with gradient top border, "What's happening" trends, "You might like" with verified check badges, footer links.
- **`MobileBottomNav`** — Home / Explore / center gradient Post FAB / Notifications / Profile (avatar with ring), active underline, safe-area padding.
- **`ProfilePage`** — gradient banner, overlapping avatar, Edit profile + Settings gear, bio + location/website/joined, Posts/Likes/Replies stats, tabs: Posts / Replies / Media / Likes / Login history.
- **`SettingsPage`** (new) — section pills: Account (profile summary + edit), Appearance (light/dark preview cards), Language, Notifications, Security (login history).
- **`NotificationsPage`** (new) — keyword alert status card, monitored keyword chips, "all caught up" / disabled empty states, blocked-permission banner.
- **`ExplorePage`** (new) — sticky search + animated trends list.
- **`PricingPage`** — SaaS cards with ₹ pricing, Recommended badge on Gold, current-plan ring, countdown banner, Razorpay flow untouched.
- **`Toast`** — spring slide-in/out, progress bar, dismiss button.
- **`LoadingSpinner`** — brand-colored.

## New UI Primitives

- `ui/badge.tsx` (variants: default/brand/secondary/destructive/outline)
- `ui/tooltip.tsx` (@radix-ui/react-tooltip)
- `ui/switch.tsx` (@radix-ui/react-switch)
- `Button` now pill-shaped (`rounded-full`), new `brand` variant + `active:scale` feedback.
- `lib/motion.ts` — shared Framer Motion variants (`fadeUp`, `fadeIn`, `scaleIn`, `staggerContainer`, `springPop`).

## Dependencies Added

- `framer-motion`
- `@radix-ui/react-tooltip`
- `@radix-ui/react-switch`

## Theme cleanup (light-mode correctness)

All logged-in-app components now use theme tokens instead of hardcoded dark classes:
- `LanguageSettingsCard`, `ProfileSettingsPanel`, `LoginHistorySection` (token-based)
- `OtpModal`, `AudioPlayer`, `AudioTweetRecorder` (bg-gray-900/blue-500 → bg-muted/bg-card + brand)
- `Editprofile` (full rewrite: motion modal, `bg-card border-border`, brand focus rings)
- `SettingsPage` Appearance tab preview card, `MobileBottomNav` nav

Pre-login screens (Landing splash, `Authmodel`, `VerifyLoginOtp`, `ForgotPassword`) intentionally stay dark — they always render over the always-dark marketing splash, matching X's logged-out look.

## Verification

- `npm run lint` — 0 errors (3 `<img>` warnings in TweetCard/TweetComposer/TweetDetailModal intentionally kept as `img` to avoid changing data flow).
- `npx tsc --noEmit` — clean (0 errors).

## Notes / Follow-ups

- For-you/Following tabs and Bookmark are currently cosmetic/local-only (no backend endpoints) — they do not alter any backend data.
- `LanguageSwitcher` and `ProfileSettingsPanel` are now unused dead code (kept in repo; compile clean).
- An npm `build` was not run to avoid clobbering the running `next dev`; the dev server has hot-reloaded every file and lint + typecheck are green.
