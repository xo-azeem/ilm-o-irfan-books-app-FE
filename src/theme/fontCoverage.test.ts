import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

/** The faces the app bundles, as `app.json`/`react-native.config.js` ship them. */
export const BUNDLED_FONTS = [
  'assets/fonts/Newsreader16pt-Regular.ttf',
  'assets/fonts/Newsreader16pt-SemiBold.ttf',
  'assets/fonts/DMSans-Regular.ttf',
  'assets/fonts/DMSans-Medium.ttf',
  'assets/fonts/DMSans-Bold.ttf',
] as const;

/**
 * The code points a TrueType file can draw.
 *
 * Only formats 4 and 12 are read, which between them cover every face here
 * and essentially every font shipped this century.
 */
export function cmapOf(file: string): Set<number> {
  const b = fs.readFileSync(file);
  const chars = new Set<number>();

  const numTables = b.readUInt16BE(4);
  let cmapOff: number | null = null;
  for (let i = 0; i < numTables; i += 1) {
    const rec = 12 + i * 16;
    if (b.toString('ascii', rec, rec + 4) === 'cmap') {
      cmapOff = b.readUInt32BE(rec + 8);
    }
  }
  if (cmapOff === null) return chars;

  const subtables = b.readUInt16BE(cmapOff + 2);
  for (let i = 0; i < subtables; i += 1) {
    const off = cmapOff + b.readUInt32BE(cmapOff + 4 + i * 8 + 4);
    const format = b.readUInt16BE(off);

    if (format === 4) {
      const segX2 = b.readUInt16BE(off + 6);
      const endO = off + 14;
      const startO = endO + segX2 + 2;
      const deltaO = startO + segX2;
      const rangeO = deltaO + segX2;
      for (let s = 0; s < segX2 / 2; s += 1) {
        const end = b.readUInt16BE(endO + s * 2);
        const start = b.readUInt16BE(startO + s * 2);
        if (start === 0xffff) continue;
        const delta = b.readInt16BE(deltaO + s * 2);
        const rangeOff = b.readUInt16BE(rangeO + s * 2);
        for (let c = start; c <= end && c !== 0x10000; c += 1) {
          // Glyph ids are uint16 and the spec defines idDelta arithmetic as
          // modulo 65536 — the mask is the format, not a shortcut.
          /* eslint-disable no-bitwise */
          let g: number;
          if (rangeOff === 0) {
            g = (c + delta) & 0xffff;
          } else {
            const gi = rangeO + s * 2 + rangeOff + (c - start) * 2;
            if (gi + 1 >= b.length) continue;
            g = b.readUInt16BE(gi);
            if (g !== 0) g = (g + delta) & 0xffff;
          }
          /* eslint-enable no-bitwise */
          if (g !== 0) chars.add(c);
        }
      }
    } else if (format === 12) {
      const groups = b.readUInt32BE(off + 12);
      for (let gi = 0; gi < groups; gi += 1) {
        const g = off + 16 + gi * 12;
        const start = b.readUInt32BE(g);
        const end = b.readUInt32BE(g + 4);
        for (let c = start; c <= end && c - start < 0x10000; c += 1) {
          chars.add(c);
        }
      }
    }
  }
  return chars;
}

/**
 * Source with its comments removed, so a symbol explained in a comment is not
 * mistaken for one the app draws.
 *
 * A small state machine rather than a regex: a `//` inside a string literal is
 * not a comment, and this file's own prose is full of the characters being
 * searched for.
 */
export function stripComments(src: string): string {
  let out = '';
  let i = 0;
  type State = 'code' | 'line' | 'block' | 'single' | 'double' | 'tick';
  let state: State = 'code';

  while (i < src.length) {
    const c = src[i];
    const next = src[i + 1];

    if (state === 'code') {
      if (c === '/' && next === '/') {
        state = 'line';
        i += 2;
        continue;
      }
      if (c === '/' && next === '*') {
        state = 'block';
        i += 2;
        continue;
      }
      if (c === "'") state = 'single';
      else if (c === '"') state = 'double';
      else if (c === '`') state = 'tick';
      out += c;
      i += 1;
      continue;
    }

    if (state === 'line') {
      if (c === '\n') {
        state = 'code';
        out += c;
      }
      i += 1;
      continue;
    }

    if (state === 'block') {
      if (c === '*' && next === '/') {
        state = 'code';
        i += 2;
      } else {
        // Keep newlines so reported line numbers stay honest.
        if (c === '\n') out += c;
        i += 1;
      }
      continue;
    }

    // Inside a string literal: copy it, honouring escapes, until it closes.
    out += c;
    if (c === '\\') {
      if (next !== undefined) out += next;
      i += 2;
      continue;
    }
    if (
      (state === 'single' && c === "'") ||
      (state === 'double' && c === '"') ||
      (state === 'tick' && c === '`')
    ) {
      state = 'code';
    }
    i += 1;
  }

  return out;
}

