// =============================================================================
// Pure helpers — no DOM, no localStorage. Safe to import from Node for tests.
// =============================================================================

// -----------------------------------------------------------------------------
// String escaping
// -----------------------------------------------------------------------------

export const escapeHtml = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

export const escapeCsvField = (value, separator) => {
    const str = String(value ?? '');
    if (str.includes(separator) || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return '"' + str.replaceAll('"', '""') + '"';
    }
    return str;
};

// -----------------------------------------------------------------------------
// Translations
// -----------------------------------------------------------------------------

export const TRANSLATIONS = {
    de: {
        'tab.participants':         'Teilnehmer',
        'tab.settings':             'Einstellungen',
        'btn.print':                'Drucken',
        'verb.print':               'drucken',
        'verb.download':            'herunterladen',
        'verb.copy':                'kopieren',
        'verb.delete':              'löschen',
        'count.all':                'Alle',
        'placeholder.filter':       'Suchen…',
        'btn.exportBackup':         'Anlass exportieren',
        'btn.importBackup':         'Anlass importieren',
        'btn.importCsv':            'CSV importieren',
        'msg.csvImported':          '{count} Teilnehmer importiert.',
        'msg.csvImportFailed':      'CSV-Datei konnte nicht gelesen werden.',
        'btn.removeLogo':           'Entfernen',
        'btn.clearAll':             'Alle Daten löschen',
        'confirm.clearAll':         'ACHTUNG: Damit werden alle Einstellungen, das Logo und sämtliche Teilnehmer unwiderruflich gelöscht. Fortfahren?',
        'col.lastName':             'Nachname',
        'col.firstName':            'Vorname',
        'col.yearOfBirth':          'Jahrgang',
        'col.licenseNumber':        'Lizenz-Nr.',
        'col.actions':              'Aktion',
        'placeholder.lastName':     'Nachname',
        'placeholder.firstName':    'Vorname',
        'placeholder.license':      'Lizenz',
        'settings.eventBranding':   'Anlass',
        'settings.eventName':       'Bezeichnung',
        'settings.logo':            'Logo',
        'settings.barcodes':        'Barcode',
        'settings.participantBarcode': 'Teilnehmer-Barcode',
        'settings.programBarcode':  'Programm-Barcode',
        'settings.language':        'Sprache',
        'settings.prefix':          'Prefix',
        'settings.programPrefix':   'Prefix (2st.)',
        'settings.rankingCode':     'Wettbewerbscode',
        'settings.targetCode':      'Stichcode',
        'settings.columns':         'Spalten',
        'settings.licenseEnabled':  'Lizenznummer erfassen',
        'settings.customColumn1':   'Zusatzspalte 1',
        'settings.customColumn2':   'Zusatzspalte 2',
        'placeholder.columnName':   'Spaltenname (leer = ausblenden)',
        'confirm.deleteSelected':   'Markierte Teilnehmer wirklich löschen?',
        'confirm.deleteRow':        'Diesen Teilnehmer wirklich löschen?',
        'confirm.importOverwrite':  'ACHTUNG: Dies überschreibt alle aktuellen Daten. Fortfahren?',
        'msg.importIncompatible':   'Diese Sicherung stammt aus einer inkompatiblen Hauptversion ({section} v{version}). Import nicht möglich.',
        'msg.importFailed':         'Datei konnte nicht eingelesen werden.',
        'category.JJ':              'Jugendliche',
        'category.J':               'Junioren',
        'category.E':               'Elite',
        'category.S':               'Senioren',
        'category.V':               'Veteranen',
        'category.SV':              'Seniorveteranen',
        'category.tooltip':         '{name} (Alter {age})',
        'about.line1':              'Diese Software ist kostenlos und Open Source – entwickelt für die Schweizer Schützenvereine.',
        'about.line2':              'Mithelfen, Fehler melden oder Ideen einbringen:',
        'about.linkLabel':          'Projekt auf GitHub',
    },
    fr: {
        'tab.participants':         'Participants',
        'tab.settings':             'Paramètres',
        'btn.print':                'Imprimer',
        'verb.print':               'imprimer',
        'verb.download':            'télécharger',
        'verb.copy':                'copier',
        'verb.delete':              'supprimer',
        'count.all':                'Tous',
        'placeholder.filter':       'Rechercher…',
        'btn.exportBackup':         'Exporter manifestation',
        'btn.importBackup':         'Importer manifestation',
        'btn.importCsv':            'Importer CSV',
        'msg.csvImported':          '{count} participants importés.',
        'msg.csvImportFailed':      'Impossible de lire le fichier CSV.',
        'btn.removeLogo':           'Supprimer',
        'btn.clearAll':             'Effacer toutes les données',
        'confirm.clearAll':         'ATTENTION : ceci supprimera définitivement tous les paramètres, le logo et les participants. Continuer ?',
        'col.lastName':             'Nom',
        'col.firstName':            'Prénom',
        'col.yearOfBirth':          'Année de naissance',
        'col.licenseNumber':        'N° de licence',
        'col.actions':              'Action',
        'placeholder.lastName':     'Nom',
        'placeholder.firstName':    'Prénom',
        'placeholder.license':      'Licence',
        'settings.eventBranding':   'Manifestation',
        'settings.eventName':       'Titre',
        'settings.logo':            'Logo',
        'settings.barcodes':        'Code-barres',
        'settings.participantBarcode': 'Code-barres participant',
        'settings.programBarcode':  'Code-barres programme',
        'settings.language':        'Langue',
        'settings.prefix':          'Préfixe',
        'settings.programPrefix':   'Préfixe (2 chiffres)',
        'settings.rankingCode':     'Code de concours',
        'settings.targetCode':      'Code de tir',
        'settings.columns':         'Colonnes',
        'settings.licenseEnabled':  'Saisir le numéro de licence',
        'settings.customColumn1':   'Colonne supplémentaire 1',
        'settings.customColumn2':   'Colonne supplémentaire 2',
        'placeholder.columnName':   'Nom de colonne (vide = masquer)',
        'confirm.deleteSelected':   'Supprimer les participants sélectionnés ?',
        'confirm.deleteRow':        'Supprimer ce participant ?',
        'confirm.importOverwrite':  'ATTENTION : ceci écrasera toutes les données actuelles. Continuer ?',
        'msg.importIncompatible':   'Cette sauvegarde provient d’une version majeure incompatible ({section} v{version}). Import impossible.',
        'msg.importFailed':         'Le fichier n’a pas pu être lu.',
        'category.JJ':              'Jeunes',
        'category.J':               'Juniors',
        'category.E':               'Élite',
        'category.S':               'Seniors',
        'category.V':               'Vétérans',
        'category.SV':              'Super-vétérans',
        'category.tooltip':         '{name} (âge {age})',
        'about.line1':              'Ce logiciel est gratuit et open source – développé pour la Société de Tir suisse.',
        'about.line2':              'Contribuer, signaler un bug ou proposer une idée :',
        'about.linkLabel':          'Projet sur GitHub',
    },
};

