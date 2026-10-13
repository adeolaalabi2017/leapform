"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";import type { FormField, FormSchema, FormTheme } from "@/lib/form-types";

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

function fieldAnswerText(field: FormField, value: unknown): string {
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

  const fields = schema.fields;
  const isQuestion = typeof stage === "number";
  const index = isQuestion ? (stage as number) : 0;
  const current: FormField | undefined = isQuestion ? fields[index] : undefined;
  const onLastField = isQuestion && index === fields.length - 1;

  const showFieldError = useCallback((message: string) => {
    setError(message);
    setShakeKey((k) => k + 1);
  }, []);

  const startForm = useCallback(() => {
    setStage(hasWelcome ? 0 : 0);
    setError(null);
  }, [hasWelcome]);

  const submit = useCallback(
    async (finalAnswers: Record<string, unknown>) => {
      if (!isPreview && formId) {
        try {
          const res = await fetch(`/f/${formId}/submit`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ answers: finalAnswers }),
          });
          if (!res.ok) {
            const data = (await res.json().catch(() => ({}))) as { errors?: { message: string }[] };
            setSubmitting(false);
            showFieldError(data.errors?.[0]?.message ?? "Something went wrong. Please try again.");
            return;
          }
        } catch {
          setSubmitting(false);
          showFieldError("Network error. Please try again.");
          return;
        }
      }
      setSubmitting(false);
      setStage("done");
    },
    [formId, isPreview, showFieldError]
  );

  const goNext = useCallback(async () => {
    if (stage === "welcome") {
      startForm();
      return;
    }
    if (stage === "done" || !current) return;

    const value = answers[current.id];
    const err = validateLocal(current, value);
    if (err) {
      showFieldError(err);
      return;
    }
    setError(null);

    if (!onLastField) {
      setStage(index + 1);
      return;
    }
    // Last field -> submit all
    const cleaned: Record<string, unknown> = {};
    for (const f of fields) {
      const v = answers[f.id];
      if (v === undefined || v === null || (typeof v === "string" && v.trim() === "")) continue;
      cleaned[f.id] =
        f.type === "number" || f.type === "rating" ? Number(v) : String(v).trim();
    }
    const firstErr = fields
      .map((f) => validateLocal(f, answers[f.id]))
      .find((e) => e !== null);
    if (firstErr) {
      showFieldError(firstErr);
      const i = fields.findIndex((f) => validateLocal(f, answers[f.id]) !== null);
      if (i !== -1 && i !== index) setStage(i);
      return;
    }
    setSubmitting(true);
    await submit(cleaned);
  }, [stage, current, answers, fields, index, onLastField, startForm, showFieldError, submit]);

  const goToPrevious = useCallback(() => {
    if (submitting) return;
    setError(null);
    if (isQuestion && index > 0) setStage(index - 1);
    else if (index === 0 && hasWelcome) setStage("welcome");
  }, [submitting, isQuestion, index, hasWelcome]);

  const setAnswer = useCallback((fieldId: string, value: unknown) => {
    setAnswers((a) => ({ ...a, [fieldId]: value }));
  }, []);

  useEffect(() => {
    if (isQuestion) inputRef.current?.focus();
  }, [stage, isQuestion]);

  // Enter advances from anywhere except buttons (choice buttons handle Enter via
  // native click themselves, avoiding double-advance).
  const goNextRef = useRef<() => void>(() => undefined);
  useEffect(() => {
    goNextRef.current = () => goNext();
  }, [goNext]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Enter" || e.shiftKey) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "BUTTON" || target.tagName === "TEXTAREA")) return;
      e.preventDefault();
      goNextRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // auto-advance for choice/rating selection
  const pickChoice = useCallback(
    (field: FormField, label: string) => {
      setAnswer(field.id, label);
      setError(null);
      if (!onLastField) {
        window.setTimeout(() => setStage((s) => (typeof s === "number" ? s + 1 : s)), 120);
      } else {
        setStage(index); // stays; user presses Enter / clicks Submit
        // auto-submit like typeform? keep explicit for the final question
      }
    },
    [onLastField, index, setAnswer]
  );

  const restart = () => {
    setAnswers({});
    setError(null);
    setStage(hasWelcome ? "welcome" : 0);
  };

  const dark = isDark(theme.background);
  const fg = dark ? "#f3ede3" : "#18442a";
  const fgMuted = dark ? "#b9c7bd" : "#45644a";
  const fontFamily = FONT_STACK[theme.font];

  const progress =
    stage === "welcome" ? 0 : stage === "done" ? 100 : fields.length ? ((index + 1) / fields.length) * 100 : 0;

  return (
    <div
      className="flex min-h-full flex-col"
      style={{ backgroundColor: theme.background, color: fg, fontFamily }}
    >
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
          fg={fg}
          fgMuted={fgMuted}
          accent={theme.color}
          onStart={startForm}
          idPrefix={reactId}
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
          <main className="lf-slide flex w-full max-w-2xl flex-1 flex-col justify-start px-6 pt-[16vh] pb-32 mx-auto">
            <div key={shakeKey} className={error ? "lf-shake" : undefined}>
              <div className="text-sm font-medium" style={{ color: theme.color }}>
                {index + 1} →
              </div>
              <label htmlFor={`${current.id}`} className="mt-2 block text-3xl font-semibold leading-snug">
                {current.title}
                {current.required && (
                  <span aria-hidden="true" style={{ color: current.required ? theme.color : undefined }}>
                    *
                  </span>
                )}
              </label>

              {renderInput(
                current,
                {
                  id: `${current.id}`,
                  ref: inputRef,
                  value: fieldAnswerText(current, answers[current.id]),
                  accent: theme.color,
                  textColor: fg,
                  placeholder: current.placeholder ?? undefined,
                  onChange: (v) => {
                    setAnswer(current.id, v);
                    if (error) setError(null);
                  },
                },
                pickChoice
              )}
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
              {submitting ? "Submitting…" : onLastField ? "Submit" : "OK"}
              <span className="ml-2 hidden opacity-70 sm:inline">press enter ↵</span>
            </button>
          </div>
        </footer>
      )}
    </div>
  );
}

