# Auth: Google sign-in, email verification, passwords, devices, data export, account deletion

Everything that *decides* lives in Supabase (Auth settings, and for deletion
the database — `Ilm-o-Irfan-App-BE/supabase/migrations/20260921120000_account_deletion.sql`).
The app renders the answer. This page is what has to be true on the backend
and in the consoles for each feature to light up, and where the app-side code
is.

## Google sign-in

Native: the Google SDK shows the account sheet and returns an ID token; the app
sends it to `supabase.auth.signInWithIdToken({ provider: 'google' })`. No
browser, no redirect. Same *verified* email as an existing email/password
account → that account (Supabase automatic linking). New email → new account,
already verified, no code step.

App side: `src/lib/supabase/googleAuth.ts`, wired into `LoginScreen` /
`SignUpScreen`. Buttons say "unavailable" instead of failing when the ids are
missing.

### One-time setup

1. **Google Cloud console** (the project the backend's Supabase Google provider
   uses) → APIs & Services → Credentials. Three OAuth clients:
   - **Web** — client id + secret. Authorised redirect URI:
     `https://<ref>.supabase.co/auth/v1/callback`. This id is what both apps
     send to Supabase. → `GOOGLE_WEB_CLIENT_ID` here, and first in the BE's
     `GOOGLE_CLIENT_ID`.
   - **Android** — package `com.ilmoirfanapp` + the **SHA-1** of every keystore
     that signs the app: the debug keystore (`keytool -list -v -keystore
     android/app/debug.keystore -alias androiddebugkey -storepass android`),
     the EAS production keystore (`eas credentials` → Android → show SHA-1),
     and Play's app-signing key (Play Console → Setup → App signing). No env
     var: Play Services matches by package + SHA-1.
   - **iOS** — bundle id `com.ilmoirfanapp`. → `GOOGLE_IOS_CLIENT_ID` here.
