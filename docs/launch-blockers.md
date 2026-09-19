# Launch blockers — what is left, and exactly how to fix each one

_Last verified: 19 September 2026, against staging (`rwnmckrepvycydmtgvcq`)._

The app code is complete for every feature below. What remains is configuration
that lives outside this repo: the Supabase dashboard, Resend, GoDaddy, Google
Cloud, Apple/Google developer consoles and RevenueCat. Each section says who
can do it, what it blocks, and the exact steps. Do them in the order listed —
several depend on the one before.

| # | Blocker | Blocks | Owner | Effort |
| --- | --- | --- | --- | --- |
| 1 | Supabase email rate limit still at 2/hour | every auth email after the second | whoever has Supabase dashboard access | 2 min |
| 2 | Resend sending domain not verified (5 DNS records) | all real email delivery | client (GoDaddy owner) | 10 min |
| 3 | Domain `ilmoirfanpublisher.com` expires 31 Oct 2026 | everything on that domain | client | 5 min |
| 4 | Legal pages 404; client site answers HTTP 402 | both store reviews | client | 1–2 h |
| 5 | RevenueCat keys empty; store products missing | the paywall / any purchase | dev + client (store accounts) | 1–2 h |
| 6 | iOS Google sign-in client missing | Google sign-in on iPhone | dev (Google Cloud) | 15 min |
| 7 | Android OAuth client SHA-1s for release builds | Google sign-in in store builds | dev | 15 min |
| 8 | iOS push not configured (no plist, no APNs key) | tray notifications on iPhone | dev (Apple + Firebase) | 30 min |

---

## 1. Supabase email rate limit is still the built-in 2 per hour

**Symptom.** Any auth email after the second in an hour — across *all* users of
the project — fails with `429 over_email_send_rate_limit`. Verified on 19 Sept:
a single sign-in-code request for `test@gmail.com` returned that error. The app
surfaces it as "A code was sent very recently…", but the real cause is the
project-wide ceiling. The 30-second resend cooldown in the app is meaningless
until this is raised; the acceptance run (sign-up, reset, two email-change
codes, a reauth code) needs 5–6 emails in minutes.

**Why it is still 2.** Configuring custom SMTP or the Send Email hook only
_unlocks_ the field; the value stays at the default until someone changes it.

**Fix (Supabase dashboard).**

1. https://supabase.com/dashboard → project **Ilm o Irfan** (`rwnmckrepvycydmtgvcq`).
2. Sidebar → **Authentication** → **SMTP Settings** → **Enable Custom SMTP**
   (needed even though the Send Email hook does the actual sending — it is
   what unlocks the rate limit). Fill in:

   | Field | Value |
   | --- | --- |
   | Sender email | `onboarding@resend.dev` until §2 is done, then `no-reply@ilmoirfanpublisher.com` |
   | Sender name | `Ilm o Irfan` |
   | Host | `smtp.resend.com` |
   | Port | `465` |
   | Minimum interval between emails | `30` |
   | Username | `resend` |
   | Password | the `RESEND_API_KEY` from `Ilm-o-Irfan-App-BE/.env` (starts with `re_`) |

   Save.
3. **Authentication → Rate Limits** → **Rate limit for sending emails** → set
   to `60` → Save. (Leave "token verifications" at its default.)
4. **Authentication → Hooks** → confirm **Send Email** is _enabled_ and points
   at the backend's function. If it is not, the hook only exists in the
   backend's local `config.toml` — the backend agent must register it on the
   hosted project.
5. Verify from a terminal (should now return `{}` / HTTP 200, not 429):
   ```
   curl -s -w "\n%{http_code}\n" "$SUPABASE_URL/auth/v1/otp" \
     -H "apikey: $SUPABASE_ANON_KEY" -H "Content-Type: application/json" \
     -d '{"email":"<a real inbox>","create_user":false}'
   ```

Note: `test@gmail.com` / `admin@gmail.com` are refused by Supabase's address
validation (`400 email_address_invalid`) before any of this applies. Use real
inboxes for the acceptance run.

---

## 2. Resend sending domain — 5 DNS records on `ilmoirfanpublisher.com`

