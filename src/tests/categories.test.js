import { test } from 'node:test';
import assert from 'node:assert/strict';

import { getCategory, expandTwoDigitYear } from '../core/categories.js';

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
