// =============================================================================
// RangeOffice — DOM/storage layer.
// Pure logic lives in core.js (no DOM, unit-tested via tests.js).
// =============================================================================

import {
    escapeHtml,
    escapeCsvField,
    TRANSLATIONS,
    DEFAULT_LANGUAGE,
    translate,
    getCategory,
    expandTwoDigitYear,
    buildProgramCode,
    buildParticipantCode,
    parseCsv,
    detectSeparator,
    matchHeaderKey,
    computeDeferUntil,
    isUpdatePromptDue,
} from './core.js';

const $  = (id) => document.getElementById(id);
const $$ = (selector, ctx = document) => ctx.querySelectorAll(selector);

const triggerDownload = (filename, blob) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
};

// -----------------------------------------------------------------------------
// Local storage migration (runs on every boot)
//
// Each registry maps OLD major version → migrator that takes the current
// wrapper ({version, data} or {version, items}) and returns the next major's
// wrapper. Fresh installs (wrapper absent) skip the migration entirely.
// -----------------------------------------------------------------------------

class Migrations {
    static settings     = {};
    static participants = {};

    static run() {
        Migrations.runOne('settings',     Backup.SETTINGS_VERSION,     Migrations.settings);
        Migrations.runOne('participants', Backup.PARTICIPANTS_VERSION, Migrations.participants);
    }

    static runOne(storageKey, currentVersion, registry) {
        const raw = localStorage.getItem(storageKey);
        if (raw === null) return;
        let wrapper;
        try { wrapper = JSON.parse(raw); } catch (_) { return; }
        let from = Backup.majorOf(wrapper.version);
        const to = Backup.majorOf(currentVersion);
        while (from < to) {
            const step = registry[from];
            if (step) wrapper = step(wrapper);
            from++;
        }
        wrapper.version = currentVersion;
        localStorage.setItem(storageKey, JSON.stringify(wrapper));
    }
}

// -----------------------------------------------------------------------------
// User settings — local-only preferences, NOT part of an event export
// -----------------------------------------------------------------------------

class UserSettings {
    static read() {
        try { return JSON.parse(localStorage.getItem('userSettings') || '{}'); }
        catch (_) { return {}; }
    }

    static patch(values) {
        const merged = { ...UserSettings.read(), ...values };
        localStorage.setItem('userSettings', JSON.stringify(merged));
    }
}

// -----------------------------------------------------------------------------
// Translations
// -----------------------------------------------------------------------------

class Translations {
    static getLanguage() {
        const stored = UserSettings.read().language;
        return TRANSLATIONS[stored] ? stored : DEFAULT_LANGUAGE;
    }

    static t(key, params = {}) {
        const dict = TRANSLATIONS[Translations.getLanguage()] || TRANSLATIONS[DEFAULT_LANGUAGE];
        return translate(dict, key, params);
    }

    static apply() {
        document.documentElement.lang = Translations.getLanguage();
        $$('[data-i18n]').forEach(el => { el.textContent = Translations.t(el.dataset.i18n); });
        $$('[data-i18n-placeholder]').forEach(el => { el.placeholder = Translations.t(el.dataset.i18nPlaceholder); });
    }

    static set(lang) {
        if (!TRANSLATIONS[lang]) return;
        UserSettings.patch({ language: lang });
        Translations.apply();
        Participants.refreshDynamicTexts();
    }
}

// -----------------------------------------------------------------------------
// Settings
// -----------------------------------------------------------------------------

class Settings {
    static BINDINGS = [
        { storageKey: 'eventName',         elementId: 'event-name-input',         type: 'text',     defaultValue: String(new Date().getFullYear()) },
        { storageKey: 'participantPrefix', elementId: 'participant-prefix-input', type: 'text',     defaultValue: '10' },
        { storageKey: 'programPrefix',     elementId: 'program-prefix-input',     type: 'text',     defaultValue: '20' },
        { storageKey: 'rankingCode',       elementId: 'ranking-code-input',       type: 'text',     defaultValue: ''   },
        { storageKey: 'targetCode',        elementId: 'target-code-input',        type: 'text',     defaultValue: ''   },
        { storageKey: 'licenseEnabled',    elementId: 'license-enabled-input',    type: 'checkbox', defaultValue: true },
        { storageKey: 'customColumn1Name', elementId: 'custom-column-1-input',    type: 'text',     defaultValue: ''   },
        { storageKey: 'customColumn2Name', elementId: 'custom-column-2-input',    type: 'text',     defaultValue: ''   },
    ];

