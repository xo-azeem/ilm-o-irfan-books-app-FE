# Ilm o Irfan

Cross-platform mobile app built with **React Native CLI**, **TypeScript**, and **NativeWind** (Tailwind CSS for React Native).

## Requirements

- Node.js 20+
- JDK 17+ (Android)
- Android Studio with SDK and emulator (Android)
- Xcode and CocoaPods (iOS, macOS only)

## Getting started

```bash
npm install
```

Start Metro:

```bash
npm start
```

Run on Android:

```bash
npm run android
```

Run on iOS (macOS):

```bash
cd ios && pod install && cd ..
npm run ios
```

## Environment

Copy `.env.example` to `.env` and fill it in. `react-native-config` bakes these
into the native binary, so **changing `.env` needs a rebuild** — a Metro reload
will not pick it up.

| Key | Notes |
| --- | --- |
| `SUPABASE_URL` / `SUPABASE_ANON_KEY` | Anon key only. `service_role` must never appear in the app. |
| `REVENUECAT_IOS_KEY` / `REVENUECAT_ANDROID_KEY` | The **public** SDK keys (`appl_…` / `goog_…`). Safe to ship. |

Never add the RevenueCat secret key or `REVENUECAT_WEBHOOK_AUTH`: the webhook is
the backend's, and the app only ever reads `entitlements-status`.

Without a RevenueCat key the app runs normally and the paywall reports that
membership cannot be purchased on that build — which is the right behaviour for a
simulator or CI.

### Billing (native)

`react-native-purchases` is autolinked, so Android needs nothing beyond a
rebuild. iOS needs `cd ios && pod install` before the next build, and sandbox
testing needs a StoreKit/Play test account — entitlement `premium`, product
matched to `plans.revenuecat_product_id`.

## Project structure

```
src/
├── app/                    # App shell: providers, navigation, bootstrap
│   ├── App.tsx
│   ├── navigation/
│   └── providers/
├── components/             # Shared UI components
│   └── ui/
├── constants/              # App-wide constants (routes, config)
├── features/               # Feature modules (screens + feature logic)
│   ├── explore/
│   ├── library/
│   ├── wishlist/
│   └── profile/
├── hooks/                  # Shared React hooks
└── theme/                  # Design tokens
```

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | React Native 0.85 (CLI, bare workflow) |
| Language | TypeScript |
| Backend | Supabase Auth + Edge Functions (`src/services/api/`) |
| Data fetching | TanStack Query (`src/hooks/`) |
| State | Zustand + MMKV (`src/stores/`) |
| Billing | RevenueCat (`react-native-purchases`) — status always read from `entitlements-status` |
| PDF | react-native-pdf + signed Storage URLs, streamed to app-private storage |
| Styling | NativeWind + Tailwind CSS v3 |
| Navigation | React Navigation (bottom tabs) |
| Gestures | React Native Gesture Handler |
| Animations | React Native Reanimated |

## Adding a feature

1. Create `src/features/<name>/screens/<Name>Screen.tsx`
2. Register the screen in `src/app/navigation/`
3. Add route constants in `src/constants/routes.ts`
4. Style with Tailwind `className` props via NativeWind

## Path aliases

Import from `@/` which maps to `src/`:

```tsx
import { Button } from '@/components/ui';
import { ROUTES } from '@/constants/routes';
```

## Scripts

| Command | Description |
| --- | --- |
| `npm start` | Start Metro bundler |
| `npm run android` | Build and run on Android |
| `npm run ios` | Build and run on iOS |
| `npm run lint` | Run ESLint |