export const DEFAULT_LANGUAGE = 'de';

export const translate = (dict, key, params = {}) => {
    let str = dict[key] ?? key;
    for (const [k, v] of Object.entries(params)) {
        str = str.replaceAll(`{${k}}`, v);
    }
    return str;
};

// -----------------------------------------------------------------------------
// Categories
// -----------------------------------------------------------------------------

export const CATEGORY_RANGES = [
    { code: 'JJ', minAge: 10, maxAge: 16 },
    { code: 'J',  minAge: 17, maxAge: 20 },
    { code: 'E',  minAge: 21, maxAge: 45 },
    { code: 'S',  minAge: 46, maxAge: 59 },
    { code: 'V',  minAge: 60, maxAge: 69 },
    { code: 'SV', minAge: 70, maxAge: Infinity },
];

export const getCategory = (yearOfBirth, currentYear) => {
    const year = parseInt(yearOfBirth, 10);
    if (!year || year < 1900 || year > 2100) return null;
    const age = currentYear - year;
    const range = CATEGORY_RANGES.find(r => age >= r.minAge && age <= r.maxAge);
    return range ? { code: range.code, age } : null;
};

export const expandTwoDigitYear = (raw, currentYear) => {
    if (!/^\d{1,2}$/.test(raw)) return null;
    const twoDigit = parseInt(raw, 10);
    const pivot = currentYear % 100;
    return (twoDigit <= pivot) ? 2000 + twoDigit : 1900 + twoDigit;
};

// -----------------------------------------------------------------------------
// Barcodes
// -----------------------------------------------------------------------------

export const computeChecksum = (digits) => {
    try {
        const n = BigInt(digits.replace(/\D/g, ''));
        let r = (n * -3n) % 97n;
        if (r < 0n) r += 97n;
        return r.toString().padStart(2, '0');
    } catch (_) {
        return '00';
    }
};

export const buildProgramCode = ({ prefix, ranking, target }) => {
    const r = (ranking || '').trim();
    const t = (target || '').trim();
    if (!r || !t) return null;
    const p = (prefix || '').padStart(2, '0');
    const base = p + r.padStart(3, '0') + t.padStart(3, '0');
    return base + computeChecksum(base);
};

export const buildParticipantCode = ({ prefix, license, enabled }) => {
    if (!enabled) return null;
    const digits = (license || '').replace(/\D/g, '');
    if (!digits) return null;
    const base = (prefix || '') + digits.padStart(6, '0');
    return base + computeChecksum(base);
};

// -----------------------------------------------------------------------------
// CSV parsing
// -----------------------------------------------------------------------------

export const parseCsv = (text, separator) => {
    const rows = [];
    let row = [], field = '', inQuotes = false;
    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (inQuotes) {
            if (ch === '"') {
                if (text[i + 1] === '"') { field += '"'; i++; }
                else inQuotes = false;
            } else field += ch;
        } else if (ch === '"') {
            inQuotes = true;
        } else if (ch === separator) {
            row.push(field); field = '';
        } else if (ch === '\n') {
            row.push(field); rows.push(row); row = []; field = '';
        } else if (ch !== '\r') {
            field += ch;
        }
    }
    if (field || row.length) { row.push(field); rows.push(row); }
    return rows.filter(r => r.some(c => c.trim() !== ''));
};

export const detectSeparator = (line) => {
    const counts = { ';': 0, ',': 0, '\t': 0 };
    let inQ = false;
    for (const ch of line) {
        if (ch === '"') inQ = !inQ;
        else if (!inQ && counts[ch] !== undefined) counts[ch]++;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0] || ';';
};

// fields = [{ key, aliases?, currentHeader? }]
export const matchHeaderKey = (header, fields) => {
    const norm = header.trim().toLowerCase();
    for (const f of fields) {
        if (f.aliases?.includes(norm)) return f.key;
        if (f.currentHeader && f.currentHeader.toLowerCase() === norm) return f.key;
    }
    return null;
};