    static BY_KEY = Object.fromEntries(Settings.BINDINGS.map(b => [b.storageKey, b]));

    // Read the {version, data} wrapper. Returns the data object, or {} if absent
    // or version-incompatible.
    static readData() {
        try {
            const raw = localStorage.getItem('settings');
            if (!raw) return {};
            const wrapper = JSON.parse(raw);
            if (Backup.majorOf(wrapper.version) !== Backup.majorOf(Backup.SETTINGS_VERSION)) return {};
            return wrapper.data || {};
        } catch (_) { return {}; }
    }

    static writeData(data) {
        localStorage.setItem('settings', JSON.stringify({
            version: Backup.SETTINGS_VERSION,
            data,
        }));
    }

    static load() {
        const data = Settings.readData();
        Settings.BINDINGS.forEach(({ storageKey, elementId, type, defaultValue }) => {
            const el = $(elementId);
            const value = data[storageKey];
            if (type === 'checkbox') {
                el.checked = value === undefined ? !!defaultValue : !!value;
            } else {
                el.value = value ?? defaultValue;
            }
        });
    }

    static save() {
        const data = Settings.readData();
        Settings.BINDINGS.forEach(({ storageKey, elementId, type }) => {
            const el = $(elementId);
            data[storageKey] = type === 'checkbox' ? el.checked : el.value;
        });
        Settings.writeData(data);
        Participants.applyColumnVisibility();
    }

    static get(storageKey) {
        const binding = Settings.BY_KEY[storageKey];
        const el = $(binding.elementId);
        if (binding.type === 'checkbox') return el.checked;
        return el.value || binding.defaultValue;
    }

    // For non-form settings (eventLogo)
    static getRaw(key) {
        return Settings.readData()[key];
    }

    static setRaw(key, value) {
        const data = Settings.readData();
        data[key] = value;
        Settings.writeData(data);
    }
}

// -----------------------------------------------------------------------------
// Event logo
// -----------------------------------------------------------------------------

class Logo {
    static loadFrom(input) {
        if (!input.files[0]) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            Settings.setRaw('eventLogo', e.target.result);
            Logo.updatePreview();
        };
        reader.readAsDataURL(input.files[0]);
    }

    static clear() {
        Settings.setRaw('eventLogo', '');
        Logo.updatePreview();
    }

    static updatePreview() {
        const dataUrl = Settings.getRaw('eventLogo') || '';
        const img = $('logo-preview');
        const btn = $('clear-logo-button');
        img.src = dataUrl;
        img.style.display = dataUrl ? 'block' : 'none';
        btn.style.display = dataUrl ? 'inline-block' : 'none';
    }
}

// -----------------------------------------------------------------------------
// Tabs
// -----------------------------------------------------------------------------

class Tabs {
    static switch(tab) {
        $('data-view').classList.toggle('hidden', tab !== 'data');
        $('settings-view').classList.toggle('hidden', tab !== 'settings');
        $$('.tab-btn').forEach(b => b.classList.toggle('active', b.id === 'tab-' + tab));
    }
}

// -----------------------------------------------------------------------------
// Category badges
// -----------------------------------------------------------------------------

class Categories {
    static currentYear() { return new Date().getFullYear(); }

    static get(yob) { return getCategory(yob, Categories.currentYear()); }

    static updateBadge(rowEl) {
        const yobInput = rowEl.querySelector('.field-yob');
        const badge    = rowEl.querySelector('.cat-badge');
        if (!yobInput || !badge) return;
        const cat = Categories.get(yobInput.value);
        badge.textContent = cat ? cat.code : '';
        badge.title = cat
            ? Translations.t('category.tooltip', { name: Translations.t('category.' + cat.code), age: cat.age })
            : '';
    }

