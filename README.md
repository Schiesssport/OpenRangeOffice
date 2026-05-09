# Standbüro

## Für Anwender:innen

**Standbüro** ist ein einfaches Werkzeug, mit dem du für Schiessanlässe Standblätter mit Barcodes (Lizenz und Programm) drucken kannst – ohne Installation, ohne Konto, ohne Abo. Du gibst die Teilnehmer ein, stellst einmalig Anlass und Programm ein, und druckst die Blätter aus.

Die App läuft direkt im Browser und funktioniert auch **offline**, sobald sie einmal geladen wurde. Alle Daten bleiben lokal auf deinem Gerät – nichts wird auf einen Server geschickt. Du kannst sie zudem als Web-App auf Desktop oder Tablet **installieren**, sodass sie sich wie ein normales Programm verhält.

Unterstützte Sprachen: **Deutsch** und **Französisch** (umschaltbar in den Einstellungen).

Diese Software ist kostenlos und Open Source – entwickelt für die Schweizer Schützenvereine. Bei Problemen, Wünschen oder zum Mithelfen: [Projekt auf GitHub](https://github.com/schiesssport/range-office).

---

## Technical overview

> **Coding agents:** must absorb [`AGENTS.md`](AGENTS.md) before any code — it is the operational contract for this repository (architecture, conventions, storage shape, git rules, post-change checklist).

A small offline-first web app for managing shooting-event participants and printing barcoded score sheets ("Standblätter") for Swiss shooting events.

Built as a single-page PWA with no build step and no external runtime dependencies — open `index.html` (served over `http://localhost` or `https://`) and it works.

## Features

- **Participant Table**
  - Inline editing for last name, first name, year of birth, licence number
  - Up to two configurable custom columns
  - Quick filter (top right of the toolbar)
  - Auto-expansion of two-digit years (e.g. `26 → 2026`, `27 → 1927`, pivot = current year)
  - Live shooting category badge (`JJ / J / E / S / V / SV`) computed from age
  - CSV import (auto-detects `;`, `,`, or tab delimiter, maps DE/FR/EN headers)
  - CSV download (UTF-8 BOM, `;`-delimited — opens cleanly in Excel)
  - Excel-compatible copy to clipboard
  - Backup export/import (JSON, full state)
- **Score Sheet Printing**
  - Sheet per participant, two columns per sheet
  - Two Code128 barcodes per label (participant licence + event programme), each with a `mod-97` checksum
  - Optional event logo and event name printed on every label
  - `Ctrl/Cmd+P` while focused in a row prints just that row's sheet
  - Black & white friendly: no colour in print or category indicators
- **i18n**: German (default) and French, switchable at runtime
- **PWA**: installable, fully offline after first load (service worker caches all assets)

## Planned Features

- [ ] **Streamlined administrative workflow**: Printing award cards and receipts.
- [ ] **Group competition**: Automated calculation of equipment categories based on firearm types.
- [ ] **Club competition**: Full compliance with Swiss Shooting Sport Federation (SSV) standards and the 2011 regulatory framework.
- [ ] **Live Leaderboards**: Optimized display for sponsors and real-time rankings on projectors or large-screen TVs.
- [ ] **Individual competition**: Scriptable ranking logic using dedicated event hooks, allowing users to define their own custom rules and scoring algorithms.

## Barcodes

Two Code128 barcodes per label, both with a `mod-97` (`-3n mod 97`) checksum:

| Barcode | Composition |
|---|---|
| Participant | `participantPrefix` + licence number padded to 6 digits + checksum |
| Programme  | `programPrefix` (2) + `programBilling` (3) + `programHits` (3) + checksum |

## File layout

| File | Purpose |
|---|---|
| `index.html` | Markup only; UI structure and `data-i18n` hooks |
| `styles.css` | All styling, including the print stylesheet for the label sheets |
| `app.js` | Application logic (translations, settings, table, barcode, print, CSV, backup, update prompt) |
| `core.js` | Pure logic shared by app and tests (translations, schema, barcode helpers) |
| `tests.js` | Node test suite for `core.js` |
| `sw.js` | Service worker — offline cache + `SKIP_WAITING` handler (bump `CACHE_NAME` to ship a new version) |
| `JsBarcode.all.min.js` | Vendored barcode library (no CDN needed) |
| `manifest.webmanifest` | PWA manifest |
| `icon.svg` | App icon |

## Storage

Three top-level `localStorage` keys, each a JSON-encoded versioned wrapper:

| Key | Shape |
|---|---|
| `settings`     | `{ version, data: { eventName, eventLogo, participantPrefix, programPrefix, rankingCode, targetCode, licenseEnabled, customColumn1Name, customColumn2Name } }` |
| `participants` | `{ version, items: [ {license, lastName, firstName, yearOfBirth, custom1, custom2}, ... ] }` |
| `userSettings` | `{ language, updateDeferUntil }` — local user preferences, **not** part of an event export |

The exported `.rangeoffice` file mirrors `settings` + `participants` exactly. Section versions are `Major.Minor`; an incompatible major aborts the import (a registry-based migration framework is in place for future major bumps).

## Running locally

The app needs to be served over `http://localhost` or `https://` for the service worker / PWA install to work.

```bash
npm run serve
```

## Browser support

Modern evergreen browsers (Chromium-based, Firefox, Safari).

## Licence

[AGPL-3.0](LICENSE)

This is free community software: it is prohibited to sell this tool as a private product or hide its source code. Under the AGPL license, any modifications or hosted versions must remain open-source and free for everyone to use and improve.
