/**
 * Pure gate for the type-to-confirm delete dialog (`DangerousConfirm`).
 * Kept in its own framework-free module so the rule ("confirm is enabled
 * only when the typed phrase matches exactly") is unit-testable without
 * rendering a Client Component.
 *
 * Match is exact after trimming surrounding whitespace on both sides and
 * case-sensitive — the user must reproduce the phrase deliberately. An
 * empty or whitespace-only required phrase never matches (guards against
 * a caller passing a blank name).
 */
export function matchesConfirmationPhrase(typed: string, required: string): boolean {
  const target = required.trim();
  if (target.length === 0) return false;
  return typed.trim() === target;
}
