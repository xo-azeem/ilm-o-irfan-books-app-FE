# Connect the app to staging Supabase

## Env

1. Copy [`.env.example`](../.env.example) → `.env` (gitignored).
2. Set values from the backend handoff ([BE `docs/ops/fe-handoff.md`](../../ilm-o-irfan-books-app-BE/docs/ops/fe-handoff.md)):

| Variable | Notes |
| --- | --- |
| `SUPABASE_URL` | `https://rwnmckrepvycydmtgvcq.supabase.co` (staging) |
| `SUPABASE_ANON_KEY` | Dashboard → Settings → API → anon / public |
| `REVENUECAT_API_KEY_IOS` | Public RC iOS SDK key (optional until billing ships) |
| `REVENUECAT_API_KEY_ANDROID` | Public RC Android SDK key (optional until billing ships) |

Never put `service_role` or `REVENUECAT_WEBHOOK_AUTH` in the app.

Staging defaults for Supabase are also baked into [`src/config/env.ts`](../src/config/env.ts) so Metro can run without a local `.env` override. Prefer `.env` for non-staging projects. RevenueCat keys have **no** baked defaults — leave blank until the RC project exists.

## Run

```bash
npm install
npm start
npm run android   # or ios
```

After adding `react-native-purchases`, rebuild the native app (not only Metro). On iOS run `pod install` in `ios/` when needed.

## Seed accounts (staging)

Use the emails/passwords documented by the backend team (typically `admin@gmail.com` / `test@gmail.com` after password reset). Admin users have `canAccessPremium` without a purchase.

## Subscriptions (RevenueCat)

The app wires `react-native-purchases`:

- Configure + `Purchases.logIn(supabaseUser.id)` on auth
- Profile → Subscription: Subscribe / Restore / Manage billing
- Book detail paywall → Subscription screen

Without public SDK keys or store products, Subscribe shows a clear “billing not configured” alert. Unlock still works via admin / promotional entitlement.

## Test without store products

1. Sign in as admin **or** ask an operator to grant a promotional entitlement (`admin-set-entitlement`).
2. Open Home → book → **Read book** → PDF loads via `get-signed-pdf`.
3. A non-entitled user sees the membership paywall (`PREMIUM_REQUIRED`).

## Still needs ops (credentials)

- RevenueCat project + public SDK keys in `.env`
- App Store / Play subscription products
- Live webhook auth on Supabase (backend)

## Out of scope in this build

- Google OAuth deep links
- Production Supabase project / custom SMTP

## Contract

Backend contract: BE `docs/mobile-contract.md`. Edge client: [`src/api/`](../src/api/). Billing helpers: [`src/billing/purchases.ts`](../src/billing/purchases.ts).
