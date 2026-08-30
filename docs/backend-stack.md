# Ilm o Irfan — Complete Backend Stack & Cost Guide

> Last updated: July 2026  
> Scope: React Native Islamic e-book app (catalog, reader, offline downloads, auth, subscriptions)  
> Cache layer: **no Redis** in this stack

This document defines the full production stack, what each piece is responsible for, how pieces relate, and estimated costs (accounts, storage, bandwidth, billing fees).

Pricing numbers below are based on public vendor pricing as of July 2026. Always re-check official pages before budgeting:

- [Supabase Pricing](https://supabase.com/pricing)
- [RevenueCat Pricing](https://www.revenuecat.com/pricing)
- [Apple Developer Program](https://developer.apple.com/programs/)
- [Google Play Console](https://play.google.com/console/signup)

---

## 1. Stack at a glance

| Layer | Technology | Purpose |
| --- | --- | --- |
| Mobile app | React Native CLI (existing) | UI, PDF reader, navigation, offline UX |
| Backend platform | **Supabase** | Hosted backend: DB, Auth, Storage, API, Edge Functions |
| Database engine | **PostgreSQL** (inside Supabase) | All structured / relational data |
| Identity | **Supabase Auth** | Email/password, Google, sessions, JWTs |
| Object storage | **Supabase Storage** | Book covers, PDFs, avatars |
| Privileged server logic | **Supabase Edge Functions** | Signed PDF URLs, RevenueCat webhooks |
| Subscriptions / IAP | **RevenueCat** + App Store + Google Play | Purchases, restores, entitlement sync |
| On-device prefs / session | **MMKV** | Theme, auth session, small local cache |
| Offline book files | **Device filesystem** | Downloaded PDFs for offline reading |
| Client fetch cache | **TanStack Query** (recommended) | In-app caching of catalog API responses |
| Client UI state | **Zustand** (already in app) | Auth flag, theme, ephemeral UI state |
| PDF rendering | **react-native-pdf** (+ blob util for downloads) | Open local / streamed PDFs |

**Not in this stack (intentionally):**

| Excluded | Why |
| --- | --- |
| Redis / Upstash | Not needed until high concurrent catalog traffic |
| Custom Node/Nest/Express API | Supabase client + Edge Functions cover needs |
| Firebase / Firestore | Overlaps Supabase; weaker fit for relational catalog |
| Storing PDFs in Postgres | Wrong tool; use object storage |
| Client-side writes to entitlements | Security risk; only webhook / service role |

---

## 2. Critical distinction: Supabase vs PostgreSQL

These are **not two competing backends**.

```text
Supabase  =  the backend platform (the “box”)
├── PostgreSQL          → relational database engine
├── Auth                → users, login, JWTs
├── Storage             → files (covers, PDFs)
├── Auto-generated API  → secure table access from the app
├── Row Level Security  → per-user authorization in the DB
└── Edge Functions      → small Deno/TS server functions
```

| Phrase | Meaning |
| --- | --- |
| “Use PostgreSQL” | Use a **relational database** for books, users, progress, entitlements |
| “Use Supabase” | Use the **hosted platform** that runs that Postgres plus Auth, Storage, APIs, and Functions |

**PostgreSQL = what stores structured data.**  
**Supabase = how you host and securely access that database (and related services).**

You are choosing **Supabase, which uses PostgreSQL** — not “Postgres or Supabase.”

---

## 3. Full architecture

```text
┌─────────────────────────────────────────────────────────────┐
│                     React Native App                        │
│  Screens: Home, Search, Library, Reader, Profile, Auth      │
│  State: Zustand · Cache: TanStack Query · Prefs: MMKV       │
│  Offline PDFs: device filesystem                            │
└───────────────┬─────────────────────────────┬───────────────┘
                │                             │
                │ Supabase JS client          │ RevenueCat SDK
                ▼                             ▼
┌───────────────────────────────┐   ┌─────────────────────────┐
│           Supabase            │   │  App Store / Play Store │
│  Auth · Postgres · Storage    │   │  (billing)              │
│  Edge Functions               │   └───────────┬─────────────┘
└───────────────┬───────────────┘               │
                │                               │ webhooks
                ▼                               ▼
        PostgreSQL tables              RevenueCat
        + Storage buckets        → Edge Function → entitlements
```

### Request paths (every major flow)

| User action | Path |
| --- | --- |
| Browse Home / Explore / Search | App → Supabase API → **PostgreSQL** |
| Open book detail | App → PostgreSQL (`books` + `authors`) |
| Sign up / log in / Google | App → **Supabase Auth** → session in **MMKV** → `profiles` row in PostgreSQL |
| Continue reading / save progress | App → PostgreSQL `reading_progress` (+ optional MMKV mirror) |
| Wishlist | App → PostgreSQL `wishlist` |
| Buy Premium | App → **RevenueCat** → Store billing → RevenueCat webhook → **Edge Function** → PostgreSQL `entitlements` |
| Download / open PDF | App → **Edge Function** (auth + entitlement, or admin / free-PDF flag) → **Storage** signed URL → download to **device FS** → `react-native-pdf` |
| Show subscription status | App → PostgreSQL `entitlements` (+ RevenueCat SDK for paywall UI) |
| Theme / offline prefs | **MMKV** only |

---

## 4. Component-by-component detail

### 4.1 React Native app (already built)

**Owns:**

- All UI (Home, Search, Library, Book Detail, Reader, Profile, Auth)
- PDF viewing (`react-native-pdf`)
- Local theme + session persistence (MMKV)
- Calling Supabase / RevenueCat SDKs
- Downloading PDFs to local disk for offline use

**Does not own:**

- Source of truth for catalog, users, subscriptions
- Permanent PDF hosting
- Payment processing

---

### 4.2 Supabase (backend platform)

**Owns the entire cloud backend** for this project:

| Supabase product | Used for |
| --- | --- |
| Project / org | Environment (dev / prod) |
| PostgreSQL | All tables (see §5) |
| Auth | Identity & sessions |
| Storage | Covers, PDFs, avatars |
| PostgREST / client API | CRUD from RN with RLS |
| Edge Functions | Privileged operations |
| Dashboard | Schema, policies, logs, users |
| (Optional) Realtime | Later: live progress sync — not required at launch |

One Supabase project is enough to start. Use separate projects (or branches) for staging vs production when you ship.

---

### 4.3 PostgreSQL (database engine inside Supabase)

**Single source of truth for structured data.**

#### Catalog

| Table | Stores |
| --- | --- |
| `authors` | Author name, bio, avatar path |
| `books` | Title, description, genre, rating, price, format, cover/pdf paths, premium flag, publish state, file size, colors, tags |
| `categories` | Explore categories (label, slug, accents, icon key) |
| `book_categories` | Many-to-many book ↔ category |
| `collections` | Hero carousel, curated shelves |
| `collection_books` | Books inside a collection + sort order |

#### Users

| Table | Stores |
| --- | --- |
| `profiles` | `id` = `auth.users.id`, name, email, avatar, member-since, **`role` (`user` \| `admin`)** |

#### Personal library

| Table | Stores |
| --- | --- |
| `reading_progress` | Page, %, chapter label, last read time |
| `wishlist` | Saved books |
| `downloads` | **Metadata only** (status, size, downloaded_at) — not the PDF bytes |
| `highlights` | Optional notes / highlights |
| `reading_streaks` | Optional day-streak for profile stats |

#### Subscriptions

| Table | Stores |
| --- | --- |
| `plans` | Premium plan definition (price, interval, feature list JSON) |
| `entitlements` | Whether this user is active Premium (status, expiry, RevenueCat ids) |

#### What must never live in Postgres

- PDF file bytes
- Cover image bytes (store path only; file in Storage)
- Long-lived secrets in client-readable rows

#### Performance without Redis

- Indexes on published books, search (`ilike` / FTS / `pg_trgm`), `reading_progress(user_id, last_read_at)`, wishlist, collections
- Lean list payloads (id, title, author, cover URL, rating, tag) — not full descriptions/PDF paths on Home
- Client cache via TanStack Query

---

### 4.4 Supabase Auth

**Owns identity.**

| Concern | Detail |
| --- | --- |
| Providers | Email/password + Google (matches existing Login/SignUp UI) |
| Sessions | JWT access + refresh tokens |
| App persistence | Store session via Supabase client + **MMKV** storage adapter |
| Profile bootstrap | DB trigger / function creates `profiles` row on signup |
| Authorization pairing | JWT `sub` = `profiles.id` = RLS `auth.uid()` |

Auth does **not** store book catalog or subscription plan catalogs (those are Postgres tables).

---

### 4.5 Supabase Storage

**Owns binary files.**

| Bucket | Access | Contents |
| --- | --- | --- |
| `covers` | Public read (or CDN-friendly) | Book cover images |
| `pdfs` | **Private** | Book PDF files |
| `avatars` | Private (owner only) | User profile photos |

Rules:

- DB columns store **paths** (`cover_path`, `pdf_path`), never blobs
- Premium / all PDFs served via **short-lived signed URLs** from an Edge Function after entitlement checks
- After download, the app keeps the file on **device filesystem**; Storage is not required to re-read every page turn offline

---

### 4.6 Supabase Edge Functions

**Owns privileged server-side logic** the client must not control.

| Function | Responsibility |
| --- | --- |
| `get-signed-pdf` | Verify JWT → load book → allow if **admin**, **env/DB free-PDF flag**, or **active entitlement** (admins may preview drafts) → return signed Storage URL |
| `revenuecat-webhook` | Verify webhook → upsert `entitlements` with service role |
| (in-app admin CMS) | Authenticated admins mutate catalog via RLS (`is_admin()` from JWT `app_metadata.app_role`); cover/PDF uploads go to Storage |

Normal catalog reads/writes do **not** need Edge Functions — use the Supabase client + RLS.

### Admin CMS surface

The admin panel reads through `admin_*` views and writes through `admin_*` SECURITY DEFINER RPCs.
See [schema.md](./schema.md#admin-cms-v2) for the full list. Notes that affect the client:

- `books.published_at` is stamped by a trigger. Never send it from the app.
- Bulk publish silently skips titles with no `pdf_path`; the RPC returns `{ updated, skipped }`.
- Admin PDF/cover uploads bypass `supabase-js` and stream through `react-native-blob-util`, because
  the shared client aborts after 12s and buffers the whole body in memory.
- Every catalog, plan, settings, and role write lands in `admin_audit_log`.

---

### 4.7 RevenueCat + App Store + Google Play

**Owns money movement and store compliance.**

| Piece | Role |
| --- | --- |
| App Store / Play Billing | Actually charge the user |
| RevenueCat | Cross-platform IAP SDK, receipt validation, paywalls, analytics, webhooks |
| Supabase `entitlements` | App’s own “is Premium?” source of truth after webhook sync |

Flow:

1. User taps Subscribe in app  
2. RevenueCat presents store purchase  
3. Store charges user (Apple/Google take commission)  
4. RevenueCat notifies your webhook  
5. Edge Function updates `entitlements`  
6. App gates downloads / offline / premium books using Postgres entitlement  

Do **not** implement raw store receipt validation yourself unless you have a strong reason.

---

### 4.8 MMKV (on device)

**Owns tiny, fast local key-value data.**

| Data | Why MMKV |
| --- | --- |
| Theme preference | Already in app |
| Auth session | Survive relaunch |
| Optional last-read snapshot | Instant resume before network sync |

Not for: full catalog, PDF binaries, billing ledger.

---

### 4.9 Device filesystem (on device)

**Owns offline PDF bytes.**

| Data | Notes |
| --- | --- |
| `{bookId}.pdf` (or hashed name) | Downloaded via signed URL |
| Local path passed to `react-native-pdf` | Offline-capable |

Postgres `downloads` only tracks that the user downloaded a book (for sync UI / reinstall restore prompts), not the file itself.

---

### 4.10 TanStack Query + Zustand

| Library | Role |
| --- | --- |
| **TanStack Query** | Fetch books/collections; cache in memory; stale-while-revalidate; retry |
| **Zustand** | UI/auth/theme stores (already present) |

Together they replace “Redis for feeling fast” at early scale.

---

## 5. Data model summary (Postgres)

```text
auth.users 1──1 profiles
profiles 1──* reading_progress *──1 books
profiles 1──* wishlist         *──1 books
profiles 1──* downloads        *──1 books
profiles 1──* highlights       *──1 books
profiles 1──1 entitlements     *──1 plans

authors 1──* books
books *──* categories    (book_categories)
books *──* collections   (collection_books)

books.cover_path → Storage bucket covers/
books.pdf_path   → Storage bucket pdfs/
```

### Suggested RLS summary

| Data | Policy idea |
| --- | --- |
| Published books / categories / collections / plans | Public `SELECT` |
| `profiles` | User reads/updates own contact fields (`role` is not client-writable); admins can `SELECT` all |
| Progress, wishlist, downloads, highlights | User CRUD own rows only |
| `entitlements` | User `SELECT` own; admins `SELECT` all; writes only via service role (webhook) |
| Catalog writes + unpublished rows | Admin JWT (`is_admin()`) only |

---

## 6. Feature → stack map (nothing left out)

| App feature | Primary systems |
| --- | --- |
| Home hero carousel | PostgreSQL `collections` + `books`; covers from Storage |
| Explore categories | PostgreSQL `categories` |
| Search | PostgreSQL `books` (+ author join), indexed text search |
| Book detail | PostgreSQL `books` + `authors`; entitlement for CTA |
| PDF reader | Device FS and/or signed Storage URL; `react-native-pdf` |
| Reading progress / Continue | PostgreSQL `reading_progress`; optional MMKV cache |
| My Library shelves | Derived from progress / wishlist / downloads / highlights |
| Wishlist | PostgreSQL `wishlist` |
| Downloads screen | Device FS + PostgreSQL `downloads` metadata |
| Offline reading | Device FS PDF; entitlement checked at download time |
| Login / Sign up / Google | Supabase Auth + `profiles` |
| Profile screen | `profiles` + aggregated stats |
| Theme | MMKV / Zustand |
| Subscription screen | `plans` + `entitlements` + RevenueCat paywall |
| Premium gating | `entitlements` + Edge Function; bypass via admin role, `ALLOW_PDF_WITHOUT_ENTITLEMENT` env, or `app_settings.allow_pdf_without_entitlement` |
| Push / email marketing | **Out of scope for v1** (add later if needed) |
| Admin CMS for uploading books | **In-app admin panel** (admins routed there on login); RLS + Storage policies |
| Analytics | Start with store + RevenueCat; optional product analytics later |
| CDN | Supabase Storage CDN (Smart CDN on Pro) for covers/PDF egress |

---

## 7. Cost guide

Costs fall into five buckets:

1. **Backend platform** (Supabase)  
2. **Subscriptions middleware** (RevenueCat)  
3. **Store accounts** (Apple / Google)  
4. **Store commissions** (revenue share on IAP)  
5. **Optional / later** (domains, email, analytics, Redis)

All figures USD unless noted. PKR conversion depends on exchange rate.

---

### 7.1 Supabase

#### Free plan — `$0 / month`

Good for: development, demos, very early private testing.

| Included (Free) | Limit |
| --- | --- |
| API requests | Unlimited |
| Monthly active users (Auth) | 50,000 |
| Database size | **500 MB** |
| File storage | **1 GB** |
| Egress (uncached) | **5 GB** |
| Cached egress | **5 GB** |
| Edge Function invocations | **500,000** |
| Active free projects | 2 |
| Max file upload | 50 MB |

**Important Free caveats for this app:**

- Projects can **pause after ~1 week of inactivity**
- **1 GB file storage** is tight once you host many PDFs
- **~10 GB total egress** is easy to blow through if users download multi‑MB PDFs
- Max upload **50 MB** may block larger book PDFs

#### Pro plan — from **`$25 / month`** (recommended for production)

| Included (Pro) | Limit / overage |
| --- | --- |
| Monthly active users | 100,000 then ~`$0.00325` / MAU |
| Database disk | **8 GB** included, then ~`$0.125` / GB |
| File storage | **100 GB** included, then ~`$0.0213` / GB |
| Egress (uncached) | **250 GB** then ~`$0.09` / GB |
| Cached egress | **250 GB** then ~`$0.03` / GB |
| Edge Function invocations | **2 million** then ~`$2` / million |
| Daily backups | 7 days |
| Max upload | much higher (suitable for large PDFs) |
| Support | Email |

**Also budget for compute:**

- Supabase bills compute separately from the $25 platform fee on paid orgs.
- Small compute is commonly on the order of **~$10–$15 / month** effective after credits (varies by instance size). Treat **~$25–$45 / month** as a realistic early Pro total before heavy overages.

Enable **spend caps** on Pro while validating traffic so surprise egress bills don’t appear.

#### Team / Enterprise

Not needed until you need SSO, bigger org controls, or negotiated limits. Team is listed publicly around **`$599 / month`**. Skip for now.

---

### 7.2 Storage sizing for *this* book app

Estimate before you pick Free vs Pro.

| Asset | Typical size | Notes |
| --- | --- | --- |
| Cover image (compressed WebP/JPEG) | 50–200 KB | Cheap |
| Book PDF | **5–25 MB** common; some 50+ MB | Dominant cost |
| Avatar | < 1 MB | Negligible |

**Catalog storage examples**

| Library size | Avg PDF 10 MB | Storage used (PDFs only) |
| --- | --- | --- |
| 50 books | 10 MB | ~0.5 GB → fits Free storage |
| 100 books | 10 MB | ~1 GB → Free storage ceiling |
| 500 books | 10 MB | ~5 GB → needs Pro |
| 2,000 books | 10 MB | ~20 GB → still inside Pro’s 100 GB |
| 2,000 books | 25 MB | ~50 GB → still inside Pro’s 100 GB |

Covers for 2,000 books at 150 KB ≈ **0.3 GB** — small next to PDFs.

**Egress (bandwidth) examples** — this is usually the bigger bill than storage:

| Event | Data moved |
| --- | --- |
| User downloads one 10 MB PDF | ~10 MB egress |
| 1,000 downloads of 10 MB PDFs | ~10 GB |
| 10,000 downloads of 10 MB PDFs | ~100 GB |
| 50,000 downloads of 10 MB PDFs | ~500 GB → Pro overage territory |

Mitigations (built into this architecture):

- Download once → keep on **device FS** (don’t re-stream every open)
- Prefer compressed PDFs / reasonable scan DPI
- Use Storage CDN / cached egress where possible
- Only entitled users get signed URLs (reduces hotlinking abuse)

---

### 7.3 RevenueCat

| Situation | Cost |
| --- | --- |
| Monthly Tracked Revenue (MTR) ≤ **$2,500** | **$0** |
| MTR above $2,500 | **1% of MTR** for that billing cycle |

Examples:

| Your MTR | RevenueCat fee |
| --- | --- |
| $0 (pre-launch) | $0 |
| $1,000 | $0 |
| $2,500 | $0 |
| $5,000 | ~$50 |
| $10,000 | ~$100 |

No separate “storage” fee at RevenueCat — it tracks subscriptions, not your PDFs.

---

### 7.4 Store developer accounts (required to sell subscriptions)

| Account | Fee | Cadence |
| --- | --- | --- |
| Google Play Console | **$25** | One-time |
| Apple Developer Program | **$99** | Per year |

Year-1 store accounts if you ship both platforms: **~$124**.  
Ongoing (iOS only): **$99 / year**.

Android-only launch: **$25** once.

---

### 7.5 Store commissions (largest “cost” on revenue)

These are **not SaaS bills** — they are cuts of subscription revenue.

| Platform | Typical digital goods / subscription cut | Notes |
| --- | --- | --- |
| Apple App Store | **15% or 30%** | Often 15% under Small Business Program (&lt; $1M/year) and/or after year-1 subscription rates for qualifying subs |
| Google Play | Commonly on the order of **~10–30%** depending on program, transaction type, and region; subscriptions often at lower recurring rates than one-time IAP historically — **verify current Play fee schedule for your country** | Policy has been changing; check Play Console docs at launch |

**Example (simplified):**  
Premium = Rs 1,499 / month.  
If the store takes ~15%, you keep ~85% before RevenueCat (if any) and tax.

Always model **net revenue after store cut**, not list price.

---

### 7.6 Optional costs (not required for core stack)

| Item | When | Typical cost |
| --- | --- | --- |
| Custom domain for links / auth email branding | Nice-to-have | Domain ~$10–20 / year |
| Custom SMTP (Resend, etc.) | If Auth email deliverability matters | Often free tier → low tens $/mo |
| Product analytics (PostHog, etc.) | After launch | Free tiers available |
| Error monitoring (Sentry) | Recommended | Free tier → paid as volume grows |
| Redis / Upstash | Only if catalog caching needed later | Free tier → paid |
| Extra Supabase compute size | High DB load | Scales with instance |
| CI artifacts / EAS-like services | If you adopt cloud builds later | Varies (not required for RN CLI local builds) |

---

## 8. Scenario budgets

### Scenario A — Build & internal testing (now)

| Item | Monthly | One-time / yearly |
| --- | --- | --- |
| Supabase Free | $0 | — |
| RevenueCat | $0 | — |
| Store accounts | — | defer until release |
| **Total** | **~$0** | **$0** |

Risks: Free pause + 1 GB storage + low egress. Fine for mock→real wiring with a few sample PDFs.

### Scenario B — Soft launch / production (recommended)

| Item | Estimate |
| --- | --- |
| Supabase Pro (+ small compute) | **$25–$45 / mo** |
| RevenueCat (under $2.5k MTR) | **$0** |
| Google Play | **$25 once** |
| Apple Developer | **$99 / year** (if iOS) |
| **Steady monthly (excl. store cuts)** | **~$25–$45** |
| **Year-1 fixed accounts (both stores)** | **~$124** |

Fits: hundreds of books, early subscribers, downloads kept mostly on-device after first fetch.

### Scenario C — Growth (many downloads)

Assume Pro base **~$35**, plus egress overage if PDF traffic is heavy.

| Extra usage | Extra monthly cost (approx.) |
| --- | --- |
| +100 GB uncached egress | ~$9 |
| +100 GB cached egress | ~$3 |
| +50 GB file storage beyond 100 GB | ~$1.07 |
| RevenueCat at $8k MTR | ~$80 (1%) |

At this stage, optimize PDF size and ensure clients don’t re-download existing files.

---

## 9. What you pay for vs what users pay for

| Cost type | Who pays | Examples |
| --- | --- | --- |
| Infrastructure | You | Supabase, domains, monitoring |
| Store accounts | You | Apple $99/yr, Play $25 once |
| IAP commission | Taken from subscription price | Apple/Google cut |
| RevenueCat | You (only after $2.5k MTR) | 1% of tracked revenue |
| End-user subscription | User | Rs 1,499 Premium (example) |

---

## 10. Recommended rollout spend plan

| Phase | Stack live | Spend target |
| --- | --- | --- |
| 1. Wire Auth + books tables | Supabase Free | $0 |
| 2. Upload sample covers/PDFs | Free until storage/egress hurts | $0 |
| 3. Entitlements + RevenueCat sandbox | Free | $0 |
| 4. Public launch | **Upgrade Supabase Pro**; register stores | ~$25–45/mo + account fees |
| 5. Scale | Watch egress; add Redis only if needed | Variable |

---

## 11. Final stack checklist (complete)

**Cloud**

- [x] Supabase project  
- [x] PostgreSQL schema (catalog, users, library, plans, entitlements)  
- [x] Supabase Auth (email + Google)  
- [x] Supabase Storage (`covers`, `pdfs`, `avatars`)  
- [x] Edge Functions (signed PDF + RevenueCat webhook)  
- [x] RLS on all user tables  

**Billing**

- [x] RevenueCat  
- [x] App Store Connect products (if iOS)  
- [x] Play Console subscriptions (if Android)  

**Client**

- [x] React Native app  
- [x] Supabase JS client  
- [x] RevenueCat SDK  
- [x] TanStack Query  
- [x] Zustand  
- [x] MMKV  
- [x] Device FS downloads  
- [x] react-native-pdf  

**Explicitly deferred**

- [ ] Redis  
- [ ] Custom Node API  
- [ ] Firebase  

---

## 12. One-paragraph summary

Ilm o Irfan’s backend is **Supabase**. Inside it, **PostgreSQL** stores every structured record (books, users, progress, wishlist, downloads metadata, plans, entitlements). **Supabase Auth** handles identity; **Supabase Storage** holds covers and PDFs; **Edge Functions** issue signed PDF URLs and sync **RevenueCat** purchases into entitlements. The phone keeps sessions/theme in **MMKV** and offline books on the **filesystem**. **TanStack Query** and **Zustand** keep the UI fast without Redis. Expected launch cost is about **$0 on Free during build**, then roughly **$25–$45/month on Supabase Pro**, plus **$25 once (Play)** and **$99/year (Apple)** if you ship both stores, with **RevenueCat free until ~$2,500 MTR**, and store commissions taken from subscription revenue.
