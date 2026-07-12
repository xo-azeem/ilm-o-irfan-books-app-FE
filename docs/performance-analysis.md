# App Performance Analysis — Reload & Startup

Analysis of what makes the Ilm o Irfan app feel slow on **dev reload** and **first paint**, with prioritized fixes you can implement later.

**Date:** July 2026  
**Production Android bundle size:** ~4.2 MB (`4,362,749` bytes)

---

## Short answer

**ThemeContext is not the problem** — it is lightweight and well set up. The main costs are:

1. **The whole app being parsed at startup** (navigation imports)
2. **`HeroBookCarousel` on first Home paint** (biggest single UI cost)
3. **NativeWind + nested scroll on Home**
4. **Theme store MMKV** (small but real on every reload)

---

## What happens on reload

```
index.js → global.css (NativeWind) → AppProviders → RootNavigator → HomeScreen
```

Even though only **Home** mounts first (`lazy: true` on tabs), **all tab screens are statically imported** in `src/app/navigation/RootNavigator.tsx`:

```ts
import { HomeScreen } from '@/features/home/screens/HomeScreen';
import { LibraryScreen } from '@/features/library/screens/LibraryScreen';
import { ProfileNavigator } from '@/features/profile/navigation/ProfileNavigator';
import { SearchScreen } from '@/features/search/screens/SearchScreen';
```

`ProfileNavigator` alone eagerly pulls in **11 profile screens** before you ever open Profile. So reload parses a large chunk of the app even when you only see Home.

**Note:** `lazy: true` on tabs only defers **mounting** other tabs; it does **not** defer **loading** their JavaScript.

---

## Component-by-component breakdown

### 1. HeroBookCarousel — heaviest first paint (yes, the carousel)

**File:** `src/features/home/components/HeroBookCarousel.tsx`

On Home load it immediately mounts **all 5 carousel pages**, each with:

- 2 `useAnimatedStyle` worklets (glow + cover) → ~10 worklets total
- 5 more worklets for pagination dots
- 1 `useAnimatedReaction` syncing `scrollX` → `scrollTo` during auto-scroll
- Per-page color blending (`parseHex`, `blendHex`, `panelOpaqueFill`)
- Shadows/elevation on covers and panels
- Auto-scroll timer starts as soon as Home is focused

That is a lot of Reanimated + layout work on the first frame.

**Auto-scroll pattern (extra overhead):** animates `scrollX` via `withTiming`, then mirrors it back into the `ScrollView` via `scrollTo` in a reaction — more work than driving scroll offset directly.

---

### 2. HomeScreen — heavy, but secondary to carousel

**File:** `src/features/home/screens/HomeScreen.tsx`

- Hero carousel (above)
- 3 horizontal `ScrollView`s (9 book cards + collections)
- All wrapped in a **vertical** `Screen` scroll → nested scrolling adds layout/gesture cost

**Files involved:**

- `src/components/layout/index.tsx` — vertical `ScrollView` wrapper
- `src/features/home/screens/HomeScreen.tsx` — carousel + horizontal lists

---

### 3. Navigation import graph — biggest reload/parse cost

**Files:**

- `src/app/navigation/RootNavigator.tsx`
- `src/features/profile/navigation/ProfileNavigator.tsx` (11 eager screen imports)

`lazy: true` only defers mounting; Search, Library, and all Profile screens are still evaluated on every reload.

**Profile screens imported at startup:**

- AboutScreen, AppearanceScreen, DownloadsScreen, HelpCenterScreen, LanguageScreen, NotificationsScreen, PersonalDetailsScreen, PrivacySecurityScreen, ProfileScreen, RateAppScreen, SubscriptionScreen

---

### 4. ThemeContext — not heavy

**File:** `src/theme/ThemeContext.tsx`

- Single `useColorScheme()` subscription shared via context
- One `useMemo` for `isDark` + `colors`
- Good pattern — not a bottleneck

---

### 5. Theme store (MMKV) — minor sync cost on reload

**File:** `src/stores/themeStore.ts`

On module load:

1. `createMMKV({ id: 'ilm-app-storage' })` — native bridge call
2. Zustand `persist` reads JSON from MMKV
3. `onRehydrateStorage` → `Appearance.setColorScheme()` — native bridge

Intentional (no theme flash), but adds sync work on every dev reload. Much smaller than carousel + eager imports.

**Minor redundancy:** `src/app/providers/ThemeProvider.tsx` re-applies theme in `useEffect` on mount even though rehydrate already does it.

---

### 6. NativeWind — moderate runtime cost

**Files:**

- `App.tsx` — `import './global.css'`
- `metro.config.js` — NativeWind transform
- `babel.config.js` — `nativewind/babel`
- Heavy `className` usage on Home, `Screen`, shared `Text`/`DisplayText`

Css-interop resolves `className` + `dark:` variants at render time. The carousel mostly uses `StyleSheet` (good); Home around it leans on NativeWind.

---

### 7. Other notes

