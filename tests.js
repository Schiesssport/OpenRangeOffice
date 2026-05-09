// Run with: node --test tests.js
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
    escapeHtml,
    escapeCsvField,
    translate,
    TRANSLATIONS,
    getCategory,
    expandTwoDigitYear,
    computeChecksum,
    buildProgramCode,
    buildParticipantCode,
    parseCsv,
    detectSeparator,
    matchHeaderKey,
} from './core.js';

// -----------------------------------------------------------------------------
// escapeHtml
// -----------------------------------------------------------------------------

test('escapeHtml escapes the five HTML-significant characters', () => {
    assert.equal(escapeHtml(`<a href="x">'&'</a>`), '&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;');
});

test('escapeHtml coerces null and undefined to empty string', () => {
    assert.equal(escapeHtml(null), '');
    assert.equal(escapeHtml(undefined), '');
});

// -----------------------------------------------------------------------------
// escapeCsvField
// -----------------------------------------------------------------------------

test('escapeCsvField leaves plain values untouched', () => {
    assert.equal(escapeCsvField('hello', ';'), 'hello');
});

test('escapeCsvField quotes when separator, quote, or newline appears', () => {
    assert.equal(escapeCsvField('a;b', ';'), '"a;b"');
    assert.equal(escapeCsvField('a"b', ';'), '"a""b"');
    assert.equal(escapeCsvField('a\nb', ';'), '"a\nb"');
});

// -----------------------------------------------------------------------------
// translate
// -----------------------------------------------------------------------------

test('translate returns the key itself when missing', () => {
    assert.equal(translate({}, 'unknown.key'), 'unknown.key');
});

test('translate substitutes named placeholders', () => {
    assert.equal(
        translate(TRANSLATIONS.de, 'msg.csvImported', { count: 5 }),
        '5 Teilnehmer importiert.'
    );
});

test('translate uses the requested dictionary', () => {
    assert.equal(translate(TRANSLATIONS.fr, 'btn.print'), 'Imprimer');
});

// -----------------------------------------------------------------------------
// getCategory
// -----------------------------------------------------------------------------

test('getCategory maps ages to the documented codes', () => {
    assert.equal(getCategory(2010, 2026).code, 'JJ');
    assert.equal(getCategory(2006, 2026).code, 'J');
    assert.equal(getCategory(2000, 2026).code, 'E');
    assert.equal(getCategory(1976, 2026).code, 'S');
    assert.equal(getCategory(1960, 2026).code, 'V');
    assert.equal(getCategory(1950, 2026).code, 'SV');
});

test('getCategory returns null for ages outside any range', () => {
    assert.equal(getCategory(2025, 2026), null); // age 1, below JJ minimum
});

test('getCategory rejects non-numeric and out-of-bounds years', () => {
    assert.equal(getCategory('', 2026), null);
    assert.equal(getCategory('abcd', 2026), null);
    assert.equal(getCategory(1899, 2026), null);
    assert.equal(getCategory(2101, 2026), null);
});

// -----------------------------------------------------------------------------
// expandTwoDigitYear
// -----------------------------------------------------------------------------

test('expandTwoDigitYear pivots around current year', () => {
    // current year 2026 → pivot 26: ≤26 ⇒ 20xx, >26 ⇒ 19xx
    assert.equal(expandTwoDigitYear('05', 2026), 2005);
    assert.equal(expandTwoDigitYear('26', 2026), 2026);
    assert.equal(expandTwoDigitYear('27', 2026), 1927);
    assert.equal(expandTwoDigitYear('99', 2026), 1999);
});

test('expandTwoDigitYear ignores non-2-digit input', () => {
    assert.equal(expandTwoDigitYear('1990', 2026), null);
    assert.equal(expandTwoDigitYear('abc', 2026), null);
    assert.equal(expandTwoDigitYear('', 2026), null);
});

// -----------------------------------------------------------------------------
// computeChecksum (mod-97 with -3 multiplier)
// -----------------------------------------------------------------------------

test('computeChecksum returns a 2-digit string', () => {
    const c = computeChecksum('123456');
    assert.match(c, /^\d{2}$/);
});

test('computeChecksum is deterministic', () => {
    assert.equal(computeChecksum('123456'), computeChecksum('123456'));
});

test('computeChecksum strips non-digits before computing', () => {
    assert.equal(computeChecksum('12-34-56'), computeChecksum('123456'));
});

