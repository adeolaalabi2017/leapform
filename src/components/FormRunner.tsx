"use client";

import { nanoid } from "nanoid";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { CHOICE_TYPES, type FormField, type FormSchema, type FormTheme } from "@/lib/form-types";
import { evaluateRule } from "@/lib/validate";

const FONT_STACK: Record<FormTheme["font"], string> = {
  sans: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  serif: "Georgia, 'Times New Roman', Times, serif",
  mono: "ui-monospace, 'SF Mono', Menlo, Consolas, monospace",
};

type Stage = number | "welcome" | "done";

function isDark(hex: string): boolean {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 120;
}

function isEmptyAnswer(v: unknown): boolean {
  return (
    v === undefined ||
    v === null ||
    (typeof v === "string" && v.trim() === "") ||
    (Array.isArray(v) && v.length === 0)
  );
}

/** Final payload: coerce number-ish answers, pass the rest through. */
function collectAnswers(fields: FormField[], answers: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of fields) {
    const v = answers[f.id];
    if (isEmptyAnswer(v)) continue;
    if (f.type === "number" || f.type === "rating") out[f.id] = Number(v);
    else if (Array.isArray(v)) out[f.id] = v;
    else out[f.id] = typeof v === "string" ? v.trim() : v;
  }
  return out;
}

function answerText(field: FormField, value: unknown): string {
  if (Array.isArray(value)) return value.join(", ");
  return value === undefined || value === null ? "" : String(value);
}

