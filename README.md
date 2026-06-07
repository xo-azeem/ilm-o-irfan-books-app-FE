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
│   ├── home/
│   └── explore/
├── hooks/                  # Shared React hooks
└── theme/                  # Design tokens
```

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | React Native 0.85 (CLI, bare workflow) |
| Language | TypeScript |
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
