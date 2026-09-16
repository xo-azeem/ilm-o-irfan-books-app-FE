import assert from 'node:assert/strict';
import { test } from 'node:test';

import { describeOtpError } from './otpErrors';

test('an expired token is reported as expired', () => {
  const error = Object.assign(new Error('Token has expired or is invalid'), {
    code: 'otp_expired',
  });
  assert.equal(describeOtpError(error).kind, 'expired');
});

test('the resend rate limit is reported as rate limited', () => {
  const error = Object.assign(
    new Error(
      'For security purposes, you can only request this after 30 seconds.',
    ),
    { code: 'over_email_send_rate_limit' },
  );
  assert.equal(describeOtpError(error).kind, 'rate_limited');
});

test('a wrong code is reported as invalid', () => {
  assert.equal(describeOtpError(new Error('Invalid token')).kind, 'invalid');
});

test('anything else keeps its own message', () => {
  const described = describeOtpError(new Error('Network request failed'));
  assert.equal(described.kind, 'other');
  assert.equal(described.message, 'Network request failed');
});
