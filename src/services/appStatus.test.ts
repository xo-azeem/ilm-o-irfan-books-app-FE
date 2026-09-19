import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { DEFAULT_APP_STATUS, parseAppStatus } from './appStatus';

describe('parseAppStatus', () => {
  it('is fully open when the payload is missing or empty', () => {
    assert.deepEqual(parseAppStatus(null), DEFAULT_APP_STATUS);
    assert.deepEqual(parseAppStatus(undefined), DEFAULT_APP_STATUS);
    assert.deepEqual(parseAppStatus({}), DEFAULT_APP_STATUS);
  });

  it('reads the camelCase shape the endpoint answers with', () => {
    assert.deepEqual(
      parseAppStatus({
        maintenanceMode: true,
        maintenanceMessage: 'Back at 9.',
        signupEnabled: false,
        minSupportedVersion: '1.2.0',
        supportEmail: 'help@example.com',
      }),
      {
        maintenanceMode: true,
        maintenanceMessage: 'Back at 9.',
        signupEnabled: false,
        minSupportedVersion: '1.2.0',
        supportEmail: 'help@example.com',
      },
    );
  });

  it('tolerates the snake_case column names', () => {
    const status = parseAppStatus({
      maintenance_mode: true,
      signup_enabled: false,
      min_supported_version: '2.0.0',
    });
    assert.equal(status.maintenanceMode, true);
    assert.equal(status.signupEnabled, false);
    assert.equal(status.minSupportedVersion, '2.0.0');
  });

  it('never lets a non-boolean turn maintenance on', () => {
    assert.equal(
      parseAppStatus({ maintenanceMode: 'true' }).maintenanceMode,
      false,
    );
    assert.equal(parseAppStatus({ maintenanceMode: 1 }).maintenanceMode, false);
    assert.equal(parseAppStatus({ signupEnabled: 'no' }).signupEnabled, true);
  });

  it('turns blank strings into null', () => {
    const status = parseAppStatus({
      maintenanceMessage: '   ',
      minSupportedVersion: '',
      supportEmail: ' ',
    });
    assert.equal(status.maintenanceMessage, null);
    assert.equal(status.minSupportedVersion, null);
    assert.equal(status.supportEmail, null);
  });
});
