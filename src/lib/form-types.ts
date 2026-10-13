export type FieldType =
  | "text"
  | "email"
  | "number"
  | "choice"
  | "rating"
  | "checkbox"
  | "dropdown"
  | "textarea"
  | "date";

export interface Choice {
  id: string;
  label: string;
}

export interface FormField {
  id: string;
  type: FieldType;
  title: string;
  required: boolean;
  placeholder?: string;
  properties?: {
    choices?: Choice[];
    ratingMax?: number;
    /** Rating scales can start at 1 (default) or 0 (NPS-style). */
    ratingStart?: number;
    min?: number;
    max?: number;
  };
  /** Order-sensitive: first matching rule wins. */
  logic?: LogicRule[];
}

export interface FormSchema {
  version: 1;
  title: string;
  welcome: string | null;
  completion: string | null;
  fields: FormField[];
}

export type ThemeFont = "sans" | "serif" | "mono";

export interface FormTheme {
  color: string;
  font: ThemeFont;
  background: string;
}

export const DEFAULT_THEME: FormTheme = {
  color: "#18442a",
  font: "sans",
  background: "#f3ede3",
};

export const ACCENT_PRESETS = [
  { name: "Everest", color: "#18442a" },
  { name: "Olive", color: "#45644a" },
  { name: "Sand", color: "#e4dbc4" },
  { name: "Off White", color: "#f3ede3" },
];

export const BACKGROUND_PRESETS = [
  { name: "Off White", value: "#f3ede3" },
  { name: "Sand", value: "#e4dbc4" },
  { name: "Olive", value: "#45644a" },
  { name: "Everest", value: "#18442a" },
];

export const FIELD_TYPES: { type: FieldType; label: string }[] = [
  { type: "text", label: "Short text" },
  { type: "email", label: "Email" },
  { type: "number", label: "Number" },
  { type: "choice", label: "Multiple choice" },
  { type: "checkbox", label: "Checkboxes" },
  { type: "dropdown", label: "Dropdown" },
  { type: "rating", label: "Rating" },
  { type: "textarea", label: "Long text" },
  { type: "date", label: "Date" },
];

export const TYPE_LABELS: Record<FieldType, string> = {
  text: "Short text",
  email: "Email",
  number: "Number",
  choice: "Multiple choice",
  checkbox: "Checkboxes",
  dropdown: "Dropdown",
  rating: "Rating",
  textarea: "Long text",
  date: "Date",
};

export const CHOICE_TYPES: FieldType[] = ["choice", "dropdown", "checkbox"];

export type LogicKind = "equals" | "notEquals" | "contains" | "answered" | "notAnswered" | "gt" | "lt";

export interface LogicRule {
  id: string;
  kind: LogicKind;
  value?: string;
  /** "goto" jumps to target field; "complete" ends the form. */
  action: "goto" | "complete";
  target?: string | null;
}

export function emptyForm(): FormSchema {
  return {
    version: 1,
    title: "Untitled form",
    welcome: null,
    completion: null,
    fields: [],
  };
}

export function isFieldType(v: unknown): v is FieldType {
  return (
    typeof v === "string" &&
    ["text", "email", "number", "choice", "rating", "checkbox", "dropdown", "textarea", "date"].includes(v)
  );
}

const LOGIC_KINDS: LogicKind[] = [
  "equals",
  "notEquals",
  "contains",
  "answered",
  "notAnswered",
  "gt",
  "lt",
];

function normalizeLogic(input: unknown): LogicRule[] | undefined {
  if (!Array.isArray(input) || input.length === 0) return undefined;
  const rules: LogicRule[] = input.slice(0, 10).map((r: unknown, i: number) => {
    const raw = (r ?? {}) as Record<string, unknown>;
    const kind = LOGIC_KINDS.includes(raw.kind as LogicKind) ? (raw.kind as LogicKind) : "answered";
    return {
      id: typeof raw.id === "string" && raw.id ? raw.id.slice(0, 40) : `rule_${i}`,
      kind,
      value: typeof raw.value === "string" ? raw.value.slice(0, 200) : undefined,
      action: raw.action === "complete" ? "complete" : "goto",
      target: typeof raw.target === "string" && raw.target ? raw.target.slice(0, 40) : null,
    };
  });
  return rules;
}

/** Clamp an arbitrary parsed-JSON value into a valid FormSchema (used for API inputs). */
export function normalizeSchema(input: unknown): FormSchema {
  const raw = (input ?? {}) as Record<string, unknown>;
  const fieldsRaw = Array.isArray(raw.fields) ? raw.fields : [];
  const fields: FormField[] = fieldsRaw.map((uncased) => {
    const f = (uncased ?? {}) as Record<string, unknown>;
    const props = (f.properties ?? {}) as Record<string, unknown>;
    return {
      id: typeof f.id === "string" && f.id ? f.id.slice(0, 40) : "fld_" + Math.random().toString(36).slice(2, 8),
      type: isFieldType(f.type) ? f.type : "text",
      title: typeof f.title === "string" ? f.title.slice(0, 500) : "",
      required: f.required === true,
      placeholder: typeof f.placeholder === "string" ? f.placeholder.slice(0, 200) : undefined,
      logic: normalizeLogic(f.logic),
      properties: {
        choices: Array.isArray(props.choices)
          ? props.choices.slice(0, 20).map((c: unknown, i: number) => {
              const ch = (c ?? {}) as Record<string, unknown>;
              return {
                id: typeof ch.id === "string" && ch.id ? ch.id : `opt_${i}`,
                label: typeof ch.label === "string" ? ch.label.slice(0, 200) : "",
              };
            })
          : undefined,
        ratingMax: clampInt(props.ratingMax, 2, 10) ?? 5,
        ratingStart: clampInt(props.ratingStart, 0, 1) ?? 1,
        min: props.min === undefined ? undefined : clampInt(props.min, -1e9, 1e9),
        max: props.max === undefined ? undefined : clampInt(props.max, -1e9, 1e9),
      },
    };
  });
  return {
    version: 1,
    title: typeof raw.title === "string" ? raw.title.slice(0, 200) : "Untitled form",
    welcome: typeof raw.welcome === "string" ? raw.welcome.slice(0, 500) : null,
    completion: typeof raw.completion === "string" ? raw.completion.slice(0, 500) : null,
    fields,
  };
}

export function normalizeTheme(input: unknown): FormTheme {
  const raw = (input ?? {}) as Record<string, unknown>;
  const hex = typeof raw.color === "string" && /^#[0-9a-f]{6}$/i.test(raw.color) ? raw.color : undefined;
  const bg =
    typeof raw.background === "string" && /^#[0-9a-f]{6}$/i.test(raw.background) ? raw.background : undefined;
  return {
    color: hex ?? DEFAULT_THEME.color,
    font: raw.font === "serif" || raw.font === "mono" ? raw.font : "sans",
    background: bg ?? DEFAULT_THEME.background,
  };
}

function clampInt(v: unknown, min: number, max: number): number | undefined {
  const n = typeof v === "number" && Number.isFinite(v) ? Math.round(v) : undefined;
  if (n === undefined) return undefined;
  return Math.min(max, Math.max(min, n));
}
