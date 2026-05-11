import { test } from 'node:test';
import assert from 'node:assert/strict';

import { escapeHtml, escapeCsvField } from '../core/escape.js';

test('escapeHtml escapes the five HTML-significant characters', () => {
    assert.equal(escapeHtml(`<a href="x">'&'</a>`), '&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;');
});

test('escapeHtml coerces null and undefined to empty string', () => {
    assert.equal(escapeHtml(null), '');
    assert.equal(escapeHtml(undefined), '');
});

test('escapeCsvField leaves plain values untouched', () => {
    assert.equal(escapeCsvField('hello', ';'), 'hello');
});

test('escapeCsvField quotes when separator, quote, or newline appears', () => {
    assert.equal(escapeCsvField('a;b', ';'), '"a;b"');
    assert.equal(escapeCsvField('a"b', ';'), '"a""b"');
    assert.equal(escapeCsvField('a\nb', ';'), '"a\nb"');
});
