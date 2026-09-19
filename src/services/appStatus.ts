/**
 * The product flags an admin sets on System → App settings, as every install
 * reads them.
 *
 * One public endpoint, `app-status`, answers with the columns of
 * `app_settings` a reader is allowed to see. The app asks before Home draws
 * and again on every return to the foreground, so a switch flipped in the
 * admin tool reaches a reader within a minute of their next look at the app.
 *
 * Every field has a safe default. A deployment without the endpoint, or a
 * request that fails, leaves the app open: maintenance is something an admin
 * turns on, never something a missing round trip turns on by accident.
 *
 * This module is the pure half — the shape, the defaults and the parser —
 * with nothing native in it, so it can be tested. The read itself is in
 * `appStatusClient.ts`.
 */
export type AppStatus = {
  /** Readers see a notice instead of the app. Admins are never held out. */
  maintenanceMode: boolean;
  /** The notice itself; `null` falls back to the app's own sentence. */
  maintenanceMessage: string | null;
  /** Whether the sign-up form is offered at all. */
  signupEnabled: boolean;
  /** Builds older than this are asked to update. `null` sets no floor. */
  minSupportedVersion: string | null;
  /** Where Help Center writes to. `null` falls back to the bundled address. */
  supportEmail: string | null;
};

export const DEFAULT_APP_STATUS: AppStatus = {
  maintenanceMode: false,
  maintenanceMessage: null,
  signupEnabled: true,
  minSupportedVersion: null,
  supportEmail: null,
};

/** The wire shape — camelCase from the endpoint, snake_case tolerated. */
export type AppStatusPayload = Partial<{
  maintenanceMode: unknown;
  maintenance_mode: unknown;
  maintenanceMessage: unknown;
  maintenance_message: unknown;
  signupEnabled: unknown;
  signup_enabled: unknown;
  minSupportedVersion: unknown;
  min_supported_version: unknown;
  supportEmail: unknown;
  support_email: unknown;
}>;

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export function parseAppStatus(
  payload: AppStatusPayload | null | undefined,
): AppStatus {
  const row = payload ?? {};
  return {
    maintenanceMode: bool(
      row.maintenanceMode ?? row.maintenance_mode,
      DEFAULT_APP_STATUS.maintenanceMode,
    ),
    maintenanceMessage: text(row.maintenanceMessage ?? row.maintenance_message),
    signupEnabled: bool(
      row.signupEnabled ?? row.signup_enabled,
      DEFAULT_APP_STATUS.signupEnabled,
    ),
    minSupportedVersion: text(
      row.minSupportedVersion ?? row.min_supported_version,
    ),
    supportEmail: text(row.supportEmail ?? row.support_email),
  };
}
