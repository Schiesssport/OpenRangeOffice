// =============================================================================
// String escaping — HTML for innerHTML safety, CSV for RFC 4180 quoting.
// =============================================================================

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
