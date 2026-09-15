# Delete account button → Google Form

**Status:** docs only — not implemented yet. Do not push until product asks for the code change.  
**Play Console Delete account URL:** same form (store listing link).

Form (public):

```text
https://docs.google.com/forms/d/e/1FAIpQLSeOHzct520KXqfinzHNx46H8Wwp1vhDGkEjrF6rGLK7yTUQ1w/viewform?usp=header
```

Support contact on the form: `ilmoirfan@gmail.com`.

---

## Best spot in the app

**Use the existing control — do not add a second button.**

| Item | Location |
| --- | --- |
| Settings row | Profile → **Privacy & security** |
| Screen | `src/features/profile/screens/PrivacySecurityScreen.tsx` |
| Nav entry | Profile Settings → `row-privacy` → `PrivacySecurity` (`profileContent.ts`) |
| UI already there | Danger `Button` labeled **Delete account** at the bottom of that screen |

That screen already states it is where store review expects account deletion. The button currently opens a **stub** confirm dialog (`handleDelete`) and does **not** open the form or delete anything in Supabase.

**Why this spot**
- Matches Play / App Store expectation: Privacy / Account management, not buried under Help.
- Already linked from Profile settings.
- Keeps one destructive action in one place (next to legal + account security).

**Avoid**
- Putting “Delete account” on the main Profile list next to Sign out (easy mis-tap).
- Only linking from Help Center (harder for reviewers to find).
- Adding a second delete button elsewhere.

Optional later: a short FAQ row in Help Center (“How do I delete my account?”) that navigates to Privacy & security — not a second form opener.

---

## What to change (when implementing)

### 1. Constant for the form URL

In `PrivacySecurityScreen.tsx` (same pattern as `PRIVACY_POLICY_URL` / `TERMS_URL`):

```ts
const DELETE_ACCOUNT_FORM_URL =
  'https://docs.google.com/forms/d/e/1FAIpQLSeOHzct520KXqfinzHNx46H8Wwp1vhDGkEjrF6rGLK7yTUQ1w/viewform?usp=header';
```

Prefer putting this in `src/config/env.ts` or a small `src/constants/links.ts` if you want one place for store / legal URLs.

### 2. Replace stub `handleDelete`

Keep a confirm dialog, then open the form with `Linking.openURL` (reuse `openUrl`):

```ts
const handleDelete = useCallback(() => {
  showDialog({
    title: 'Delete account?',
    message:
      'You will be taken to a form to request deletion. We delete your account and app data within 30 days and confirm by email. Purchase records may be kept by Google Play / RevenueCat as required by law.',
    icon: Trash2,
    actions: [
      { label: 'Cancel', style: 'cancel' },
      {
        label: 'Continue',
        style: 'destructive',
        onPress: () => openUrl(DELETE_ACCOUNT_FORM_URL),
      },
    ],
  });
}, [openUrl]);
```

Do **not** call `signOut` or claim “already deleted” in-app until ops actually deletes the Auth user.

### 3. Ops after a form submission

1. Find the user by the email they entered on the form.  
2. Delete them in Supabase Auth (cascades profile / reading data in our schema).  
3. Reply from `ilmoirfan@gmail.com` confirming deletion.  
4. Note: Play / RevenueCat may retain billing records (as disclosed on the form).

There is no automated Edge Function for “delete my account” yet; the form is the request channel.

---

## Play Console

| Field | Value |
| --- | --- |
| Delete account URL | Same Google Form link as above |
| In-app path for reviewers | Profile → Privacy & security → Delete account |

Keep the form **public** (no Google sign-in required to submit). Test in an Incognito window.

---

## Checklist before shipping the code change

- [ ] Branch off `dev` (e.g. `feat/delete-account-form`) — do not commit straight to `dev` without a PR  
- [ ] Wire `PrivacySecurityScreen` Delete account → confirm → form URL  
- [ ] Tap through on Android / iOS; form opens in browser  
- [ ] Form still matches store listing URL  
- [ ] After first real request, confirm Auth delete + email reply process works  

**Out of scope for the first pass:** automatic account deletion API, signing the user out immediately, or wiping local MMKV/vault without a server delete.
