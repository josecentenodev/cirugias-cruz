/**
 * Echoes submitted `FormData` fields back into a Server Action's return
 * state so a form can repopulate itself on error — `useActionState`
 * re-renders the form fresh on every submission (React 19), and an
 * uncontrolled `<Input>` with no `defaultValue` has nothing to fall back
 * to, so a rejected submission silently wipes what the user typed. Never
 * pass a password field's name here; it's meant only for fields safe to
 * redisplay.
 */
export function valuesFromFormData(
  formData: FormData,
  fields: readonly string[],
): Record<string, string> {
  const values: Record<string, string> = {};
  for (const field of fields) {
    const value = formData.get(field);
    if (typeof value === "string") {
      values[field] = value;
    }
  }
  return values;
}
