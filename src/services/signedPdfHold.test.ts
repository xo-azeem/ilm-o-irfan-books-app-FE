import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  REUSE_MARGIN_S,
  createSignedPdfHold,
  usableUntil,
} from './signedPdfHold';

/**
 * A signed PDF URL is a bearer token for a paid book. Holding one for a few
 * seconds is how the open skips a round trip; every rule here is about
 * making sure that never becomes a way to read a book you should not.
 */

type Url = { url: string; expiresIn?: number | null };

/** A fetcher that mints a numbered URL per call and counts the calls. */
function counter(expiresIn: number | null = 300) {
  let calls = 0;
  const fetcher = async (bookId: string): Promise<Url> => {
    calls += 1;
    return { url: `https://storage/${bookId}?token=${calls}`, expiresIn };
  };
  return { fetcher, calls: () => calls };
}

/** A clock the test moves by hand. */
function clock(start = 1_000_000) {
  let t = start;
  return { now: () => t, advance: (ms: number) => (t += ms) };
}

describe('usableUntil', () => {
  it('keeps a margin short of the server’s own expiry', () => {
    assert.equal(usableUntil(0, 300), (300 - REUSE_MARGIN_S) * 1000);
  });

  it('will not reuse a URL from a membership in its last seconds', () => {
    // The server's 15-second floor is inside the margin: never handed out
    // again, so the open asks and the server decides.
    assert.equal(usableUntil(5000, 15), 5000);
    assert.equal(usableUntil(5000, REUSE_MARGIN_S), 5000);
  });

  it('treats a missing or nonsense lifetime as no lifetime', () => {
    for (const bad of [undefined, null, NaN, Infinity, -10, 0]) {
      assert.equal(usableUntil(42, bad as number), 42, String(bad));
    }
  });
});

describe('signed PDF hold', () => {
  it('saves the round trip: a warmed URL is what the open gets', async () => {
    const { fetcher, calls } = counter();
    const hold = createSignedPdfHold(fetcher);
    hold.warm('reader', 'book');
    const url = await hold.take('reader', 'book');
    assert.equal(calls(), 1, 'the open should have reused the warm-up');
    assert.match(url.url, /token=1$/);
  });

  it('joins a warm-up still in flight instead of asking twice', async () => {
    const { fetcher, calls } = counter();
    const hold = createSignedPdfHold(fetcher);
    hold.warm('reader', 'book');
    hold.warm('reader', 'book');
    await hold.take('reader', 'book');
    assert.equal(calls(), 1);
  });

  it('hands a URL out once — a retry gets a new one', async () => {
    const { fetcher, calls } = counter();
    const hold = createSignedPdfHold(fetcher);
    hold.warm('reader', 'book');
    const first = await hold.take('reader', 'book');
    const second = await hold.take('reader', 'book');
    assert.notEqual(first.url, second.url);
    assert.equal(calls(), 2);
  });

  it('never gives one reader’s URL to another', async () => {
    // A subscriber warms a book and signs out; someone without a membership
    // signs in on the same phone inside the URL's life. They must not get it.
    const { fetcher, calls } = counter();
    const hold = createSignedPdfHold(fetcher);
    hold.warm('subscriber', 'book');
    await new Promise(resolve => setImmediate(resolve));
    const theirs = await hold.take('someone-else', 'book');
    assert.equal(calls(), 2, 'the second account must make its own request');
    assert.match(theirs.url, /token=2$/);
  });

  it('lets a URL go stale rather than hand out one about to die', async () => {
    const { fetcher, calls } = counter(300);
    const time = clock();
    const hold = createSignedPdfHold(fetcher, time.now);
    hold.warm('reader', 'book');
    await new Promise(resolve => setImmediate(resolve));
    // Past the server's expiry less the margin.
    time.advance((300 - REUSE_MARGIN_S) * 1000 + 1);
    await hold.take('reader', 'book');
    assert.equal(calls(), 2, 'a URL inside its margin must not be reused');
  });

  it('reuses a URL while it still has life left', async () => {
    const { fetcher, calls } = counter(300);
    const time = clock();
    const hold = createSignedPdfHold(fetcher, time.now);
    hold.warm('reader', 'book');
    await new Promise(resolve => setImmediate(resolve));
    time.advance(60_000); // a minute reading the description
    await hold.take('reader', 'book');
    assert.equal(calls(), 1);
  });

  it('never reuses a last-seconds URL, even straight away', async () => {
    const { fetcher, calls } = counter(15);
    const hold = createSignedPdfHold(fetcher);
    hold.warm('reader', 'book');
    await new Promise(resolve => setImmediate(resolve));
    await hold.take('reader', 'book');
    assert.equal(calls(), 2);
  });

  it('does not let a failed warm-up fail the tap', async () => {
    let calls = 0;
    const hold = createSignedPdfHold(async (bookId: string): Promise<Url> => {
      calls += 1;
      if (calls === 1) throw new Error('network blip');
      return { url: `https://storage/${bookId}?ok`, expiresIn: 300 };
    });
    hold.warm('reader', 'book');
    const url = await hold.take('reader', 'book');
    assert.match(url.url, /\?ok$/);
    assert.equal(calls, 2);
  });

  it('passes a real refusal through, rather than swallowing it', async () => {
    const hold = createSignedPdfHold(async (): Promise<Url> => {
      throw Object.assign(new Error('Active subscription required'), {
        code: 'PREMIUM_REQUIRED',
      });
    });
    hold.warm('reader', 'book');
    await assert.rejects(hold.take('reader', 'book'), /subscription required/);
  });

  it('forgets everything on clear', async () => {
    const { fetcher, calls } = counter();
    const hold = createSignedPdfHold(fetcher);
    hold.warm('reader', 'book');
    await new Promise(resolve => setImmediate(resolve));
    hold.clear();
    await hold.take('reader', 'book');
    assert.equal(calls(), 2);
  });
});
