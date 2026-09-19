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

- Public, **not** cached: the app appends `?t=<now>` to every read.
- snake_case keys are accepted too; blank strings read as `null`.
- **Never** include `featured_collection_id` logic here — Home already gets
  that from `home-feed`.

## What the app does with it

| Field | Reader app | Admin |
| --- | --- | --- |
| `maintenanceMode` + `maintenanceMessage` | Replaces every reader shell with a full-screen notice (`features/status/screens/AppGateScreen.tsx`) with "Try again" and "Contact support". | Never held out — admins bypass so the switch can always be turned off. A signed-out admin uses **Admin sign-in** on the notice: it mounts the reader shell on Login (signing out a reader session first), and the notice returns as soon as the route leaves the auth screens or a session resolves as a reader. |
| `minSupportedVersion` | If `app.json → expo.version` is older, the same screen asks to update and links the store. Wins over maintenance. Unparseable values are ignored. | Bypassed. The settings screen warns when the floor is above the build it is running on. |
| `signupEnabled` | `false` hides "Create an account" on Login and the guest panels; the Sign-up screen explains and offers sign-in / browse. | — |
| `supportEmail` | The gate screen's contact address (Help Center keeps reading it from `home-feed`). | — |

Read on launch (`prefetchAppStatus`, under the splash, in parallel with the
feed), on every return to the foreground (always, regardless of staleness),
once a minute while the app is open, and every 20 s while the notice is up
(`hooks/useAppStatus.ts`) — so maintenance turned off lets every held reader
back in within about 20 s with their session intact, and maintenance turned on
reaches a reader mid-session within a minute. The last server answer is kept
in a store outside the query cache, so the account-change cache clear (sign-in,
sign-out) never makes the gate blink off. A project without the endpoint
deployed gets the defaults — everything open — via `withEndpoint`; an offline
read keeps the last answer.

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