/**
 * Characters that would be drawn as a mark rather than read as prose.
 *
 * Arrows, box drawing, geometric shapes, dingbats, maths operators. Urdu and
 * Arabic are excluded: they have their own face (Noto Nastaliq) and their own
 * path through the type stack.
 */
// Built from escapes rather than written literally, so this module does not
// itself contain the characters it exists to find.
export const SYMBOL_RANGE = new RegExp('[\\u2190-\\u2BFF]', 'u');

/** Punctuation the text faces do carry, and which reads as prose, not a mark. */
export const PROSE_PUNCTUATION = new Set([
  '–', // en dash
  '—', // em dash
  '‘',
  '’', // quotes
  '“',
  '”',
  '•', // bullet
  '…', // ellipsis
  '™', // trademark
  '−', // minus
]);



/**
 * No user-facing string may contain a mark the bundled faces cannot draw.
 *
 * This is here because a missing glyph fails silently. `∞` on the Home
 * membership band, `✓` on a selected chip, `✕` on a filter's dismiss, `★`
 * beside "Rate the app" and `☾` on the night-reader medal were all drawn as
 * characters by code that type-checked, linted and rendered without a
 * complaint — and every one of them came out of the build as an empty box.
 *
 * The rule is simple: marks come from the icon set, which is vector and
 * complete. If a symbol has to be text, the font has to have it, and this
 * proves whether it does.
 */

const ROOT = path.resolve(__dirname, '..', '..');

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...sourceFiles(p));
    else if (/\.(ts|tsx)$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) {
      out.push(p);
    }
  }
  return out;
}

describe('bundled fonts cover every mark the app draws', () => {
  const coverage = new Map<string, Set<number>>();
  for (const rel of BUNDLED_FONTS) {
    const file = path.join(ROOT, rel);
    assert.ok(fs.existsSync(file), `bundled font missing from disk: ${rel}`);
    coverage.set(rel, cmapOf(file));
  }

  it('reads a real cmap out of each face', () => {
    for (const [rel, chars] of coverage) {
      // A face that parsed to nothing would make this whole suite vacuous.
      assert.ok(chars.size > 100, `${rel}: only ${chars.size} glyphs parsed`);
      assert.ok(chars.has('A'.codePointAt(0)!), `${rel}: no capital A`);
      assert.ok(chars.has('0'.codePointAt(0)!), `${rel}: no digit zero`);
    }
  });

  it('knows the glyphs that were missing before, so the test can fail', () => {
    // The five that shipped broken. If a future font swap adds them this
    // assertion is what says so — at which point they may go back into text.
    const newsreader = coverage.get('assets/fonts/Newsreader16pt-Regular.ttf')!;
    assert.equal(newsreader.has(0x221e), false, '∞ unexpectedly present');
    assert.equal(newsreader.has(0x2605), false, '★ unexpectedly present');
  });

  it('draws no symbol it cannot render, anywhere in src', () => {
    const offences: string[] = [];

    for (const file of sourceFiles(path.join(ROOT, 'src'))) {
      const code = stripComments(fs.readFileSync(file, 'utf8'));
      const lines = code.split('\n');

      lines.forEach((line, index) => {
        for (const ch of line) {
          if (!SYMBOL_RANGE.test(ch) || PROSE_PUNCTUATION.has(ch)) continue;
          const cp = ch.codePointAt(0)!;
          const missing = [...coverage.entries()]
            .filter(([, chars]) => !chars.has(cp))
            .map(([rel]) => path.basename(rel));
          if (missing.length === 0) continue;
          const where = path.relative(ROOT, file).split(path.sep).join('/');
          offences.push(
            `${where}:${index + 1} draws ${ch} (U+${cp
              .toString(16)
              .toUpperCase()
              .padStart(4, '0')}) — missing from ${missing.join(', ')}`,
          );
        }
      });
    }

    assert.deepEqual(
      offences,
      [],
      `Symbols the bundled fonts cannot draw. Use an icon from ` +
        `lucide-react-native instead:\n${offences.join('\n')}`,
    );
  });
});