function WelcomeStage({
  schema,
  fg,
  fgMuted,
  accent,
  onStart,
}: {
  schema: FormSchema;
  fg: string;
  fgMuted: string;
  accent: string;
  onStart: () => void;
  idPrefix: string;
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

/* ---------- field validation shared client-side ---------- */

function validateLocal(field: FormField, value: unknown): string | null {
  const empty = value === undefined || value === null || (typeof value === "string" && value.trim() === "");
  if (empty) {
    return field.required ? "This question needs an answer" : null;
  }
  switch (field.type) {
    case "email": {
      const s = String(value).trim();
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) ? null : "Please enter a valid email address";
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
    default:
      return null;
  }
}

/* ---------- inputs per field type ---------- */

interface InputProps {
  id: string;
  ref?: React.Ref<HTMLInputElement>;
  value: string;
  accent: string;
  textColor: string;
  placeholder?: string;
  onChange: (value: string) => void;
}

function renderInput(
  field: FormField,
  props: InputProps,
  pickChoice: (field: FormField, label: string) => void
) {
  const { id, value, accent, textColor, placeholder, onChange } = props;
  const inputClass =
    "mt-6 w-full border-b-2 bg-transparent pb-2 text-xl outline-none focus:ring-0";
  const style = {
    color: textColor,
    borderColor: value ? accent : `${accent}55`,
  };

  if (field.type === "text" || field.type === "email") {
    return (
      <input
        id={id}
        ref={props.ref}
        type={field.type === "email" ? "email" : "text"}
        className={inputClass}
        style={style}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={field.type === "email" ? "email" : "off"}
      />
    );
  }

  if (field.type === "number") {
    return (
      <input
        id={id}
        ref={props.ref}
        type="text"
        inputMode="decimal"
        className={inputClass}
        style={style}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^\d.-]/g, ""))}
      />
    );
  }

  if (field.type === "rating") {
    const max = field.properties?.ratingMax ?? 5;
    const currentRating = Number(fieldAnswerText(field, value)) || 0;
    return (
      <div role="radiogroup" className="mt-6 flex flex-wrap gap-3">
        {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            aria-label={`${n} of ${max}`}
            onClick={() => pickChoice(field, String(n))}
            className="flex h-12 w-12 items-center justify-center rounded-full border-2 text-lg font-semibold transition hover:brightness-110"
            style={{
              backgroundColor: currentRating === n ? accent : "transparent",
              color: currentRating === n ? "#fff" : textColor,
              borderColor: currentRating === n ? accent : `${textColor}44`,
            }}
          >
            {n}
          </button>
        ))}
      </div>
    );
  }

  // choice
  const choices = field.properties?.choices ?? [];
  const selected = value;
  return (
    <div role="radiogroup" className="mt-6 flex flex-col gap-3">
      {choices.map((c, i) => {
        const active = selected === c.label;
        return (
          <button
            key={c.id || i}
            type="button"
            onClick={() => pickChoice(field, c.label)}
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

/* re-export so preview pages can import one symbol */
export { FONT_STACK };
