// =============================================================================
// Update prompt scheduling — pure time math, no SW interaction.
// =============================================================================

export const computeDeferUntil = (nowMs, days) => nowMs + days * 24 * 60 * 60 * 1000;

export const isUpdatePromptDue = (deferUntilMs, nowMs) => !deferUntilMs || nowMs >= deferUntilMs;
