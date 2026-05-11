// =============================================================================
// Shooter age categories and two-digit-year disambiguation.
// =============================================================================

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
