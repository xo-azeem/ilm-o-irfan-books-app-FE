# App status (maintenance, sign-ups, version floor)

The switches on **System → App settings** in the admin tool are read by every
install through one public endpoint. This is the contract the app is written
against; the backend implements it in `Ilm-o-Irfan-App-BE`.

## `GET /functions/v1/app-status` — `verify_jwt = false`

Answers the reader-visible columns of `app_settings` (`id = 1`):

```json
{
  "data": {
    "maintenanceMode": false,
    "maintenanceMessage": null,
    "signupEnabled": true,
    "minSupportedVersion": null,
    "supportEmail": "help@ilmoirfan.pk",
    "updatedAt": "2026-09-19T08:00:00Z"
  }
}
```

- Public, cacheable for ~60 s (`Cache-Control: public, max-age=60`).
- snake_case keys are accepted too; blank strings read as `null`.
- **Never** include `featured_collection_id` logic here — Home already gets
  that from `home-feed`.

## What the app does with it

| Field | Reader app | Admin |
| --- | --- | --- |
| `maintenanceMode` + `maintenanceMessage` | Replaces every reader shell with a full-screen notice (`features/status/screens/AppGateScreen.tsx`) with "Try again" and "Contact support". | Never held out — admins bypass so the switch can always be turned off. |
| `minSupportedVersion` | If `app.json → expo.version` is older, the same screen asks to update and links the store. Wins over maintenance. Unparseable values are ignored. | Bypassed. The settings screen warns when the floor is above the build it is running on. |
| `signupEnabled` | `false` hides "Create an account" on Login and the guest panels; the Sign-up screen explains and offers sign-in / browse. | — |
| `supportEmail` | The gate screen's contact address (Help Center keeps reading it from `home-feed`). | — |

Read on launch (`prefetchAppStatus`, under the splash, in parallel with the
feed) and refetched on every return to the foreground (`hooks/useAppStatus.ts`,
stale after 60 s). A project without the endpoint deployed gets the defaults —
everything open — via `withEndpoint`.

**`app.json → expo.version` must be bumped with every store release**: it is
what the version floor is compared against, and what push registration
reports.

## Server-side enforcement the app cannot do

- `signupEnabled = false` only hides the form. Google sign-in on the Login
  screen still creates an account for a new address unless the backend
  refuses it — a `before-user-created` auth hook (or equivalent) reading
  `app_settings.signup_enabled` closes that gap.
- Maintenance is a notice, not a lock. If writes must stop during
  maintenance, the backend has to refuse them.

## Admin push: a deletion request

When a reader files an account-deletion request, admins should get a push
(`kind: account_deletion_requested`, `route: adminDeletions`, data-only apart
from the notification block) to every admin's registered device token. The
app routes the tap to People → Deletions and refreshes the queue; Today also
lists open requests under **Needs you** whether or not the push arrived.
