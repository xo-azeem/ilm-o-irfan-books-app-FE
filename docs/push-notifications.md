# Push notifications (FCM)

Readers get tray notifications when the catalogue changes in a way that
concerns them, and when their membership starts or ends. The backend decides
*what* and *to whom* (Supabase triggers → `push_outbox` → the `push-dispatch`
Edge Function → FCM HTTP v1); this app registers the device, draws a banner
when a push arrives in the foreground, and routes a tap.

| Notification | Who gets it | Tap opens |
| --- | --- | --- |
| New book / N new books added | everyone with the app (FCM topic `catalog`) | the book, or Home |
| New collection: … | everyone | the collection |
| N new books in *collection* | everyone | the collection |
| “Book” was removed | readers who downloaded, read, saved or bookmarked it | My Library |
| “Book” has a new edition (PDF replaced) | the same readers | the book |
| “Book” was updated (title, description, author, cover, …) | the same readers | the book |
| Welcome to Premium / Your membership has ended | that reader | Home / Membership |

Full backend contract: `Ilm-o-Irfan-App-BE/docs/api-endpoints.md → Push notifications`.

## How the app side is built

- `@react-native-firebase/app` + `@react-native-firebase/messaging` (v26).
  Loaded lazily and guarded in `src/services/push/firebase.ts`: a build without
  the Firebase project file launches exactly as before, with push off.
- `src/services/push/registry.ts` — `syncPush()` keeps two things in step with
  the switches on **Profile → Notifications**: the `catalog` topic (subscribed
  on-device, works for guests) and the device's token row
  (`register_push_token`, needs a session). Runs at launch, on sign-in, on
  every foreground, on token refresh, on a switch flip, and when the OS
  permission is granted; identical registrations within 24 h are skipped.
  `forgetPushRegistration()` runs from `authStore.signOut` while the JWT is
  still valid.
- `src/app/providers/PushProvider.tsx` — listeners. Foreground message →
  in-app banner (`components/ui/PushBanner.tsx`) + cache invalidation
  (`services/push/payload.ts`); tap on a background/killed-state notification →
  `navigationRef.openPushIntent()`, which waits for the reader shell. Routing
  is by `data.route`: `book` → book detail (`data.bookId`), `collection` →
  collection page (`data.collectionId`), anything else → Home.
  `account_deletion_approved` / `_rejected` also refetch
  `account_deletion_status()`. A targeted push (membership, deletion, a held
  book) that arrives with no session — the account signed out or was deleted
  — is dropped silently (`pushIsForCurrentUser`).
- `register_push_token` sends `p_device_name` as the same label Signed-in
  devices shows (`lib/device.ts`), and is re-called with the new
  `p_notify_library` / `p_notify_membership` whenever a switch on the
  Notifications screen flips.
- `RootNavigator` asks for the OS permission once, after the splash, only over
  the reader app (never over the admin tool).
- Android: three notification channels are created in
  `MainApplication.kt` — `catalog` (default importance), `library` and
  `account` (high) — so readers can mute "new books" in the OS while keeping
  "a book you hold was removed". Small icon `res/drawable/ic_notification.xml`,
  accent `@color/notification_accent`, defaults in `firebase.json`.
- iOS: `FirebaseApp.configure()` in `AppDelegate.swift` (guarded on the plist
  being bundled), `remote-notification` background mode, entitlements file
  with `aps-environment`. Podfile pins CocoaPods mode with static frameworks
  (`$RNFirebaseDisableSPM`, `$RNFirebaseAsStaticFramework`).

Both project files are gitignored. On EAS they are materialised by
`scripts/eas-write-env.js` from `GOOGLE_SERVICES_JSON` and
`GOOGLE_SERVICE_INFO_PLIST` (either an EAS *file* variable or the file's
contents base64-encoded).

## Enabling it in the Firebase console

### 1. Create the project

1. <https://console.firebase.google.com> → **Add project** → name it
   (e.g. `ilm-o-irfan`). Google Analytics is optional; off is fine.
2. Project settings (gear) → **General** → note the **Project ID**.

### 2. Register the Android app (active now)

1. Project overview → **Add app** → Android.
2. Package name: `com.ilmoirfanapp` (must match `applicationId` in
   `android/app/build.gradle`). Nickname anything; SHA-1 is not needed for FCM.
3. **Download `google-services.json`** → put it at
   `android/app/google-services.json`. It is gitignored; keep a copy somewhere
   safe and add it to EAS as described above.
4. Skip the "Add Firebase SDK" step — the gradle plugin and dependencies are
   already wired (`android/build.gradle`, `android/app/build.gradle`).
5. Rebuild the native app: `npx expo run:android` (Metro reload is not enough;
   the plugin bakes the file into resources at build time).