| Item | Detail |
|------|--------|
| **Lucide icons** | Many files import icons individually; `profileContent.ts` embeds icon components in static data |
| **No list virtualization** | Search/Home use `.map()` — fine at current size, won't scale |
| **Dead dependency** | `@react-native-async-storage/async-storage` in `package.json` but unused in `src/` |
| **Already good** | `enableScreens` + `enableFreeze`, tab `freezeOnBlur`, Hermes + New Architecture, carousel subcomponents memoized |

---

## Startup call chain (reference)

```
index.js
  → react-native-gesture-handler
  → enableScreens(true) / enableFreeze(true)
  → App.tsx → global.css
  → src/app/App.tsx
      → AppProviders
          → ThemeProvider (imports themeStore / MMKV)
          → ThemeStateProvider
          → GestureHandlerRootView + SafeAreaProvider
      → RootNavigator (eager tab + profile imports)
          → HomeScreen (first tab)
```

---

## Prioritized recommendations

| Priority | Area | Fix | Expected gain |
|----------|------|-----|----------------|
| **P0** | Navigation | Lazy-load tab screens + profile stack with `React.lazy` / dynamic `import()` | Faster reload & cold start (less JS to parse) |
| **P0** | Carousel | Render only 3 pages (prev / current / next), or use a pager library; defer auto-scroll until after first paint (`InteractionManager.runAfterInteractions`) | Faster Home first paint |
| **P1** | Carousel | Simplify auto-scroll — drop `useAnimatedReaction` + dual `scrollX`/`scrollTo` sync; animate scroll offset directly | Less UI-thread work |
| **P1** | Carousel | Memoize `panelOpaqueFill(coverColor, isDark)` per book id | Fewer sync color calculations per render |
| **P1** | Home | Single scroll container; carousel as `ListHeaderComponent` instead of nested vertical + horizontal scrolls | Less nested scroll overhead |
| **P2** | NativeWind | Use `StyleSheet` + `useTheme().colors` on above-the-fold Home UI | Slightly faster renders |
| **P2** | Theme store | Remove duplicate `useEffect` in `ThemeProvider` if rehydrate is reliable | One fewer native bridge call |
| **P2** | Icons | Store icon names in data, map in one registry; defer profile icons | Smaller initial import graph |
| **P2** | Dependencies | Remove unused `@react-native-async-storage/async-storage` | Smaller install/bundle surface |
| **P2** | Lists | Use `FlashList` for Search “All books” when catalog grows | Better scroll performance at scale |

---

## Heaviest first-paint components (quick reference)

| Component | Path | Why heavy |
|-----------|------|-----------|
| `HeroBookCarousel` | `src/features/home/components/HeroBookCarousel.tsx` | 5 pages × 2 animated styles, reaction, shadows, auto-scroll |
| `HomeScreen` | `src/features/home/screens/HomeScreen.tsx` | Carousel + 9 cards + nested scrolls |
| `Screen` (scrollable) | `src/components/layout/index.tsx` | Vertical scroll wrapper + NativeWind |
| `CustomTabBar` | `src/components/navigation/CustomTabBar.tsx` | Always mounted with navigator |
| `ProfileNavigator` import graph | `src/features/profile/navigation/ProfileNavigator.tsx` | Parsed at startup even when tab not visited |

---

## Quick way to confirm

Use these to verify where time is actually spent before implementing fixes.

### 1. Comment out the carousel

In `src/features/home/screens/HomeScreen.tsx`, temporarily remove or comment out `<HeroBookCarousel />` and reload.

- **Reload gets much faster** → carousel is the main first-paint cost
- **Reload still slow** → eager navigation imports / bundle parse is the main cost

### 2. React DevTools Profiler

Profile the first render of `HomeScreen` / `HeroBookCarousel` and compare total commit time with and without the carousel.

### 3. Flipper / RN Performance monitor

Check JS thread blocked time during reload — long blocks before first paint usually mean parse/eval or heavy sync init (MMKV, big module graph).

### 4. Isolate profile imports

Temporarily replace `ProfileNavigator` with a stub screen in `RootNavigator.tsx`. If reload improves noticeably, eager profile stack imports are a major parse-time cost.

---

## Suggested implementation order

1. Lazy-load tab screens and profile stack screens (biggest reload win, no UI change)
2. Carousel windowing (3 pages) + defer auto-scroll (biggest Home paint win)
3. Simplify carousel auto-scroll architecture
4. Flatten Home scroll nesting
5. NativeWind hot-path cleanup and smaller polish items

---

## What's already done well

- Single `useColorScheme()` via `ThemeStateProvider`
- Tab `lazy: true`, `freezeOnBlur: true`, `animation: 'none'`
- `enableScreens` + `enableFreeze` in `index.js`
- Hermes + New Architecture enabled
- Carousel subcomponents use `memo`; carousel uses `StyleSheet` not Tailwind
- `SafeAreaProvider` uses `initialWindowMetrics` to avoid async inset jump
