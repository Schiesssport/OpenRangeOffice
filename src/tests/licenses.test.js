import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
    normalizeLicense,
    parseSwissDateYear,
    tokenizeQuery,
    recordMatchesTerms,
    findDuplicateLicense,
} from '../core/licenses.js';

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
