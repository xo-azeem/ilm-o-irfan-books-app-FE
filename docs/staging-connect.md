# Connect the app to staging Supabase

## Env

1. Copy [`.env.example`](../.env.example) → `.env` (gitignored).
2. Set values from the backend handoff (BE `docs/ops/fe-handoff.md`):

| Variable | Notes |
| --- | --- |
| `SUPABASE_URL` | `https://rwnmckrepvycydmtgvcq.supabase.co` (staging) |
| `SUPABASE_ANON_KEY` | Dashboard → Settings → API → anon / public |
| `REVENUECAT_IOS_KEY` / `REVENUECAT_ANDROID_KEY` | Public SDK keys. Leave empty on a build with no store products — checkout reports itself unavailable and everything else works. |

Never put `service_role` or `REVENUECAT_WEBHOOK_AUTH` in the app.

`react-native-config` bakes `.env` into the native binary, so **changing it needs
a rebuild** (`npm run android` / `npm run ios`) — a Metro reload will not pick
it up. If the baked URL is still a LAN address from a local Supabase session,
[`src/config/env.ts`](../src/config/env.ts) falls back to the hosted project
unless `USE_LOCAL_SUPABASE=true`.

## Run

```bash
npm install
npm start
npm run android   # or: cd ios && pod install && cd .. && npm run ios
```

## Seed accounts (staging)

Use the emails/passwords documented by the backend team (typically
`admin@gmail.com` / `test@gmail.com` after a password reset). Admin users open
the admin navigator and can read every book without a purchase.

## Test without RevenueCat

1. Sign in as admin **or** ask an operator to grant a promotional entitlement
   (`admin-set-entitlement`).
2. Home → book → **Read** → the PDF is fetched through `get-signed-pdf` and
   streamed to app-private storage.
3. A signed-in reader with no entitlement sees the membership paywall
   (`PREMIUM_REQUIRED`); a signed-out reader is sent to Login and returned to
   the book afterwards.

Access is gated on `canAccessPremium` from `entitlements-status` — never on
`isActive`, `status === 'active'`, or a book's `is_premium`. A cancelled or
grace-period membership still reads until `expiresAt`, and the local countdown
in [`src/stores/accessStore.ts`](../src/stores/accessStore.ts) locks the reader
at that moment even offline. Changes in between (renewal, refund, admin revoke)
arrive over the `access_events` Postgres change feed, with a re-poll on every
foreground and reconnect.

## Out of scope on this build

- App Store / Play billing products (the SDK is wired; products are ops)
- Google OAuth deep links
- Production Supabase project / custom SMTP

## Contract

Backend contract: BE `docs/mobile-contract.md`, frozen envelopes in BE
`docs/fixtures/`. Client: [`src/services/api/`](../src/services/api/)
(`endpoints.ts` mirrors the backend's endpoint manifest; `client.ts` normalises
the `{ data }`, paginated and `{ error }` envelopes and retries a 401 once after
a token refresh).
