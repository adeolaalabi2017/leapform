import type { FormField, FormSchema } from "./form-types";

export interface FieldError {
  fieldId: string;
  message: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isEmpty(v: unknown): boolean {
  return v === undefined || v === null || (typeof v === "string" && v.trim() === "");
}

export function validateField(field: FormField, raw: unknown): FieldError | null {
  if (isEmpty(raw)) {
    return field.required
      ? { fieldId: field.id, message: "This question needs an answer" }
      : null;
  }
  switch (field.type) {
    case "email": {
      const s = String(raw).trim();
      if (!EMAIL_RE.test(s)) return { fieldId: field.id, message: "Please enter a valid email address" };
      return null;
    }
    case "number": {
      const n = Number(raw);
      if (!Number.isFinite(n)) return { fieldId: field.id, message: "Please enter a number" };
      const min = field.properties?.min;
      const max = field.properties?.max;
      if (min !== undefined && n < min) return { fieldId: field.id, message: `Value must be at least ${min}` };
      if (max !== undefined && n > max) return { fieldId: field.id, message: `Value must be at most ${max}` };
      return null;
    }
    case "rating": {
      const n = Number(raw);
      const max = field.properties?.ratingMax ?? 5;
      if (!Number.isInteger(n) || n < 1 || n > max) {
        return { fieldId: field.id, message: `Please pick a rating between 1 and ${max}` };
      }
      return null;
    }
    case "choice": {
      const choices = field.properties?.choices ?? [];
      const s = String(raw).trim();
      if (!choices.some((c) => c.label === s)) {
        return { fieldId: field.id, message: "Please pick one of the options" };
      }
      return null;
    }
    default:
      return null;
  }
}

export type SubmissionResult =
  | { ok: true; cleaned: Record<string, string | number> }
  | { ok: false; errors: FieldError[] };

/** Validate the public submit payload against the form's published schema. */
export function validateSubmission(schema: FormSchema, body: unknown): SubmissionResult {
  const raw = (body ?? {}) as { answers?: Record<string, unknown> };
  const answers = raw.answers ?? {};
  const cleaned: Record<string, string | number> = {};
  const errors: FieldError[] = [];
  for (const field of schema.fields) {
    const value = answers[field.id];
    const err = validateField(field, value);
    if (err) {
      errors.push(err);
      continue;
    }
    if (value === undefined || value === null) continue;
    if (field.type === "number" || field.type === "rating") {
      cleaned[field.id] = Number(value);
    } else {
      cleaned[field.id] = String(value).trim();
    }
  }
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, cleaned };
}
