# AGENTS.md

This `AGENTS.md` is the operational blueprint for coding agents working on this repository: the logic, rules, and thought processes required to execute autonomous development tasks. It is a living document (≤10 000 characters, target 7000) that must be kept in sync with the codebase as features evolve and conventions change.

## Rules

These are non-negotiable. They override any other guidance in this document.

1. **Always read files before editing them.** No edit goes out based on memory or guesswork — open the file in the current state, locate the exact lines, then change them. This applies to every iteration; the file may have been modified by the developer or a linter between turns.

## What RangeOffice does

RangeOffice is a small offline-first PWA for managing participants and printing barcoded score sheets ("Standblätter") at Swiss shooting events. Single-page, no build step, no runtime dependencies beyond the vendored `JsBarcode.all.min.js`. UI is German or French. All state lives in `localStorage`. See `README.md` for full details.

## Code philosophy

Write for the next developer, not the machine. Every method, variable, and class must communicate its intent by name alone. If a function needs a comment to explain what it does, rename or split it.

- Use descriptive names. No `$data`, no `$result`, no abbreviations.
- Keep methods short and single-purpose.
- One responsibility per class.
- No speculative abstractions. Abstract when duplication is proven, not anticipated.
- No emojis in code or messages unless explicitly requested.
- Default to no comments. Only add a comment when the *why* is non-obvious.

## Architecture

Two-layer split, deliberately strict:

| Layer | File | Allowed to touch |
|---|---|---|
| Pure logic | `core.js` | Plain JS only — no DOM, no `localStorage`, no `window`, no `document`. Exported as ES modules. |
| App layer | `app.js` | DOM, `localStorage`, `JsBarcode`. Imports from `core.js`. Organised as `class` modules (`Migrations`, `UserSettings`, `Translations`, `Settings`, `Logo`, `Tabs`, `Categories`, `Barcodes`, `Participants`, `Selection`, `Filter`, `Toolbar`, `CsvIO`, `Printing`, `Backup`, `Updates`, `App`). |
| Service worker | `sw.js` | Standalone offline cache + `SKIP_WAITING` message handler. `app.js` registers it and drives the user-facing update prompt via the `Updates` class. |

Anything that can be tested without a browser belongs in `core.js`. Tests in `tests.js` import from `core.js` directly via Node's built-in test runner.

The HTML uses inline `onclick="Module.method()"` handlers wired to those classes — keep classes as static-method namespaces and export them on `window` if a new one is referenced from markup.

## Single sources of truth

When adding columns, settings, or translations, extend the existing schema rather than scattering new lookups:

- **Participant columns** → `Participants.FIELDS` in `app.js`. One entry covers: storage key, CSS class, type, placeholder key (or literal placeholder), header key (or dynamic `getHeader`), alias list (for CSV import), optional `col` data attribute, optional visibility predicate. Row HTML, CSV export, CSV import, column visibility, and `refreshDynamicTexts` all derive from it.
- **Settings fields** → `Settings.BINDINGS`. One entry covers storage key, element id, type (`text` | `checkbox`), default value. Load/save/get all use it.
- **Translations** → `TRANSLATIONS` in `core.js` (`de` and `fr` dictionaries). Use `data-i18n="key"` and `data-i18n-placeholder="key"` in HTML. For dynamic text in JS, call `Translations.t('key', { params })`. `{name}` style placeholders are substituted by `translate()`.
- **Backup format versions** → `Backup.SETTINGS_VERSION`, `Backup.PARTICIPANTS_VERSION` (both `Major.Minor`). Bump the major when the shape changes incompatibly; bump the minor for additive changes.

## Versioning & migrations

Currently, we are in early development, so don't automatically add migration or backwards-compatibility logic. Ask the developer if it is needed for the current task.

Two version markers live in `localStorage`: `settingsVersion`, `participantsVersion`. On every boot, `Migrations.run()` compares them to `Backup.SETTINGS_VERSION` / `Backup.PARTICIPANTS_VERSION` and walks `Migrations.settings[N]` / `Migrations.participants[N]` step-by-step from each old major to the current one, then stamps the current version. Empty registries today.

When you bump a major version (e.g. settings 1.x → 2.0):