export default function FormRunner({
  schema,
  theme,
  formId,
  isPreview = false,
}: {
  schema: FormSchema;
  theme: FormTheme;
  /** Present only when actually collecting (public page); preview passes none. */
  formId?: string;
  isPreview?: boolean;
}) {
  const hasWelcome = Boolean(schema.welcome && schema.welcome.trim());
  const [stage, setStage] = useState<Stage>(hasWelcome ? "welcome" : 0);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [error, setError] = useState<string | null>(null);
  const [shakeKey, setShakeKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const reactId = useId();
  const sessionIdRef = useRef<string>("");
  const submittedRef = useRef(false);

  const fields = schema.fields;
  const isQuestion = typeof stage === "number";
  const index = isQuestion ? (stage as number) : 0;
  const current: FormField | undefined = isQuestion ? fields[index] : undefined;

  const showFieldError = useCallback((message: string) => {
    setError(message);
    setShakeKey((k) => k + 1);
  }, []);

  const startForm = useCallback(() => {
    setStage(0);
    setError(null);
  }, [hasWelcome]);

  // Session id ties partial updates to the final submission
  useEffect(() => {
    if (isPreview || !formId) return;
    try {
      const key = `lf_sid_${formId}`;
      const existing = window.sessionStorage.getItem(key);
      if (!existing) {
        const sid = nanoid(16);
        window.sessionStorage.setItem(key, sid);
      }
    } catch {
      /* storage unavailable — partials still post with a fresh id */
    }
  }, [formId, isPreview]);

  /** Branching: follow the answered path; stop at the first empty field on it. */
  const computeNextStage = useCallback(
    (fromIndex: number, allAnswers: Record<string, unknown>): Stage => {
      let idx = fromIndex;
      let guard = 0;
      while (guard++ < fields.length + 5) {
        const field = fields[idx];
        if (!field) return fields.length;
        const answer = allAnswers[field.id];
        let next: Stage = idx + 1;
        for (const rule of field.logic ?? []) {
          if (evaluateRule(rule, answer)) {
            if (rule.action === "complete") return "done";
            const t = rule.target ? fields.findIndex((f) => f.id === rule.target) : -1;
            next = t === -1 || t === idx ? idx + 1 : t;
            break;
          }
        }
        if (typeof next !== "number") return next; // "done"
        if (next >= fields.length) return fields.length; // path complete → submit
        const target = fields[next];
        if (target && isEmptyAnswer(allAnswers[target.id])) return next; // unanswered → ask it
        idx = next;
      }
      return fields.length;
    },
    [fields]
  );

  // Persist partial answers (debounced) for analytics + abandonment
  const partialTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (isPreview || !formId || submittedRef.current) return;
    if (Object.keys(answers).length === 0) return;
    if (partialTimer.current) clearTimeout(partialTimer.current);
    partialTimer.current = setTimeout(() => {
      let sid = "";
      try {
        sid = window.sessionStorage.getItem(`lf_sid_${formId}`) ?? nanoid(16);
      } catch {
        sid = nanoid(16);
      }
      void fetch(`/f/${formId}/partial`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId: sid, answers }),
      }).catch(() => undefined);
    }, 1200);
    return () => {
      if (partialTimer.current) clearTimeout(partialTimer.current);
    };
  }, [answers, formId, isPreview]);

  const submit = useCallback(
    async (allAnswers: Record<string, unknown>) => {
      // One last client-side pass over everything that was answered
      const cleaned = collectAnswers(fields, allAnswers);
      const firstErr = fields
        .filter((f) => !isEmptyAnswer(allAnswers[f.id]))
        .map((f) => ({ f, e: validateLocal(f, allAnswers[f.id]) }))
        .find((x) => x.e !== null);
      if (firstErr && firstErr.e) {
        setSubmitting(false);
        showFieldError(firstErr.e);
        const i = fields.findIndex((f) => f.id === firstErr.f.id);
        if (i !== -1 && i !== index) setStage(i);
        return;
      }
      if (!isPreview && formId) {
        submittedRef.current = true;
        try {
          let sid: string | undefined;
          try {
            sid = window.sessionStorage.getItem(`lf_sid_${formId}`) ?? undefined;
          } catch {
            sid = undefined;
          }
          const res = await fetch(`/f/${formId}/submit`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              answers: cleaned,
              visited: Object.keys(cleaned),
              sessionId: sid,
            }),
          });
          if (!res.ok) {
            const data = (await res.json().catch(() => ({}))) as { errors?: { message: string }[] };
            submittedRef.current = false;
            setSubmitting(false);
            showFieldError(data.errors?.[0]?.message ?? "Something went wrong. Please try again.");
            return;
          }
        } catch {
          submittedRef.current = false;
          setSubmitting(false);
          showFieldError("Network error. Please try again.");
          return;
        }
      }
      setSubmitting(false);
      setStage("done");
    },
    [fields, isPreview, formId, showFieldError, index]
  );

  const goNext = useCallback(async () => {
    if (stage === "welcome") {
      startForm();
      return;
    }
    if (stage === "done" || !current || submitting) return;

    const value = answers[current.id];
    const err = validateLocal(current, value);
    if (err) {
      showFieldError(err);
      return;
    }
    setError(null);

    const next = computeNextStage(index, answers);
    const finishing = next === "done" || (typeof next === "number" && next >= fields.length);
    if (finishing) {
      setSubmitting(true);
      await submit(answers);
    } else {
      setStage(next as number);
    }
  }, [stage, current, answers, fields.length, index, submitting, startForm, showFieldError, computeNextStage, submit]);

  const pickChoice = useCallback(
    (field: FormField, label: string) => {
      const merged = { ...answers, [field.id]: label };
      setAnswers(merged);
      setError(null);
      const next = computeNextStage(index, merged);
      const finishing = next === "done" || (typeof next === "number" && next >= fields.length);
      window.setTimeout(async () => {
        if (finishing) {
          setSubmitting(true);
          await submit(merged);
        } else {
          setStage(next as number);
        }
      }, 120);
    },
    [answers, index, fields.length, computeNextStage, submit]
  );

  const pickCheckbox = useCallback(
    (field: FormField, label: string, checked: boolean) => {
      const existing = Array.isArray(answers[field.id]) ? (answers[field.id] as string[]) : [];
      const nextList = checked ? [...existing, label] : existing.filter((l) => l !== label);
      setAnswers({ ...answers, [field.id]: nextList });
      if (error) setError(null);
    },
    [answers, error]
  );

  const goToPrevious = useCallback(() => {
    if (submitting) return;
    setError(null);
    if (isQuestion && index > 0) setStage(index - 1);
    else if (index === 0 && hasWelcome) setStage("welcome");
  }, [submitting, isQuestion, index, hasWelcome]);

  // Enter advances from anywhere; Shift/Ctrl+Enter also advances long text.
  const goNextRef = useRef<() => void>(() => undefined);
  useEffect(() => {
    goNextRef.current = () => {
      void goNext();
    };
  }, [goNext]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Enter") return;
      const target = e.target as HTMLElement | null;
      if (target?.tagName === "BUTTON") return; // native click handles buttons
      if (target?.tagName === "TEXTAREA" && !(e.shiftKey || e.ctrlKey || e.metaKey)) {
        return; // leave plain Enter for newlines in long text
      }
      e.preventDefault();
      goNextRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const restart = () => {
    setAnswers({});
    setError(null);
    submittedRef.current = false;
    setStage(hasWelcome ? "welcome" : 0);
  };

  const dark = isDark(theme.background);
  const fg = dark ? "#f3ede3" : "#18442a";
  const fgMuted = dark ? "#b9c7bd" : "#45644a";
  const fontFamily = FONT_STACK[theme.font];

  const nextStage = isQuestion ? computeNextStage(index, answers) : null;
  const finishing =
    nextStage === "done" || (typeof nextStage === "number" && nextStage >= fields.length);
  const progress =
    stage === "welcome" ? 0 : stage === "done" ? 100 : fields.length ? ((index + 1) / fields.length) * 100 : 0;

  return (
    <div className="flex min-h-full flex-col" style={{ backgroundColor: theme.background, color: fg, fontFamily }}>
      {/* progress bar */}
      <div className="fixed inset-x-0 top-0 z-10 h-1">
        <div
          className="h-full transition-all duration-300"
          style={{ width: `${progress}%`, backgroundColor: theme.color }}
        />
      </div>

      {stage === "welcome" ? (
        <WelcomeStage
          schema={schema}
          fgMuted={fgMuted}
          accent={theme.color}
          onStart={startForm}
        />
      ) : fields.length === 0 ? (
        <div className="flex flex-1 items-center justify-center p-8 text-center text-lg" style={{ color: fgMuted }}>
          This form has no questions yet.
        </div>
      ) : stage === "done" ? (
        <DoneStage
          schema={schema}
          fg={fg}
          fgMuted={fgMuted}
          accent={theme.color}
          isPreview={isPreview}
          onRestart={restart}
        />
      ) : (
        current && (
          <main className="lf-slide mx-auto flex w-full max-w-2xl flex-1 flex-col justify-start px-6 pt-[16vh] pb-32">
            <div key={shakeKey} className={error ? "lf-shake" : undefined}>
              <div className="text-sm font-medium" style={{ color: theme.color }}>
                {index + 1} →
              </div>
              <label htmlFor={`${current.id}`} className="mt-2 block text-3xl font-semibold leading-snug">
                {current.title}
                {current.required && (
                  <span aria-hidden="true" style={{ color: theme.color }}>
                    *
                  </span>
                )}
              </label>

              {renderInput(current, {
                id: `${current.id}`,
                inputRef,
                value: answerText(current, answers[current.id]),
                selected: answers[current.id],
                accent: theme.color,
                textColor: fg,
                placeholder: current.placeholder ?? undefined,
                onChange: (v) => {
                  setAnswers((a) => ({ ...a, [current.id]: v }));
                  if (error) setError(null);
                },
                onPick: pickChoice,
                onCheck: pickCheckbox,
              })}
            </div>

            {error && (
              <p className="lf-fade mt-4 text-sm font-medium text-red-600" role="alert">
                {error}
              </p>
            )}
          </main>
        )
      )}

      {isQuestion && current && (
        <footer className="fixed bottom-6 left-1/2 w-full max-w-2xl -translate-x-1/2 px-6">
          <div className="flex items-center gap-3">
            {index > 0 && !submitting && (
              <button
                type="button"
                onClick={goToPrevious}
                className="rounded-full border px-3 py-2 text-sm font-medium hover:opacity-80"
                style={{ borderColor: fgMuted, color: fgMuted }}
              >
                ↑
              </button>
            )}
            <button
              type="button"
              onClick={() => void goNext()}
              disabled={submitting}
              className="rounded-full px-8 py-3 text-sm font-semibold text-white shadow-md transition hover:brightness-110 disabled:opacity-60"
              style={{ backgroundColor: theme.color }}
            >
              {submitting ? "Submitting…" : finishing ? "Submit" : "OK"}
              <span className="ml-2 hidden opacity-70 sm:inline">{hintFor(current.type)}</span>
            </button>
          </div>
        </footer>
      )}
    </div>
  );
}