    static updateAll() {
        $$('#participants-tbody tr').forEach(Categories.updateBadge);
    }

    static expandYob(inputEl) {
        const expanded = expandTwoDigitYear(inputEl.value.trim(), Categories.currentYear());
        if (expanded === null) return;
        inputEl.value = expanded;
        Categories.updateBadge(inputEl.closest('tr'));
        Participants.save();
    }
}

// -----------------------------------------------------------------------------
// Barcodes
// -----------------------------------------------------------------------------

class Barcodes {
    static OPTIONS = { width: 2, height: 40, displayValue: true, fontSize: 14, margin: 0 };

    static render(value) {
        const canvas = document.createElement('canvas');
        JsBarcode(canvas, value, Barcodes.OPTIONS);
        return canvas.toDataURL();
    }

    static programCode() {
        return buildProgramCode({
            prefix:  Settings.get('programPrefix'),
            ranking: Settings.get('rankingCode'),
            target:  Settings.get('targetCode'),
        });
    }

    static participantCode(license) {
        return buildParticipantCode({
            prefix:  Settings.get('participantPrefix'),
            license,
            enabled: Settings.get('licenseEnabled'),
        });
    }
}

// -----------------------------------------------------------------------------
// Participants — fields + row management + column visibility
// -----------------------------------------------------------------------------

class Participants {
    static FIELDS = [
        {
            key: 'license',
            cls: 'field-license',
            type: 'text',
            col: 'license',
            placeholderKey: 'placeholder.license',
            headerKey: 'col.licenseNumber',
            isVisible: () => Settings.get('licenseEnabled'),
            aliases: ['license', 'licence', 'lizenz', 'lizenz-nr.', 'lizenz-nr', 'lizenznummer', 'n° de licence', 'no de licence'],
        },
        {
            key: 'lastName',
            cls: 'field-lastname',
            type: 'text',
            placeholderKey: 'placeholder.lastName',
            headerKey: 'col.lastName',
            aliases: ['lastname', 'nachname', 'name', 'nom', 'familienname'],
        },
        {
            key: 'firstName',
            cls: 'field-firstname',
            type: 'text',
            placeholderKey: 'placeholder.firstName',
            headerKey: 'col.firstName',
            aliases: ['firstname', 'vorname', 'prénom', 'prenom'],
        },
        {
            key: 'yearOfBirth',
            cls: 'field-yob',
            type: 'number',
            placeholder: '1990',
            headerKey: 'col.yearOfBirth',
            aliases: ['yearofbirth', 'jahrgang', 'année de naissance', 'annee de naissance', 'jg', 'yob', 'geburtsjahr'],
        },
        {
            key: 'custom1',
            cls: 'field-custom1',
            type: 'text',
            col: 'custom1',
            isVisible: () => Settings.get('customColumn1Name').trim() !== '',
            getHeader: () => Settings.get('customColumn1Name').trim(),
        },
        {
            key: 'custom2',
            cls: 'field-custom2',
            type: 'text',
            col: 'custom2',
            isVisible: () => Settings.get('customColumn2Name').trim() !== '',
            getHeader: () => Settings.get('customColumn2Name').trim(),
        },
    ];

    static PRINT_ICON = '🖶';

    static fieldHeader(field) {
        return field.getHeader ? field.getHeader() : Translations.t(field.headerKey);
    }

    static readRow(rowEl) {
        return Object.fromEntries(
            Participants.FIELDS.map(f => [f.key, rowEl.querySelector('.' + f.cls)?.value ?? ''])
        );
    }

    static visibleColumns() {
        return Participants.FIELDS.filter(f => !f.isVisible || f.isVisible());
    }

