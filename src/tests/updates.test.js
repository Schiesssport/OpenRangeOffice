import { test } from 'node:test';
import assert from 'node:assert/strict';

import { computeDeferUntil, isUpdatePromptDue } from '../core/updates.js';

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