function hintFor(type: FormField["type"]): string {
  if (type === "textarea") return "shift+enter ↵";
  if (type === "date") return "pick a date ↵";
  return "press enter ↵";
}

/* ---------- field validation (client-side mirror of lib/validate) ---------- */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function choiceLabels(field: FormField): string[] {
  return (field.properties?.choices ?? []).map((c) => c.label);
}

function validateLocal(field: FormField, value: unknown): string | null {
  if (isEmptyAnswer(value)) {
    return field.required ? "This question needs an answer" : null;
  }
  const labels = choiceLabels(field);
  switch (field.type) {
    case "email": {
      const s = String(value).trim();
      return EMAIL_RE.test(s) ? null : "Please enter a valid email address";
    }
    case "number": {
      const n = Number(value);
      if (!Number.isFinite(n)) return "Please enter a number";
      const min = field.properties?.min;
      const max = field.properties?.max;
      if (min !== undefined && n < min) return `Value must be at least ${min}`;
      if (max !== undefined && n > max) return `Value must be at most ${max}`;
      return null;
    }
    case "rating": {
      const n = Number(value);
      const max = field.properties?.ratingMax ?? 5;
      if (!Number.isInteger(n) || n < 1 || n > max) return `Please pick a rating between 1 and ${max}`;
      return null;
    }
    case "date": {
      return ISO_DATE_RE.test(String(value).trim()) ? null : "Please pick a valid date";
    }
    case "checkbox": {
      const list = Array.isArray(value) ? value.map(String) : [String(value)];
      return list.every((l) => labels.includes(l)) ? null : "One of the selected options is no longer available";
    }
    case "choice":
    case "dropdown": {
      return labels.includes(String(value).trim()) ? null : "Please pick one of the options";
    }
    default:
      return null;
  }
}

