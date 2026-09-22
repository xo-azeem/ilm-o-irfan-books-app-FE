import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { describeAuthError } from './authErrors';
import { strings } from '@/i18n/strings';

const FALLBACK = 'fallback';
const err = (code: string, message = '') =>
  Object.assign(new Error(message), { code });

describe('describeAuthError, identity linking', () => {
  const s = strings().auth.errors;

  it('says a Google account belongs to someone else, not "sign in instead"', () => {
    // The generic "already exists" wording would send the reader to sign in,
    // when what they have to do is pick a different Google account.
    assert.equal(
      describeAuthError(
        err(
          'identity_already_exists',
          'Identity is already linked to another user',
        ),
        FALLBACK,
      ),
      s.identityTaken,
    );
    assert.notEqual(s.identityTaken, s.emailTaken);
  });

  it('separates "already linked here" from "linked elsewhere"', () => {
    assert.equal(
      describeAuthError(err('', 'Identity is already linked'), FALLBACK),
      s.identityAlreadyLinked,
    );
  });

  it('explains a refused unlink of the last way in', () => {
    assert.equal(
      describeAuthError(
        err(
          'single_identity_not_deletable',
          'User must have at least one identity after unlinking',
        ),
        FALLBACK,
      ),
      s.lastIdentity,
    );
  });

  it('explains an unlink that would change the account address', () => {
    assert.equal(
      describeAuthError(err('email_conflict_identity_not_deletable'), FALLBACK),
      s.unlinkEmailConflict,
    );
  });

  it('reports linking being switched off as a configuration state', () => {
    assert.equal(
      describeAuthError(err('manual_linking_disabled'), FALLBACK),
      s.linkingDisabled,
    );
  });

  it('still reports a plain duplicate signup as a taken email', () => {
    assert.equal(
      describeAuthError(
        err('user_already_exists', 'User already registered'),
        FALLBACK,
      ),
      s.emailTaken,
    );
  });

  it('keeps the network case, which every screen shows', () => {
    assert.equal(
      describeAuthError(new Error('Network request failed'), FALLBACK),
      s.network,
    );
  });

  it('falls back rather than inventing a message', () => {
    assert.equal(describeAuthError(err('', ''), FALLBACK), FALLBACK);
  });
});