    static applyColumnVisibility() {
        Participants.FIELDS.filter(f => f.col).forEach(f => {
            const visible = !f.isVisible || f.isVisible();
            $$(`[data-col="${f.col}"]`).forEach(el => el.classList.toggle('hidden', !visible));
            const headerEl = document.querySelector(`th[data-col="${f.col}"]`);
            if (headerEl && f.getHeader) headerEl.textContent = f.getHeader();
        });
    }

    static buildRowHtml(data) {
        const cells = Participants.FIELDS.map(f => {
            const value       = escapeHtml(data[f.key] || '');
            const placeholder = escapeHtml(f.placeholderKey ? Translations.t(f.placeholderKey) : (f.placeholder || ''));
            const colAttr     = f.col ? ` data-col="${f.col}"` : '';
            const yobExtras   = f.key === 'yearOfBirth' ? ' onchange="Categories.expandYob(this)"' : '';
            const input       = `<input type="${f.type}" class="${f.cls}" value="${value}" placeholder="${placeholder}" oninput="Participants.onInput(this)"${yobExtras}>`;
            if (f.key === 'yearOfBirth') {
                return `<td${colAttr}><div class="yob-cell">${input}<span class="cat-badge"></span></div></td>`;
            }
            return `<td${colAttr}>${input}</td>`;
        }).join('');

        const printLabel = escapeHtml(Translations.t('btn.print'));
        return `
            <td><input type="checkbox" class="row-check" tabindex="-1" onchange="Toolbar.updateLabels()"></td>
            ${cells}
            <td class="row-actions">
                <button class="btn-neutral btn-icon" data-row-action="print" onclick="Printing.labels(this.closest('tr'))" title="${printLabel}" aria-label="${printLabel}" tabindex="-1">${Participants.PRINT_ICON}</button>
                <button class="btn-danger-ghost btn-icon" onclick="Participants.deleteRow(this)" aria-label="✕" tabindex="-1">✕</button>
            </td>`;
    }

    static addRow(data = {}) {
        const tr = document.createElement('tr');
        if (!data.lastName) tr.className = 'empty-row';
        tr.innerHTML = Participants.buildRowHtml(data);
        $('participants-tbody').appendChild(tr);
        Categories.updateBadge(tr);
        Participants.applyColumnVisibility();
        return tr;
    }

    static onInput(inputEl) {
        const tr = inputEl.closest('tr');
        if (inputEl.classList.contains('field-lastname')) {
            if (inputEl.value.trim() !== '') {
                tr.classList.remove('empty-row');
                if (!tr.nextElementSibling) Participants.addRow();
            } else {
                tr.classList.add('empty-row');
            }
        }
        if (inputEl.classList.contains('field-yob')) {
            Categories.updateBadge(tr);
        }
        Participants.handleChanged();
    }

    static deleteRow(button) {
        const tr = button.closest('tr');
        if (!tr.classList.contains('empty-row') && !confirm(Translations.t('confirm.deleteRow'))) return;
        tr.remove();
        if (!document.querySelector('#participants-tbody tr')) Participants.addRow();
        Participants.handleChanged();
    }

    static deleteSelected() {
        const rows = Selection.getToolbarTargets();
        if (!rows.length) return;
        if (!confirm(Translations.t('confirm.deleteSelected'))) return;
        rows.forEach(tr => tr.remove());
        if (!document.querySelector('#participants-tbody tr')) Participants.addRow();
        Participants.handleChanged();
    }

    static save() {
        const items = [...$$('#participants-tbody tr:not(.empty-row)')]
            .map(Participants.readRow)
            .filter(p => p.lastName.trim() !== '');
        localStorage.setItem('participants', JSON.stringify({
            version: Backup.PARTICIPANTS_VERSION,
            items,
        }));
    }

    static loadStored() {
        try {
            const raw = localStorage.getItem('participants');
            if (!raw) return [];
            const wrapper = JSON.parse(raw);
            if (Backup.majorOf(wrapper.version) !== Backup.majorOf(Backup.PARTICIPANTS_VERSION)) return [];
            return Array.isArray(wrapper.items) ? wrapper.items : [];
        } catch (_) { return []; }
    }

    static handleChanged() {
        Participants.save();
        Filter.apply();
        Toolbar.updateLabels();
    }

