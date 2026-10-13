import { CHOICE_TYPES, type FormField, type FormSchema, type LogicRule } from "./form-types";

export interface FieldError {
  fieldId: string;
  message: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isEmpty(v: unknown): boolean {
  return (
    v === undefined ||
    v === null ||
    (typeof v === "string" && v.trim() === "") ||
    (Array.isArray(v) && v.length === 0)
  );
}

export function choiceLabels(field: FormField): string[] {
  return (field.properties?.choices ?? []).map((c) => c.label);
}

function checkChoiceValue(field: FormField, s: string): FieldError | null {
  if (!choiceLabels(field).includes(s)) {
    return { fieldId: field.id, message: "Please pick one of the options" };
  }
  return null;
}

/** Evaluate one logic rule against a field's answer. Returns null when unrated. */
export function evaluateRule(rule: LogicRule, answer: unknown): boolean {
  const str = Array.isArray(answer) ? answer.join(", ") : answer === undefined || answer === null ? "" : String(answer);
  switch (rule.kind) {
    case "equals":
      return str.trim() === (rule.value ?? "").trim();
    case "notEquals":
      return str.trim() !== (rule.value ?? "").trim();
    case "contains":
      if (Array.isArray(answer)) return answer.includes(rule.value ?? "");
      return str.trim().toLowerCase().includes((rule.value ?? "").trim().toLowerCase());
    case "answered":
      return str.trim() !== "";
    case "notAnswered":
      return str.trim() === "";
    case "gt": {
      const n = Number(str);
      const t = Number(rule.value);
      return Number.isFinite(n) && Number.isFinite(t) && n > t;
    }
    case "lt": {
      const n = Number(str);
      const t = Number(rule.value);
      return Number.isFinite(n) && Number.isFinite(t) && n < t;
    }
    default:
      return false;
  }
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
    case "date": {
      if (!ISO_DATE_RE.test(String(raw).trim())) {
        return { fieldId: field.id, message: "Please pick a valid date" };
      }
      return null;
    }
    case "checkbox": {
      if (Array.isArray(raw)) {
        const labels = choiceLabels(field);
        if (raw.some((v) => !labels.includes(String(v)))) {
          return { fieldId: field.id, message: "One of the selected options is no longer available" };
        }
        return null;
      }
      return checkChoiceValue(field, String(raw).trim());
    }
    case "choice":
    case "dropdown": {
      return checkChoiceValue(field, String(raw).trim());
    }
    default:
      return null;
  }
}

export type SubmissionResult =
  | { ok: true; cleaned: Record<string, string | number> }
  | { ok: false; errors: FieldError[] };

/**
 * Validate the public submit payload against the form's published schema.
 *
 * `visited` (optional): field ids the respondent actually saw. With branching
 * logic, off-path required fields must NOT block submission — only the fields
 * the respondent answered are type-checked, plus required-and-visited presence.
 * Omitting visited falls back to validating every answered field (old behavior
 * for forms without logic).
 */
export function validateSubmission(schema: FormSchema, body: unknown): SubmissionResult {
  const raw = (body ?? {}) as { answers?: Record<string, unknown>; visited?: string[] };
  const answers = raw.answers ?? {};
  const visited = Array.isArray(raw.visited) ? raw.visited : null;
  const byId = new Map(schema.fields.map((f) => [f.id, f]));
  const cleaned: Record<string, string | number> = {};
  const errors: FieldError[] = [];

  // 1) validate everything that was answered
  for (const [fieldId, value] of Object.entries(answers)) {
    const field = byId.get(fieldId);
    if (!field) continue; // unknown field id — silently drop
    if (isEmpty(value)) continue;
    const err = validateField(field, value);
    if (err) {
      errors.push(err);
      continue;
    }
    if (field.type === "number" || field.type === "rating") {
      cleaned[field.id] = Number(value);
    } else if (field.type === "checkbox") {
      const list = Array.isArray(value) ? value : [value];
      cleaned[field.id] = list.map((v) => String(v).trim()).join(", ");
    } else {
      cleaned[field.id] = String(value).trim();
    }
  }

  // 2) required presence — only for fields the respondent saw when branching is known,
  //    or all required fields when `visited` is unknown (non-logic forms / old clients).
  for (const field of schema.fields) {
    if (!field.required) continue;
    if (field.id in answers) continue; // already validated above
    if (visited && !visited.includes(field.id)) continue; // off the logic path
    const err = validateField(field, undefined);
    if (err) errors.push(err);
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, cleaned };
}

/** Best-effort cleaning for partial (incomplete) responses. No validation. */
export function sanitizePartial(schema: FormSchema, body: unknown): Record<string, string | number> {
  const raw = (body ?? {}) as { answers?: Record<string, unknown> };
  const answers = raw.answers ?? {};
  const byId = new Map(schema.fields.map((f) => [f.id, f]));
  const cleaned: Record<string, string | number> = {};
  for (const [fieldId, value] of Object.entries(answers)) {
    const field = byId.get(fieldId);
    if (!field || isEmpty(value)) continue;
    if (field.type === "number" || field.type === "rating") {
      const n = Number(value);
      if (Number.isFinite(n)) cleaned[field.id] = n;
    } else if (field.type === "checkbox") {
      const list = Array.isArray(value) ? value : [value];
      cleaned[field.id] = list.map((v) => String(v).trim()).join(", ");
    } else if (CHOICE_TYPES.includes(field.type)) {
      cleaned[field.id] = String(value).trim();
    } else {
      cleaned[field.id] = String(value).trim();
    }
  }
  return cleaned;
}
