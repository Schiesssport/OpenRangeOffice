// =============================================================================
// CSV parsing and delimiter sniffing.
// =============================================================================

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