    static refreshDynamicTexts() {
        Participants.FIELDS.filter(f => f.placeholderKey).forEach(f => {
            $$('#participants-tbody .' + f.cls).forEach(input => { input.placeholder = Translations.t(f.placeholderKey); });
        });
        $$('#participants-tbody [data-row-action="print"]').forEach(btn => {
            btn.title = Translations.t('btn.print');
            btn.setAttribute('aria-label', Translations.t('btn.print'));
        });
        Categories.updateAll();
        Toolbar.updateLabels();
    }
}

// -----------------------------------------------------------------------------
// Selection helpers (master checkbox + per-row checkboxes)
// -----------------------------------------------------------------------------

class Selection {
    static getNonEmptyRows() {
        return [...$$('#participants-tbody tr:not(.empty-row)')];
    }

    static getSelectedRows() {
        return [...$$('.row-check:checked')]
            .map(c => c.closest('tr'))
            .filter(tr => tr && !tr.classList.contains('empty-row'));
    }

    static getToolbarTargets() {
        const selected = Selection.getSelectedRows();
        return selected.length > 0 ? selected : Selection.getNonEmptyRows();
    }

    static toggleAll() {
        const shouldCheckAll = Selection.getSelectedRows().length === 0;
        $$('.row-check').forEach(cb => {
            const tr = cb.closest('tr');
            if (tr && !tr.classList.contains('empty-row')) cb.checked = shouldCheckAll;
        });
        Toolbar.updateLabels();
    }
}

// -----------------------------------------------------------------------------
// Filter
// -----------------------------------------------------------------------------

class Filter {
    static apply() {
        const query = ($('filter-input')?.value || '').trim().toLowerCase();
        $$('#participants-tbody tr').forEach(tr => {
            if (!query) {
                tr.classList.remove('filtered-out');
                return;
            }
            if (tr.classList.contains('empty-row')) {
                tr.classList.add('filtered-out');
                return;
            }
            const haystack = [...tr.querySelectorAll('input[type="text"], input[type="number"]')]
                .map(i => i.value.toLowerCase())
                .join(' ');
            tr.classList.toggle('filtered-out', !haystack.includes(query));
        });
    }
}

// -----------------------------------------------------------------------------
// Toolbar
// -----------------------------------------------------------------------------

class Toolbar {
    static BUTTONS = [
        { id: 'btn-toolbar-print',    verbKey: 'verb.print'    },
        { id: 'btn-toolbar-download', verbKey: 'verb.download' },
        { id: 'btn-toolbar-copy',     verbKey: 'verb.copy'     },
        { id: 'btn-toolbar-delete',   verbKey: 'verb.delete'   },
    ];

    static updateMaster() {
        const master = $('master-check');
        if (!master) return;
        const total    = Selection.getNonEmptyRows().length;
        const selected = Selection.getSelectedRows().length;
        master.checked       = selected > 0 && selected === total;
        master.indeterminate = selected > 0 && selected < total;
    }

    static updateLabels() {
        const selected = Selection.getSelectedRows();
        const count = selected.length > 0 ? String(selected.length) : Translations.t('count.all');
        Toolbar.BUTTONS.forEach(({ id, verbKey }) => {
            const btn = $(id);
            if (btn) btn.innerHTML = `<span class="btn-count">${escapeHtml(count)}</span> ${escapeHtml(Translations.t(verbKey))}`;
        });
        Toolbar.updateMaster();
    }
}

// -----------------------------------------------------------------------------
// Tabular import/export (CSV download / clipboard copy / CSV import)
// -----------------------------------------------------------------------------

class CsvIO {
    static buildDelimited(rows, separator, { includeHeader = true } = {}) {
        const cols = Participants.visibleColumns();
        const lines = [];
        if (includeHeader) {
            lines.push(cols.map(f => escapeCsvField(Participants.fieldHeader(f), separator)).join(separator));
        }
        rows.forEach(tr => {
            const data = Participants.readRow(tr);
            lines.push(cols.map(f => escapeCsvField(data[f.key], separator)).join(separator));
        });
        return lines.join('\r\n');
    }