/* ---------- inputs per field type ---------- */

interface InputProps {
  id: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
  value: string;
  selected: unknown;
  accent: string;
  textColor: string;
  placeholder?: string;
  onChange: (value: string) => void;
  onPick: (field: FormField, label: string) => void;
  onCheck: (field: FormField, label: string, checked: boolean) => void;
}

function renderInput(field: FormField, props: InputProps) {
  const { id, inputRef, value, selected, accent, textColor, placeholder, onChange, onPick, onCheck } = props;
  const inputClass = "mt-6 w-full border-b-2 bg-transparent pb-2 text-xl outline-none focus:ring-0";
  const inputStyle = { color: textColor, borderColor: value ? accent : `${accent}55` };

  if (field.type === "text" || field.type === "email" || field.type === "number") {
    return (
      <input
        id={id}
        ref={inputRef}
        data-first="1"
        type={field.type === "email" ? "email" : "text"}
        inputMode={field.type === "number" ? "decimal" : undefined}
        className={inputClass}
        style={inputStyle}
        placeholder={placeholder}
        value={value}
        onChange={(e) =>
          onChange(field.type === "number" ? e.target.value.replace(/[^\d.-]/g, "") : e.target.value)
        }
        autoComplete={field.type === "email" ? "email" : "off"}
      />
    );
  }

  if (field.type === "date") {
    return (
      <input
        id={id}
        type="date"
        className={inputClass}
        style={{ ...inputStyle, borderColor: value ? accent : `${accent}55` }}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }

  if (field.type === "textarea") {
    return (
      <textarea
        id={id}
        rows={4}
        className={`${inputClass} resize-none rounded-2xl border-2 px-4 py-3`}
        style={{ color: textColor, borderColor: `${accent}55`, backgroundColor: `${accent}08` }}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }

  const choices = field.properties?.choices ?? [];

  if (field.type === "dropdown") {
    return (
      <select
        id={id}
        value={value}
        onChange={(e) => {
          if (e.target.value) onPick(field, e.target.value);
          else onChange("");
        }}
        className="mt-6 w-full rounded-xl border-2 bg-white/70 px-4 py-3 text-lg outline-none"
        style={{ color: value ? textColor : `${textColor}99`, borderColor: `${accent}55` }}
      >
        <option value="" disabled>
          {placeholder || "Select an option…"}
        </option>
        {choices.map((c) => (
          <option key={c.id} value={c.label}>
            {c.label}
          </option>
        ))}
      </select>
    );
  }

  if (field.type === "checkbox") {
    const checkedList = Array.isArray(selected) ? (selected as string[]) : [];
    return (
      <div role="group" className="mt-6 flex flex-col gap-3">
        {choices.map((c, i) => {
          const active = checkedList.includes(c.label);
          return (
            <label
              key={c.id || i}
              className="flex w-full cursor-pointer items-center gap-3 rounded-xl border bg-white/60 px-4 py-3 text-left text-lg transition hover:brightness-95"
              style={{
                borderColor: active ? accent : `${accent}44`,
                borderWidth: active ? "2px" : "1px",
              }}
            >
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => onCheck(field, c.label, e.target.checked)}
                className="h-5 w-5 rounded accent-current"
                style={{ accentColor: accent }}
              />
              {c.label}
            </label>
          );
        })}
      </div>
    );
  }

  // choice (single-select, auto-advance)
  return (
    <div role="radiogroup" className="mt-6 flex flex-col gap-3">
      {choices.map((c, i) => {
        const active = selected === c.label;
        return (
          <button
            key={c.id || i}
            type="button"
            onClick={() => onPick(field, c.label)}
            className="flex w-full items-center gap-3 rounded-xl border bg-white/60 px-4 py-3 text-left text-lg transition hover:brightness-95 dark:bg-black/10"
            style={{
              borderColor: active ? accent : `${accent}44`,
              borderWidth: active ? "2px" : "1px",
              boxShadow: active ? `0 1px 6px ${accent}33` : undefined,
            }}
          >
            <span
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border-2 text-xs font-bold uppercase"
              style={{
                borderColor: active ? accent : `${textColor}55`,
                color: active ? "#fff" : textColor,
                backgroundColor: active ? accent : "transparent",
              }}
            >
              {String.fromCharCode(65 + i)}
            </span>
            {c.label}
          </button>
        );
      })}
    </div>
  );
}


function WelcomeStage({
  schema,
  fgMuted,
  accent,
  onStart,
}: {
  schema: FormSchema;
  fgMuted: string;
  accent: string;
  onStart: () => void;
}) {
  return (
    <main className="lf-fade mx-auto flex w-full max-w-2xl flex-1 flex-col justify-start px-6 pt-[20vh] pb-32">
      <h1 className="text-4xl font-bold leading-tight">{schema.title}</h1>
      {schema.welcome && <p className="mt-4 text-lg opacity-80">{schema.welcome}</p>}
      <div className="mt-8">
        <button
          type="button"
          onClick={onStart}
          className="rounded-full px-8 py-3 text-sm font-semibold text-white shadow-md transition hover:brightness-110"
          style={{ backgroundColor: accent }}
        >
          Start
          <span className="ml-2 hidden opacity-70 sm:inline">press enter ↵</span>
        </button>
      </div>
      <p className="mt-6 text-sm" style={{ color: fgMuted }}>
        {schema.fields.length} question{schema.fields.length === 1 ? "" : "s"} · takes about a minute
      </p>
    </main>
  );
}

function DoneStage({
  schema,
  fg,
  fgMuted,
  accent,
  isPreview,
  onRestart,
}: {
  schema: FormSchema;
  fg: string;
  fgMuted: string;
  accent: string;
  isPreview: boolean;
  onRestart: () => void;
}) {
  return (
    <main className="lf-fade mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center px-6 text-center">
      <div
        className="mb-6 flex h-16 w-16 items-center justify-center rounded-full text-3xl text-white"
        style={{ backgroundColor: accent }}
      >
        ✓
      </div>
      <h1 className="text-3xl font-bold">{schema.completion || "Thanks for your response!"}</h1>
      {isPreview && (
        <button
          type="button"
          onClick={onRestart}
          className="mt-8 rounded-full border px-6 py-2 text-sm font-medium hover:opacity-80"
          style={{ borderColor: fgMuted, color: fg }}
        >
          ↺ Restart preview
        </button>
      )}
    </main>
  );
}