### 3. Cloud Messaging API

1. Project settings → **Cloud Messaging** tab.
2. Under *Firebase Cloud Messaging API (V1)* make sure it says **Enabled**.
   If it shows a "Manage API in Google Cloud Console" link, follow it and click
   **Enable**. (The legacy "Cloud Messaging API" is deprecated and not used.)

### 4. Service-account key for the backend

The Supabase Edge Function sends through FCM HTTP v1, which authenticates with
a service account, not a server key.

1. Project settings → **Service accounts** → **Generate new private key** →
   download the JSON. Treat it like a password.
2. Hand it to the backend per
   `Ilm-o-Irfan-App-BE/docs/setup-guide.md → Push notifications`
   (base64 it → `FCM_SERVICE_ACCOUNT_B64` Edge secret, plus
   `PUSH_DISPATCH_SECRET` and the two `private.runtime_config` rows).

### 5. iOS (implemented, switched off until you add the APNs key)

The code path is complete; iOS delivery only starts once Apple's side is
connected. When you are ready:

1. Apple Developer → Certificates, Identifiers & Profiles → **Identifiers** →
   `com.ilmoirfanapp` → enable **Push Notifications**.
2. **Keys** → create a key with **Apple Push Notifications service (APNs)** →
   download the `.p8` once, note the **Key ID** and your **Team ID**.
3. Firebase → **Add app** → iOS, bundle ID `com.ilmoirfanapp` → download
   `GoogleService-Info.plist` → put it at
   `ios/IlmOIrfanApp/GoogleService-Info.plist` (gitignored; add to EAS too).
4. Firebase → Project settings → **Cloud Messaging** → *Apple app
   configuration* → **APNs Authentication Key** → upload the `.p8` with the
   Key ID and Team ID.

   <!--
   APNs key upload — intentionally not done yet. When enabling iOS:
     Key ID:   ____________
     Team ID:  ____________
     File:     AuthKey_<KEYID>.p8  (kept out of the repo)
   -->

5. In Xcode, open the workspace, select the app target → **Signing &
   Capabilities** → confirm **Push Notifications** and **Background Modes →
   Remote notifications** are listed (the entitlements file and Info.plist
   already declare them; Xcode just needs to see the capability on the team).
6. `cd ios && pod install`, then run on a **physical device** — simulators do
   not receive APNs pushes.

Nothing in the app references the APNs key; it lives only in the Firebase
console. Until step 4 is done iOS builds run normally and `getToken()` simply
fails quietly on the device.

## Testing

**Quickest end-to-end check (Android):**

1. Build and launch the app with `google-services.json` in place, accept the
   permission prompt, sign in.
2. In Supabase → SQL editor:
   `select token, platform, notify_library from public.device_push_tokens;`
   — your device should be there within a few seconds of sign-in.
3. Firebase console → **Messaging** → *Create your first campaign* →
   Firebase Notification message → *Send test message* → paste the token.
   The tray entry should appear with the app in the background. (Console test
   messages carry no `data`, so a tap just opens the app.)
4. Real flow: in the admin app publish a book, or delete one a test reader
   holds. Watch `select * from public.push_outbox order by id desc limit 5;`
   go `pending → processing → sent`, and the phone light up.

**Foreground:** with the app open, the same push appears as a banner at the
top; tapping it navigates. **Cold start:** kill the app, send a push, tap it —
the app opens on the target screen after the splash.

**Switches:** Profile → Notifications. Turning "Changes to my books" and
"Membership" both off removes the token row; "New books & collections" off
unsubscribes the topic. Denying the OS permission shows the warning callout
with a shortcut to the device's settings.

## Troubleshooting

| Symptom | Look at |
| --- | --- |
| Build fails: `File google-services.json is missing` | It is not — the plugin is applied only when the file exists. If you see this, the file is at the wrong path (`android/app/`). |
| `pushAvailable()` is false / Notifications screen says "not available in this build" | The project file was not in the build. Rebuild natively after adding it. |
| Token row never appears | Permission denied (check the screen's callout), or signed out, or both targeted switches off. Metro logs `[push] register failed …` in dev. |
| Outbox rows stay `pending` | Backend side: `private.runtime_config` missing `supabase_url` / `push_dispatch_secret`, or cron off. See BE setup-guide step 4. |
| Rows go `failed`, `last_error = THIRD_PARTY_AUTH_ERROR` | iOS: APNs key not uploaded (expected until step 5 is done). |
| Rows go `failed`, `last_error = PERMISSION_DENIED` / `SENDER_ID_MISMATCH` | The service account or `google-services.json` belongs to a different Firebase project. |
| Tray icon is a white square | The vector is fine; check the build picked up `res/drawable/ic_notification.xml` (clean build). |