    static download() {
        const rows = Selection.getToolbarTargets();
        if (!rows.length) return;
        const csv = '﻿' + CsvIO.buildDelimited(rows, ';');
        const filename = `${(Settings.get('eventName') || 'standblatt').replace(/\s+/g, '_')}.csv`;
        triggerDownload(filename, new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    }

    static async copy() {
        const rows = Selection.getToolbarTargets();
        if (!rows.length) return;
        const tsv = CsvIO.buildDelimited(rows, '\t', { includeHeader: false });
        try {
            await navigator.clipboard.writeText(tsv);
        } catch (_) {
            const ta = document.createElement('textarea');
            ta.value = tsv;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            ta.remove();
        }
    }

    static fieldsForHeaderMatch() {
        return Participants.FIELDS.map(f => ({
            key: f.key,
            aliases: f.aliases,
            currentHeader: f.getHeader ? f.getHeader() : null,
        }));
    }

    static import(input) {
        if (!input.files[0]) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                let text = e.target.result;
                if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
                const firstLine = text.split(/\r?\n/, 1)[0];
                const rows = parseCsv(text, detectSeparator(firstLine));
                if (rows.length < 2) { input.value = ''; return; }

                const fields = CsvIO.fieldsForHeaderMatch();
                const columnMap = rows[0].map(h => matchHeaderKey(h, fields));

                const trailing = document.querySelector('#participants-tbody tr.empty-row');
                if (trailing) trailing.remove();

                let imported = 0;
                for (let r = 1; r < rows.length; r++) {
                    const data = {};
                    columnMap.forEach((key, c) => {
                        if (key) data[key] = (rows[r][c] ?? '').trim();
                    });
                    if (!data.lastName && !data.firstName) continue;
                    Participants.addRow(data);
                    imported++;
                }

                Participants.addRow(); // restore trailing empty row
                Participants.handleChanged();
                alert(Translations.t('msg.csvImported', { count: imported }));
            } catch (_) {
                alert(Translations.t('msg.csvImportFailed'));
            }
            input.value = '';
        };
        reader.readAsText(input.files[0], 'UTF-8');
    }
}

// -----------------------------------------------------------------------------
// Printing
// -----------------------------------------------------------------------------

class Printing {
    static buildLabelHtml({ participant, programImg, participantImg, eventName, logoHtml }) {
        const cat = Categories.get(participant.yearOfBirth);
        const yobLine = participant.yearOfBirth
            ? (cat ? `${participant.yearOfBirth} ${cat.code}` : participant.yearOfBirth)
            : '';
        const info = `
            <div class="label-info">
                <div class="label-row label-bold">${escapeHtml(participant.lastName)} ${escapeHtml(participant.firstName)}</div>
                <div class="label-row">${escapeHtml(yobLine)}</div>
                <hr>
                <div class="label-event">${escapeHtml(eventName)}</div>
                ${logoHtml}
            </div>`;
        const partImg = participantImg ? `<img class="label-barcode-img" src="${participantImg}">` : '';
        const progImg = programImg     ? `<img class="label-barcode-img" src="${programImg}">`     : '';
        const gap     = (participantImg && programImg) ? `<div class="label-barcode-gap"></div>` : '';
        const barcodes = `${partImg}${gap}${progImg}`;
        return `
            <div class="label-col label-col-left">
                <div class="label-top-spacer"></div>
                <div class="label-barcodes">${barcodes}</div>
                <div class="label-info-gap"></div>
                ${info}
            </div>
            <div class="label-col">
                <div class="label-top-spacer"></div>
                <div class="label-barcodes" style="visibility:hidden">${barcodes}</div>
                <div class="label-info-gap"></div>
                ${info}
            </div>`;
    }

