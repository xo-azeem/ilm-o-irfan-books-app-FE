# Connect the app to staging Supabase

## Env

1. Copy [`.env.example`](../.env.example) → `.env` (gitignored).
2. Set values from the backend handoff ([BE `docs/ops/fe-handoff.md`](../../ilm-o-irfan-books-app-BE/docs/ops/fe-handoff.md)):

| Variable | Notes |
| --- | --- |
| `SUPABASE_URL` | `https://rwnmckrepvycydmtgvcq.supabase.co` (staging) |
| `SUPABASE_ANON_KEY` | Dashboard → Settings → API → anon / public |

Never put `service_role` or `REVENUECAT_WEBHOOK_AUTH` in the app.

Staging defaults are also baked into [`src/config/env.ts`](../src/config/env.ts) so Metro can run without a local `.env` override. Prefer `.env` for non-staging projects.

## Run

```bash
npm install
npm start
npm run android   # or ios
```

## Seed accounts (staging)

Use the emails/passwords documented by the backend team (typically `admin@gmail.com` / `test@gmail.com` after password reset). Admin users have `canAccessPremium` without a purchase.

## Test without RevenueCat

1. Sign in as admin **or** ask an operator to grant a promotional entitlement (`admin-set-entitlement`).
2. Open Home → book → **Read book** → PDF loads via `get-signed-pdf`.
3. A non-entitled user sees the membership paywall (`PREMIUM_REQUIRED`).

## Out of scope in this build

- RevenueCat Purchases SDK / App Store / Play billing
- Google OAuth deep links
- Production Supabase project / custom SMTP

## Contract

Backend contract: BE `docs/mobile-contract.md`. Edge client: [`src/api/`](../src/api/).
