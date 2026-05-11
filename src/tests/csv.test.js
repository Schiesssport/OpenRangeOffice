import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parseCsv, detectSeparator } from '../core/csv.js';

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

test('detectSeparator picks the most frequent of ; , \\t', () => {
    assert.equal(detectSeparator('a;b;c;d'),     ';');
    assert.equal(detectSeparator('a,b,c,d'),     ',');
    assert.equal(detectSeparator('a\tb\tc'),     '\t');
});

test('detectSeparator ignores separators inside quoted fields', () => {
    // The quoted ;;;;;;;;; should not outvote the four real commas.
    assert.equal(detectSeparator('"a;;;;;;;;;b",c,d,e,f'), ',');
});