    static labels(target) {
        const container = $('print-container');
        container.innerHTML = '';

        const rows = (target instanceof HTMLElement) ? [target] : Selection.getToolbarTargets();
        if (!rows.length) return;

        const eventName = Settings.get('eventName');
        const logoUrl   = Settings.getRaw('eventLogo') || '';
        const logoHtml  = logoUrl
            ? `<div class="label-logo"><img src="${escapeHtml(logoUrl)}" class="label-logo-img"></div>`
            : '';
        const programCode = Barcodes.programCode();
        const programImg  = programCode ? Barcodes.render(programCode) : null;

        rows.forEach(row => {
            const participant    = Participants.readRow(row);
            const code           = Barcodes.participantCode(participant.license.trim());
            const participantImg = code ? Barcodes.render(code) : null;

            const labelEl = document.createElement('div');
            labelEl.className = 'label';
            labelEl.innerHTML = Printing.buildLabelHtml({ participant, programImg, participantImg, eventName, logoHtml });
            container.appendChild(labelEl);
        });

        setTimeout(() => window.print(), 250);
    }
}

// -----------------------------------------------------------------------------
// Backup (full settings + participants JSON) + reset
// -----------------------------------------------------------------------------

class Backup {
    // Bump the major part when the shape changes incompatibly,
    // the minor part when fields are added in a backward-compatible way.
    static SETTINGS_VERSION     = '1.0';
    static PARTICIPANTS_VERSION = '1.0';

    static majorOf(value) {
        return parseInt(String(value || '0').split('.')[0], 10) || 0;
    }

    static assertCompatibleMajor(incomingVersion, expectedVersion, sectionLabel) {
        if (Backup.majorOf(incomingVersion) !== Backup.majorOf(expectedVersion)) {
            throw new Error(Translations.t('msg.importIncompatible', {
                section: sectionLabel,
                version: incomingVersion,
            }));
        }
    }

    static readWrapper(storageKey, currentVersion, payloadKey, emptyPayload) {
        try {
            const raw = localStorage.getItem(storageKey);
            if (!raw) return { version: currentVersion, [payloadKey]: emptyPayload };
            const wrapper = JSON.parse(raw);
            return {
                version: wrapper.version,
                [payloadKey]: wrapper[payloadKey] ?? emptyPayload,
            };
        } catch (_) {
            return { version: currentVersion, [payloadKey]: emptyPayload };
        }
    }