1. Update `Backup.SETTINGS_VERSION = '2.0'`.
2. Add `Migrations.settings[1] = () => { /* mutate localStorage in place */ };`.

Imported `.rangeoffice` files are version-checked per section. Mismatched majors are rejected with `msg.importIncompatible`. Same convention applies — when you change the on-disk shape, bump the major and add a migrator.

## Storage layout

`localStorage` mirrors the export envelope so the two are interchangeable. Three top-level keys, each a JSON-encoded string:

- `settings` — `{ version: "1.0", data: { eventName, participantPrefix, programPrefix, rankingCode, targetCode, licenseEnabled, customColumn1Name, customColumn2Name, eventLogo } }`
- `participants` — `{ version: "1.0", items: [ {license, lastName, firstName, yearOfBirth, custom1, custom2}, ... ] }`
- `userSettings` — `{ language: "de", updateDeferUntil: 0 }` — local-only user prefs, **not** exported (free-form bag, extend via `UserSettings.patch`)

The exported `.rangeoffice` envelope is just the first two:

```jsonc
{
  "settings":     { "version": "1.0", "data":  { ...flat keys, "eventLogo": "data:image/..." } },
  "participants": { "version": "1.0", "items": [...] }
}
```

The version lives *inside* each wrapper — there are no separate `*Version` keys. `UserSettings` deliberately sits outside the event so language and future personal prefs survive a full event reset and aren't shipped to other operators in an export.

## Naming conventions

- IDs: kebab-case (`event-name-input`, `participants-tbody`).
- CSS classes: kebab-case (`field-lastname`, `btn-danger-ghost`).
- Storage keys: camelCase (`participantPrefix`, `customColumn1Name`).
- JS identifiers: camelCase; classes PascalCase.
- Translation keys: dotted lowercase (`btn.print`, `category.tooltip`, `placeholder.lastName`).

## Security

User-supplied strings touch `innerHTML` in label printing, row rendering, and dynamic header text — always go through `escapeHtml()` from `core.js`. Don't introduce new template literals that interpolate user input directly into `innerHTML` without escaping. CSV/TSV output uses `escapeCsvField` which handles RFC 4180 quoting.

## i18n discipline

Every visible string ends up in `TRANSLATIONS`. When you add a UI element with text, add a translation key in **both** `de` and `fr` and reference it via `data-i18n` or `Translations.t()`. Don't ship English fallbacks in the UI; English is allowed only for code identifiers and `console`.

## Local development

Node is required.

```bash
npm run serve   # starts a local static server (needed because app.js is an ES module)
npm run test    # runs the Node test suite against core.js
```

Open `http://localhost:3000` (or whichever port `serve` reports). The service worker only registers on `localhost` or HTTPS — opening `index.html` via `file://` works for quick visual checks but PWA install / offline cache won't kick in.

## Testing

- All testable logic must live in `core.js`. New core helpers need at least one test.
- Tests live in `tests.js` and use `node --test` plus `assert/strict`. No external test framework.
- Run `npm run test` after every change. A green run is a precondition for handing back to the developer.

## Git & code review

You are read-only on git. Never run `git add`, `git commit`, `git push`, `git rebase`, `git reset`, branch deletion, force pushes, or anything destructive. Read-only commands (`git status`, `git diff`, `git log`, `git show`, `git branch -vv`) are fine. The developer makes all commits.

After every tasked change:

1. Run `node --check <file>.js` for any file you touched, and `npm run test`.
2. List each changed file with a one-line summary of what changed and why.
3. Flag areas that warrant close review — complex logic, security-sensitive paths, side-effects on storage or migrations.
4. Ask for feedback before proceeding to the next task.
5. Suggest a short plain commit message for the pending `git status`. No prefixes, tags, or brackets — the branch name communicates the type; the message explains what changed.

## When you're unsure

- Prefer extending an existing schema (`PARTICIPANT_FIELDS`, `Settings.BINDINGS`, `TRANSLATIONS`) over creating a parallel one.
- Prefer adding a pure helper to `core.js` with a test over adding logic to `app.js`.
- Prefer a tiny, named function over an inline ternary chain.
- If a change touches the on-disk format, treat it as a versioning event: bump the major, add a migrator, write tests for the migration step.