2. **Supabase** → Authentication → Providers → Google: enable, paste the Web
   client id + secret, and turn on **Skip nonce check** (native SDKs cannot
   carry Supabase's nonce). The BE has a script: `npm run auth:google` with
   `GOOGLE_SKIP_NONCE_CHECK=1`.
3. **Supabase** → Authentication → URL configuration → Redirect URLs must
   include `ilmoirfan://**` (the BE's `npm run auth:uris` does this).
4. **This repo**: put both ids in `.env` (and in EAS as env vars, same names),
   then `npm run google:ios-scheme` — it writes the reversed iOS client id
   into `Info.plist` as an URL scheme (EAS runs it in `eas-build-pre-install`).
   Rebuild natively; `react-native-config` bakes `.env` in.

## Email verification

Supabase → Authentication → Providers → Email → **Confirm email: on** (already
on for hosted staging). Then:

- Sign-up lands on `VerifyEmailScreen`; sign-in with an unconfirmed address is
  refused by Supabase with `email_not_confirmed` and lands there too.
- The screen takes the **6-digit code** from the email
  (`supabase.auth.verifyOtp`), and the **link** in the same email works when
  opened on the phone (`ilmoirfan://auth/callback…` → `AuthLinkProvider` →
  `setSession`). Resend has a 60 s cooldown.
- Profile → Privacy & security → Sign-in methods shows the verified state and
  can resend.

### Email template (required for the code)

Supabase → Authentication → Email templates → **Confirm signup**. The default
template has only a link. Add the code:

```html
<h2>Confirm your email</h2>
<p>Enter this code in the Ilm o Irfan app:</p>
<p style="font-size:28px;letter-spacing:6px"><strong>{{ .Token }}</strong></p>
<p>Or, on your phone, <a href="{{ .ConfirmationURL }}">tap to confirm</a>.</p>
```

### Sending email — what is free

| Option | Free tier | Notes |
| --- | --- | --- |
| Supabase built-in SMTP | 2 emails / hour, **only to team-member addresses** | Development only. Real readers will not get mail. |
| **Resend** (recommended) | 3,000 / month, 100 / day | Supabase → Project settings → Auth → SMTP: host `smtp.resend.com`, port 465, user `resend`, pass = API key. Needs a verified sending domain (e.g. `mail.ilmoirfan.com`). |
| Brevo | 300 / day | Same SMTP form. |
| Gmail SMTP (app password) | ~500 / day | Fine for a soft launch; deliverability is worse than a domain. |

After custom SMTP is in, raise Supabase's `rate_limit_email_sent` (Auth →
Rate limits) from 2/hour to something like 60/hour.

## Linking Google to an email account

Profile → Privacy & security → **Sign-in methods** (`SignInMethodsScreen`).

- Requires the account's email to be **verified** first — an unverified
  address is a claim, and a Google account must not be attachable to one.
  The screen offers "Send verification email" if not.
- Link = the same native Google sheet → `supabase.auth.linkIdentity({
  provider: 'google', token })`. Needs Supabase → Authentication → **Manual
  linking: on** (the BE's `config.toml` has it on for local; flip it in the
  hosted dashboard too).
- Unlink = `unlinkIdentity`; refused when Google is the only identity (an
  account created through Google with no password yet).

## Account deletion

Profile → Privacy & security → **Request account deletion**. A request, not a
button: the backend decides whether it may be filed, an admin approves it in
the CMS (People → Deletions), and it runs after a **7-day grace period** during
which the reader can withdraw. The reader is pushed on approve / decline
(`account_deletion_approved` / `_rejected`, tap → Privacy & security).

Rules (all in the database; the app only shows them):

| Situation | Outcome |
| --- | --- |
| Store subscription still auto-renewing (`active` / `trial`) | **Blocked** — "cancel in the App Store / Play first". We cannot cancel the store's billing for them, and deleting would leave them paying for an app they cannot open. Button opens the store's subscriptions page. |
| Store still retrying payment (`grace` / `billing_issue`) | **Blocked**, same guidance. |
| Cancelled but paid through a future date | Allowed, with a warning that the remaining time is forfeited and refunds are the store's. |
| Promotional / comped membership | Allowed (nobody is billed), warning that it ends. |
| Admin account | Blocked — demote first. |
| Has downloads | Warning: they stop opening once the account is gone. |
| Membership bought during the grace period | The executor re-checks and parks the row as **on hold**; the admin approves again or declines; the reader can still withdraw. |
| Request already open | One at a time. |

Execution (`account-deletion-run` Edge Function) removes the reader's avatar
files and the `auth.users` row, which cascades to profile, entitlement,
downloads, progress, highlights, wishlist and push tokens. The app's next
token refresh fails and it signs out. Scheduling needs one secret on the
backend (`ACCOUNT_DELETION_SECRET` + `private.runtime_config`, see BE
`docs/setup-guide.md → Account deletion`); until then the admin's **Run now**
does the same job by hand.

App side: `src/services/accountDeletion.ts`, `src/hooks/useAccountDeletion.ts`,
`PrivacySecurityScreen`; admin: `src/services/admin/deletions.ts`,
`AdminDeletionRequests`.

## Forgot password / change password

Both are Supabase Auth; the app sends nothing but the reader's inputs.

- **Forgot** (sign-in → *Forgot password?*): `resetPasswordForEmail(email,
  { redirectTo: 'ilmoirfan://auth/callback' })`. The reader lands on
  `ResetPasswordScreen` and either types the **6-digit code** from the email
  plus a new password (`verifyOtp({ type: 'recovery' })` → `updateUser`), or
  opens the **link** on the phone — `AuthLinkProvider` sets the session from
  it and routes to the same screen with only the password to fill in.
- **Change** (Profile → Privacy & security → Change password):
  `reauthenticate()` emails the account a code (the *Reauthentication*
  template), then `updateUser({ password, nonce })`. No old password is asked
  for — the emailed code is the proof — which is also how a Google-only
  account sets its first password.

Supabase dashboard, one-time:

1. Authentication → Email templates → **Reset password**: add the code
   (`{{ .Token }}`) next to the link, same as the signup template above.
   **Reauthentication** already contains `{{ .Token }}`.
2. Authentication → Providers → Email → **Secure password change: on**, so a
   password change is refused server-side without a fresh code.
3. Custom SMTP (see *Sending email* above) — all four templates go through it.

## Signed-in devices

Profile → Privacy & security → Signed-in devices (`DevicesScreen`). Rows come
from `my_sessions()` (BE migration `20260923120000_account_sessions_export.sql`),
which reads `auth.sessions`. The app sends a User-Agent of the form
`IlmOIrfan/<version> (<model> · Android 14)` on every Supabase request
(`src/lib/device.ts`) so each row names the phone. Sign one out =
`revoke_session(id)` (deletes the session; its refresh tokens go with it; the
access token it holds lasts up to an hour). Sign out all others =
`supabase.auth.signOut({ scope: 'others' })`.

## Download my data

Profile → Privacy & security → Download my data. `my_data_export()` builds one
JSON document server-side (account, profile, membership, reading record,
highlights, wishlist, downloads with book titles, devices, deletion requests);
the app writes it to cache and opens the system **save-as** sheet
(`@react-native-documents/picker` `saveDocuments`), then deletes the cached
copy. One export per 10 minutes; each is logged in `data_export_log`. Nothing
is emailed and nothing waits.