test('computeChecksum: appended checksum is divisible by 97 (mod-97 invariant)', () => {
    const base = '20123456';
    const cs = computeChecksum(base);
    const full = BigInt(base + cs);
    assert.equal(full % 97n, 0n);
});

// -----------------------------------------------------------------------------
// buildProgramCode
// -----------------------------------------------------------------------------

test('buildProgramCode returns null when ranking or target is empty', () => {
    assert.equal(buildProgramCode({ prefix: '20', ranking: '',    target: '001' }), null);
    assert.equal(buildProgramCode({ prefix: '20', ranking: '001', target: ''    }), null);
});

test('buildProgramCode pads parts and appends a 2-digit checksum', () => {
    const code = buildProgramCode({ prefix: '2', ranking: '1', target: '2' });
    assert.equal(code.length, 10);
    assert.equal(code.slice(0, 8), '02001002');
    assert.match(code.slice(8), /^\d{2}$/);
});

// -----------------------------------------------------------------------------
// buildParticipantCode
// -----------------------------------------------------------------------------

test('buildParticipantCode returns null when disabled or license empty', () => {
    assert.equal(buildParticipantCode({ prefix: '10', license: '123', enabled: false }), null);
    assert.equal(buildParticipantCode({ prefix: '10', license: '',    enabled: true  }), null);
    assert.equal(buildParticipantCode({ prefix: '10', license: 'abc', enabled: true  }), null);
});

test('buildParticipantCode pads license to 6 digits and appends checksum', () => {
    const code = buildParticipantCode({ prefix: '10', license: '42', enabled: true });
    assert.equal(code.length, 10);
    assert.equal(code.slice(0, 8), '10000042');
    assert.match(code.slice(8), /^\d{2}$/);
});

// -----------------------------------------------------------------------------
// parseCsv
// -----------------------------------------------------------------------------

test('parseCsv splits a basic semicolon table', () => {
    assert.deepEqual(
        parseCsv('a;b;c\n1;2;3', ';'),
        [['a', 'b', 'c'], ['1', '2', '3']]
    );
});

test('parseCsv handles quoted fields with embedded separator and quotes', () => {
    assert.deepEqual(
        parseCsv('"a;b";"he said ""hi""";c', ';'),
        [['a;b', 'he said "hi"', 'c']]
    );
});

test('parseCsv preserves embedded newlines inside quotes', () => {
    assert.deepEqual(
        parseCsv('"line1\nline2";x', ';'),
        [['line1\nline2', 'x']]
    );
});

test('parseCsv drops fully blank rows', () => {
    assert.deepEqual(
        parseCsv('a;b\n\n1;2\n', ';'),
        [['a', 'b'], ['1', '2']]
    );
});

// -----------------------------------------------------------------------------
// detectSeparator
// -----------------------------------------------------------------------------

test('detectSeparator picks the most frequent of ; , \\t', () => {
    assert.equal(detectSeparator('a;b;c;d'),     ';');
    assert.equal(detectSeparator('a,b,c,d'),     ',');
    assert.equal(detectSeparator('a\tb\tc'),     '\t');
});

test('detectSeparator ignores separators inside quoted fields', () => {
    // The quoted ;;;;;;;;; should not outvote the four real commas.
    assert.equal(detectSeparator('"a;;;;;;;;;b",c,d,e,f'), ',');
});

// -----------------------------------------------------------------------------
// matchHeaderKey
// -----------------------------------------------------------------------------

const SAMPLE_FIELDS = [
    { key: 'lastName',  aliases: ['lastname', 'nachname', 'name', 'nom'] },
    { key: 'firstName', aliases: ['firstname', 'vorname', 'prénom', 'prenom'] },
    { key: 'license',   aliases: ['license', 'lizenz-nr.', 'lizenz'] },
    { key: 'custom1',   aliases: [], currentHeader: 'Verein' },
];

test('matchHeaderKey matches by alias case-insensitively', () => {
    assert.equal(matchHeaderKey('Nachname', SAMPLE_FIELDS), 'lastName');
    assert.equal(matchHeaderKey('  PRÉNOM  ', SAMPLE_FIELDS), 'firstName');
});

test('matchHeaderKey matches against custom column header', () => {
    assert.equal(matchHeaderKey('verein', SAMPLE_FIELDS), 'custom1');
});

test('matchHeaderKey returns null on no match', () => {
    assert.equal(matchHeaderKey('whatever', SAMPLE_FIELDS), null);
});
