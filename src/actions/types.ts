export type ActionState =
  | {
      ok?: boolean;
      error?: string;
      fieldErrors?: Record<string, string>;
      /** Submitted values, echoed back on error so the form can be re-filled */
      values?: Record<string, string>;
    }
  | undefined;

/** First zod issue per field → { field: message } */
export function toFieldErrors(issues: { path: PropertyKey[]; message: string }[]) {
  const out: Record<string, string> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}

/**
 * Plain string values from a submitted form (React resets uncontrolled forms
 * after an action, so we send these back and use them as defaultValue).
 */
export function formValues(formData: FormData, omit: string[] = []): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of formData) {
    if (key.startsWith("$") || omit.includes(key) || typeof value !== "string") continue;
    out[key] = value;
  }
  return out;
}
