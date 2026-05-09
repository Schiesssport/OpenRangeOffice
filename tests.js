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
    computeDeferUntil,
    isUpdatePromptDue,
    normalizeLicense,
    parseSwissDateYear,
    tokenizeQuery,
    recordMatchesTerms,
    findDuplicateLicense,
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

// -----------------------------------------------------------------------------
// Update prompt scheduling
// -----------------------------------------------------------------------------

test('computeDeferUntil adds the requested number of days in milliseconds', () => {
    const oneDayMs = 24 * 60 * 60 * 1000;
    assert.equal(computeDeferUntil(0, 1), oneDayMs);
    assert.equal(computeDeferUntil(1000, 2), 1000 + 2 * oneDayMs);
});

test('isUpdatePromptDue is true when no defer timestamp is stored', () => {
    assert.equal(isUpdatePromptDue(undefined, 1000), true);
    assert.equal(isUpdatePromptDue(0,         1000), true);
    assert.equal(isUpdatePromptDue(null,      1000), true);
});

test('isUpdatePromptDue gates strictly until the defer time elapses', () => {
    assert.equal(isUpdatePromptDue(2000, 1999), false);
    assert.equal(isUpdatePromptDue(2000, 2000), true);
    assert.equal(isUpdatePromptDue(2000, 2001), true);
});

// -----------------------------------------------------------------------------
// normalizeLicense / parseSwissDateYear
// -----------------------------------------------------------------------------

test('normalizeLicense strips non-digits and pads to 6 digits', () => {
    assert.equal(normalizeLicense('1005'),       '001005');
    assert.equal(normalizeLicense('001005'),     '001005');
    assert.equal(normalizeLicense('  001005 '),  '001005');
    assert.equal(normalizeLicense('00-10-05'),   '001005');
    assert.equal(normalizeLicense('1234567'),    '1234567');
});

test('normalizeLicense returns empty string for empty / non-numeric input', () => {
    assert.equal(normalizeLicense(''),          '');
    assert.equal(normalizeLicense(null),        '');
    assert.equal(normalizeLicense(undefined),   '');
    assert.equal(normalizeLicense('   '),       '');
    assert.equal(normalizeLicense('abc'),       '');
});

test('parseSwissDateYear extracts the trailing 4-digit year', () => {
    assert.equal(parseSwissDateYear('22.08.2005'), '2005');
    assert.equal(parseSwissDateYear('1.1.1990'),   '1990');
    assert.equal(parseSwissDateYear('2005'),       '2005');
});

test('parseSwissDateYear returns empty string when no 4-digit suffix is found', () => {
    assert.equal(parseSwissDateYear(''),         '');
    assert.equal(parseSwissDateYear('22.08.05'), '');
    assert.equal(parseSwissDateYear(null),       '');
});

// -----------------------------------------------------------------------------
// tokenizeQuery / recordMatchesTerms
// -----------------------------------------------------------------------------

test('tokenizeQuery splits on whitespace, lowercases, drops empties', () => {
    assert.deepEqual(tokenizeQuery('  Loredana  Nellen '), ['loredana', 'nellen']);
    assert.deepEqual(tokenizeQuery('LEVIN'),               ['levin']);
    assert.deepEqual(tokenizeQuery('a\tb\nc'),             ['a', 'b', 'c']);
});

test('tokenizeQuery returns an empty list for empty/blank/null input', () => {
    assert.deepEqual(tokenizeQuery(''),         []);
    assert.deepEqual(tokenizeQuery('   '),      []);
    assert.deepEqual(tokenizeQuery(null),       []);
    assert.deepEqual(tokenizeQuery(undefined),  []);
});

test('recordMatchesTerms requires every term to occur in lastName + firstName (case-insensitive)', () => {
    const record = { lastName: 'Nellen', firstName: 'Loredana' };
    assert.equal(recordMatchesTerms(record, ['nel']),                true);
    assert.equal(recordMatchesTerms(record, ['LORE', 'NEL']),        true);
    assert.equal(recordMatchesTerms(record, ['lore', 'xyz']),        false);
    assert.equal(recordMatchesTerms({ lastName: '', firstName: '' }, ['x']), false);
});

// -----------------------------------------------------------------------------
// findDuplicateLicense
// -----------------------------------------------------------------------------

test('findDuplicateLicense matches under license normalization (padding & non-digits)', () => {
    assert.equal(findDuplicateLicense('1005',     ['001005']),         true);
    assert.equal(findDuplicateLicense('001005',   ['1005']),           true);
    assert.equal(findDuplicateLicense('00-10-05', ['001005']),         true);
    assert.equal(findDuplicateLicense('001005',   ['001006', '1007']), false);
});

test('findDuplicateLicense returns false for empty / non-numeric candidate', () => {
    assert.equal(findDuplicateLicense('',     ['001005']), false);
    assert.equal(findDuplicateLicense('abc',  ['001005']), false);
    assert.equal(findDuplicateLicense(null,   ['001005']), false);
});
