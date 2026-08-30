import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ApiError, isEndpointMissing, readError } from './errors';

describe('api error parsing', () => {
  it('reads the current { error: { code, message } } envelope', () => {
    const error = readError(
      { error: { code: 'PREMIUM_REQUIRED', message: 'Active subscription required' } },
      403,
    );

    assert.equal(error.code, 'PREMIUM_REQUIRED');
    assert.equal(error.message, 'Active subscription required');
    assert.equal(error.status, 403);
    assert.equal(error.fromGateway, false);
  });

  it('still reads the older { error: "text", code } envelope', () => {
    const error = readError({ error: 'Active subscription required', code: 'PREMIUM_REQUIRED' }, 403);

    assert.equal(error.code, 'PREMIUM_REQUIRED');
    assert.equal(error.message, 'Active subscription required');
    assert.equal(error.fromGateway, false);
  });

  it('marks the gateway envelope, which carries no error key', () => {
    const error = readError(
      { code: 'NOT_FOUND', message: 'Requested function was not found' },
      404,
    );

    assert.equal(error.code, 'NOT_FOUND');
    assert.equal(error.fromGateway, true);
  });

  it('falls back to a readable message when the body is unusable', () => {
    assert.equal(readError(null, 500).message, 'Request failed (500).');
    assert.equal(readError({ error: {} }, 500).message, 'Request failed (500).');
  });
});

describe('undeployed endpoint detection', () => {
  // The whole PostgREST fallback hangs off this one predicate: say yes too
  // often and a live endpoint gets retired for the session; say no when the
  // function is absent and the screen shows an error instead of its data.
  it('recognises a function the gateway could not find', () => {
    const error = readError(
      { code: 'NOT_FOUND', message: 'Requested function was not found' },
      404,
    );

    assert.equal(isEndpointMissing(error), true);
  });

  it('does not mistake a handler NOT_FOUND for a missing function', () => {
    // book-detail, profile-update, highlights-upsert and reading-progress all
    // answer exactly this for a row that is not there.
    const error = readError({ error: { code: 'NOT_FOUND', message: 'Book not found' } }, 404);

    assert.equal(error.code, 'NOT_FOUND');
    assert.equal(error.status, 404);
    assert.equal(isEndpointMissing(error), false);
  });

  it('ignores other failures entirely', () => {
    assert.equal(isEndpointMissing(readError({ error: { code: 'FORBIDDEN' } }, 403)), false);
    assert.equal(isEndpointMissing(readError({ code: 'NOT_FOUND' }, 500)), false);
    assert.equal(isEndpointMissing(new Error('boom')), false);
    assert.equal(isEndpointMissing(new ApiError('nope', 404, 'PDF_NOT_AVAILABLE')), false);
  });
});