**Symptom.** Until the domain is verified in Resend, emails can only go out
from the sandbox sender `onboarding@resend.dev`, which Resend delivers **only
to the inbox that owns the Resend account**. No reader will receive a sign-up
code, password reset or account email. This is independent of §1 — both must
be done.

**Who.** Whoever holds the GoDaddy login for `ilmoirfanpublisher.com` (the
client). Send them the text below verbatim.

---

> **Subject: 5 DNS records on ilmoirfanpublisher.com for the Ilm o Irfan app's emails**
>
> The Ilm o Irfan mobile app will send its sign-up, password-reset and account
> emails from **no-reply@ilmoirfanpublisher.com**. That needs five DNS records
> on the domain. They don't touch the website or the Shopify setup — they only
> add a sending key on the `send` / `rsend` subdomains. The domain currently
> has no email records, so nothing existing is affected.
>
> **Where:** log in at https://godaddy.com → **My Products** → next to
> **ilmoirfanpublisher.com** click **DNS** (or **Manage DNS**) → **Add New
> Record**. Add these five, one at a time:
>
> | Type | Name | Value | Priority | TTL |
> | --- | --- | --- | --- | --- |
> | TXT | `resend._domainkey` | `p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC2py0diQ3YHwyCFMmGpZEDzqdYsgt1JTvetltao0Nq4yJh/7XMSojcTcXJWosAk4XGQ+KStUhdvZlDeHYVxbzeX9+nnpwU++4/WZVERAb5QFECyO+7hyy4gwJGiG/6zoOTsxzYL/TPTRMw+4qUdSIwweAeINEpha/T8VdDpxVkiQIDAQAB` | — | 1 Hour |
> | MX | `send` | `feedback-smtp.ap-northeast-1.amazonses.com` | 10 | 1 Hour |
> | TXT | `send` | `v=spf1 include:amazonses.com ~all` | — | 1 Hour |
> | CNAME | `rsend` | `send.forge.rmta.net` | — | 1 Hour |
> | TXT | `_dmarc` | `v=DMARC1; p=none;` | — | 1 Hour |
>
> **Notes for GoDaddy's form:** type the Name exactly as shown (GoDaddy adds
> `.ilmoirfanpublisher.com` itself — do not type the full hostname). Paste TXT
> values without quotes. For the MX record the value field is called "Points
> to" / "Mail server". Click **Save** after each.
>
> **Also important:** the domain's registration **expires 31 October 2026**.
> Please renew it now (My Products → Renew) — if it lapses, the app's emails
> stop and the domain could be lost.
>
> Reply once the records are saved; verification is automatic afterwards.

---

**After the client replies.**

1. https://resend.com → **Domains** → `ilmoirfanpublisher.com` → **Verify**.
   Status should turn to _Verified_ within minutes (up to an hour for DNS).
