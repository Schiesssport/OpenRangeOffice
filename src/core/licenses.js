// =============================================================================
// License-number normalisation, Swiss date parsing, and search helpers.
// =============================================================================

export const normalizeLicense = (raw) => {
    const digits = String(raw ?? '').replace(/\D/g, '');
    return digits ? digits.padStart(6, '0') : '';
};

export const parseSwissDateYear = (dateString) => {
    const match = String(dateString ?? '').match(/(\d{4})\s*$/);
    return match ? match[1] : '';
};

export const findDuplicateLicense = (candidate, others) => {
    const target = normalizeLicense(candidate);
    if (!target) return false;
    return others.some(other => normalizeLicense(other) === target);
};

export const tokenizeQuery = (query) =>
    String(query ?? '').trim().toLowerCase().split(/\s+/).filter(Boolean);

export const recordMatchesTerms = (record, terms) => {
    const haystack = `${record.lastName ?? ''} ${record.firstName ?? ''}`.toLowerCase();
    return terms.every(term => haystack.includes(String(term).toLowerCase()));
};