    static export() {
        const data = {
            settings:     Backup.readWrapper('settings',     Backup.SETTINGS_VERSION,     'data',  {}),
            participants: Backup.readWrapper('participants', Backup.PARTICIPANTS_VERSION, 'items', []),
        };
        const slug = (Settings.get('eventName') || 'event')
            .toLowerCase()
            .normalize('NFKD').replace(/[̀-ͯ]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '') || 'event';
        const now = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        const ts = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}-${pad(now.getMinutes())}`;
        triggerDownload(`${slug}_${ts}.rangeoffice`, new Blob([JSON.stringify(data, null, 2)], { type: 'application/octet-stream' }));
    }

    static import(input) {
        if (!input.files[0]) return;
        if (!confirm(Translations.t('confirm.importOverwrite'))) { input.value = ''; return; }
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);

                if (data.settings && data.settings.data) {
                    Backup.assertCompatibleMajor(data.settings.version, Backup.SETTINGS_VERSION, 'settings');
                    localStorage.setItem('settings', JSON.stringify({
                        version: data.settings.version,
                        data: data.settings.data,
                    }));
                }
                if (data.participants && Array.isArray(data.participants.items)) {
                    Backup.assertCompatibleMajor(data.participants.version, Backup.PARTICIPANTS_VERSION, 'participants');
                    localStorage.setItem('participants', JSON.stringify({
                        version: data.participants.version,
                        items: data.participants.items,
                    }));
                }
                location.reload();
            } catch (err) {
                alert(err.message || Translations.t('msg.importFailed'));
                input.value = '';
            }
        };
        reader.readAsText(input.files[0]);
    }

    static clearAll() {
        if (!confirm(Translations.t('confirm.clearAll'))) return;
        const userPrefs = UserSettings.read();
        localStorage.clear();
        UserSettings.patch(userPrefs); // preserve language and any future user prefs
        sessionStorage.setItem('openSettingsOnLoad', '1');
        location.reload();
    }
}

// -----------------------------------------------------------------------------
// Service worker registration + update prompt
//
// A waiting SW means the browser has fetched a new sw.js and installed it,
// but the old one is still controlling the page. We ask the user before
// taking the new one — useful during a live event where reloads are costly.
// "Cancel" defers the prompt for DEFER_DAYS; the user can also force a check
// from settings (which clears the defer first).
// -----------------------------------------------------------------------------

class Updates {
    static DEFER_DAYS = 2;
    static promptOpen = false;

    static deferUpdates() {
        UserSettings.patch({ updateDeferUntil: computeDeferUntil(Date.now(), Updates.DEFER_DAYS) });
    }

    static promptAndApply(waitingWorker) {
        if (Updates.promptOpen) return;
        if (!isUpdatePromptDue(UserSettings.read().updateDeferUntil, Date.now())) return;
        Updates.promptOpen = true;
        try {
            if (confirm(Translations.t('update.confirmNow'))) {
                navigator.serviceWorker.addEventListener('controllerchange', () => location.reload(), { once: true });
                waitingWorker.postMessage({ type: 'SKIP_WAITING' });
            } else {
                Updates.deferUpdates();
            }
        } finally {
            Updates.promptOpen = false;
        }
    }

    static watch(registration) {
        const considerWorker = (worker) => {
            if (!worker) return;
            const check = () => {
                if (worker.state === 'installed' && navigator.serviceWorker.controller) {
                    Updates.promptAndApply(worker);
                }
            };
            check();
            worker.addEventListener('statechange', check);
        };
        considerWorker(registration.waiting);
        registration.addEventListener('updatefound', () => considerWorker(registration.installing));
    }

    static async checkNow() {
        if (!('serviceWorker' in navigator)) {
            alert(Translations.t('update.checkFailed'));
            return;
        }
        try {
            UserSettings.patch({ updateDeferUntil: 0 });
            const registration = await navigator.serviceWorker.getRegistration();
            if (!registration) { alert(Translations.t('update.checkFailed')); return; }
            await registration.update();
            if (registration.waiting) {
                Updates.promptAndApply(registration.waiting);
            } else if (!registration.installing) {
                alert(Translations.t('update.upToDate'));
            }
            // installing case: the statechange listener installed by watch()
            // will run promptAndApply once it transitions to 'installed'.
        } catch (_) {
            alert(Translations.t('update.checkFailed'));
        }
    }
}

const registerServiceWorker = () => {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('sw.js')
        .then((registration) => Updates.watch(registration))
        .catch(() => {});
};

// -----------------------------------------------------------------------------
// Boot
// -----------------------------------------------------------------------------

class App {
    static populateLanguageSelector() {
        const select = $('language-select');
        select.value = Translations.getLanguage();
        select.addEventListener('change', () => Translations.set(select.value));
    }

    static init() {
        Migrations.run();
        Translations.apply();
        Settings.load();
        Participants.applyColumnVisibility();
        App.populateLanguageSelector();
        Logo.updatePreview();

        Participants.loadStored().forEach(Participants.addRow);
        Participants.addRow(); // trailing empty row
        Toolbar.updateLabels();

        if (sessionStorage.getItem('openSettingsOnLoad')) {
            sessionStorage.removeItem('openSettingsOnLoad');
            Tabs.switch('settings');
        }
    }
}

document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        const tr = document.activeElement?.closest?.('#participants-tbody tr');
        if (tr && !tr.classList.contains('empty-row')) {
            e.preventDefault();
            Printing.labels(tr);
        }
    }
});

window.addEventListener('load', registerServiceWorker);
document.addEventListener('DOMContentLoaded', App.init);

// Expose classes for inline HTML handlers (onclick / oninput / onchange).
Object.assign(window, {
    Translations, Settings, Logo, Tabs, Categories, Barcodes,
    Participants, Selection, Filter, Toolbar, CsvIO, Backup, Printing, Updates,
});