2. Backend `.env`: `EMAIL_FROM=Ilm o Irfan <no-reply@ilmoirfanpublisher.com>`,
   redeploy the email function (`npm run deploy:hosted` in the BE repo, or the
   backend agent's equivalent).
3. Supabase → Authentication → SMTP Settings → Sender email →
   `no-reply@ilmoirfanpublisher.com`.
4. Keep `EMAIL_REPLY_TO=ilmoirfanapp@gmail.com` — reply-to may be any address;
   only the _from_ must be on the verified domain. (`ilmoirfanapp@gmail.com`
   cannot be the sender: Resend cannot verify `gmail.com`.)
5. Send yourself a password reset from the app and check the headers show
   DKIM `pass` for `ilmoirfanpublisher.com`.

---

## 3. Domain registration expires 31 October 2026

Covered in the message above, but it deserves its own line: if
`ilmoirfanpublisher.com` lapses, every email stops and the legal pages (§4)
go dark, which fails the store listing. **Client:** GoDaddy → My Products →
Renew, ideally with auto-renew on.

---

## 4. Legal pages do not exist; the client site answers HTTP 402

**Symptom (verified 19 Sept).**

| URL | Result |
| --- | --- |
| `https://ilmoirfan.com/privacy` | 404 |
| `https://ilmoirfan.com/terms` | 404 |
| `https://ilmoirfan.com/rate` | 404 |
| `https://ilmoirfanpublisher.com` | 301 → `www.` → **402 Payment Required** (hosting suspended/unpaid) |

Both app stores require a **live privacy-policy URL** in the listing; Apple
also requires **Terms of Use (EULA)** for any app with auto-renewing
subscriptions, linked from the paywall. Reviewers open these links.

**Fix.**

1. **Client:** settle the hosting bill for `ilmoirfanpublisher.com` (the 402
   is the host's "unpaid" page). Confirm `https://www.ilmoirfanpublisher.com`
   loads.
2. **Client / whoever manages the site:** publish two pages —
   `https://www.ilmoirfanpublisher.com/privacy` and `/terms`. Shopify: Online
   Store → Pages → Add page (Shopify also has generators under Settings →
   Policies). Minimum content the reviewers look for: what data is collected
   (email, name, reading progress, device token for notifications, purchase
   receipts via RevenueCat), why, how a reader deletes their account (Profile
   → Privacy & security), and a contact address.
3. **Dev (this repo):** update the three constants and the support address
   once the pages exist —
   - `src/features/profile/screens/PrivacySecurityScreen.tsx` →
     `PRIVACY_POLICY_URL`, `TERMS_URL`
   - the `/rate` link and `support@ilmoirfan.com` in
     `src/features/profile/data/profileContent.ts` (`supportContact.email`)
     → use `@ilmoirfanpublisher.com` addresses, since `ilmoirfan.com` is not
     the client's domain.
   - Run `npm run typecheck && npm test`, commit.
4. Put the same two URLs in App Store Connect (App Privacy → Privacy Policy
   URL; and the EULA link in the subscription group) and Play Console (App
   content → Privacy policy).

---

## 5. RevenueCat keys are empty; store products do not exist

**Symptom.** `REVENUECAT_IOS_KEY` and `REVENUECAT_ANDROID_KEY` are blank in
`.env` and absent from `eas.json`, so the paywall reports "Checkout
unavailable" and no purchase can be made. Even with keys, RevenueCat has
nothing to sell until the products exist in each store.

**Fix, in order.**

1. **RevenueCat** (https://app.revenuecat.com): create the project _Ilm o
   Irfan_ with two apps — iOS (bundle `com.ilmoirfanapp`) and Android (package
   `com.ilmoirfanapp`). Copy the public SDK keys: `appl_…` and `goog_…`.
2. **App Store Connect** (client's Apple developer account): the app →
   Subscriptions → create a subscription group → add the product with
   **Product ID `premium_monthly`**, price, duration 1 month, localisation.
   Also generate the **In-App Purchase key** (Users and Access → Integrations
   → In-App Purchase) and upload it to RevenueCat → the iOS app → App Store
   Connect API.
3. **Play Console**: the app → Monetise → Subscriptions → create product
   **ID `premium_monthly`** with a base plan (monthly, auto-renewing). Link a
   Google Cloud service account with Play Developer API access and paste its
   JSON into RevenueCat → the Android app → Play Store credentials.
4. **RevenueCat**: Products → import both `premium_monthly` products →
   Entitlements → create the entitlement whose identifier matches the
   backend's `REVENUECAT_ENTITLEMENT_ID` (from `Ilm-o-Irfan-App-BE/.env`) →
   attach both products → Offerings → default offering with a monthly package.
5. **RevenueCat webhook**: Integrations → Webhooks → URL
   `https://rwnmckrepvycydmtgvcq.supabase.co/functions/v1/revenuecat-webhook`,
   Authorization header = the backend's `REVENUECAT_WEBHOOK_AUTH`. (The
   backend agent can confirm the exact function name.)
6. **This repo:** put the two keys in `.env` and in EAS
   (`eas env:create --scope project --name REVENUECAT_IOS_KEY …`, same for
   Android), then **rebuild natively** — `react-native-config` bakes them in.
7. **Verify:** Profile → Subscription shows the monthly price from the store
   (never a hard-coded one); a sandbox purchase flips `canAccessPremium` and
   the backend's `entitlements-status` shows the row.

---

## 6. iOS Google sign-in — no iOS OAuth client

**Symptom.** `GOOGLE_IOS_CLIENT_ID` is empty, so
`ios/IlmOIrfanApp/Info.plist` still contains the placeholder URL scheme
`com.googleusercontent.apps.REPLACE_WITH_IOS_CLIENT_ID`. On an iPhone the
Google sheet opens but cannot return to the app. Android is unaffected (fixed
19 Sept: the Android client's package name was `com.ilmoirfan` instead of
`com.ilmoirfanapp`).

**Fix.**

1. Google Cloud console → project **`925325799497`** (the one that owns the
   web client ID in `.env` and Supabase's Google provider — _not_ the Firebase
   project `329972212771`) → APIs & Services → Credentials → Create
   credentials → OAuth client ID → **iOS** → Bundle ID `com.ilmoirfanapp`.
2. Copy the client ID (`…apps.googleusercontent.com`) into `.env` as
   `GOOGLE_IOS_CLIENT_ID`, and into EAS with the same name.
3. `npm run google:ios-scheme` — rewrites the placeholder in `Info.plist`
   with the reversed client ID. (EAS runs this itself in
   `eas-build-pre-install`.)
4. Rebuild for iOS. Sign in with Google on a device; it should return to the
   app and land on Home.

---

## 7. Android Google sign-in in release builds — register every signing key

**Symptom.** The Android OAuth client currently has only the **debug**
keystore's SHA-1. Any build signed with a different key (an EAS build, or the
Play-signed release) will fail Google sign-in with `DEVELOPER_ERROR` even
though dev builds work.

**Fix.** In the same Google Cloud project (`925325799497`) → Credentials →
create **one Android OAuth client per key**, all with package
`com.ilmoirfanapp`:

| Key | Where to get the SHA-1 | Status |
| --- | --- | --- |
| Debug (`android/app/debug.keystore`) | `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25` | ✅ registered |
| EAS build keystore | `eas credentials` → Android → production → show SHA-1 | ❌ |
| Play app-signing key | Play Console → the app → Setup → App signing → "App signing key certificate" → SHA-1 | ❌ |

No app change, no rebuild; propagation takes a few minutes. Verify by
installing an EAS `preview` build and signing in with a fresh Google account.

---

## 8. iOS push notifications — no `GoogleService-Info.plist`, no APNs key

**Symptom.** Android push is fully wired (`google-services.json` present,
channels created, token registration verified against staging). iOS has
neither the Firebase plist nor an APNs key, so the app launches with push off
on iPhone (the code guards for this; nothing crashes).

**Fix.**

1. **Apple developer account** (client's) → Certificates, Identifiers &
   Profiles → **Keys** → `+` → name it "Ilm o Irfan APNs", tick **Apple Push
   Notifications service (APNs)** → Register → download the `.p8` once, note
   the **Key ID** and the **Team ID**.
2. Identifiers → `com.ilmoirfanapp` → Capabilities → enable **Push
   Notifications**.
3. **Firebase console** → project `ilm-o-irfan-6069e` → Project settings →
   Cloud Messaging → Apple app configuration → upload the `.p8` with Key ID
   and Team ID.
4. Project settings → General → **Add app → iOS**, bundle `com.ilmoirfanapp`
   → download `GoogleService-Info.plist` → place it at
   `ios/IlmOIrfanApp/GoogleService-Info.plist` (gitignored). Add the same file
   to EAS as a secret file so cloud builds get it.
5. Xcode: the target's Signing & Capabilities → add **Push Notifications** and
   **Background Modes → Remote notifications** (if not already in the
   entitlements).
6. Rebuild for iOS on a real device (the simulator has no APNs token). Profile
   → Notifications → allow → the backend's `push_tokens` table should show a
   row with `platform = ios`. Firebase console → Messaging → "Send test
   message" to that token → tray notification appears.

Full detail: `docs/push-notifications.md` § 5.

---

## Already done (for the record)

- Auth emails are code-first in the app: one shared code screen for sign-up,
  password reset, sign-in by code, two-code email change and reauthentication.
- Android Google sign-in: OAuth client package name corrected to
  `com.ilmoirfanapp`; debug SHA-1 registered; working on device.
- Android push: native config, channels, token register/unregister, tap
  routing — all verified.
- Backend RPCs on staging exist with the expected signatures:
  `register_push_token`, `unregister_push_token`, `my_sessions`,
  `revoke_session`, `my_data_export`, `account_deletion_status`,
  `request_account_deletion`, `cancel_account_deletion_request`,
  `request_subscription_cancellation`, `withdraw_subscription_cancellation`.
