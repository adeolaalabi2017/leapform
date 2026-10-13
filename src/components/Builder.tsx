"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { nanoid } from "nanoid";
import {
  ACCENT_PRESETS,
  BACKGROUND_PRESETS,
  DEFAULT_THEME,
  FIELD_TYPES,
  TYPE_LABELS,
  CHOICE_TYPES,
  type Choice,
  type FieldType,
  type FormField,
  type FormSchema,
  type FormTheme,
  type LogicKind,
  type LogicRule,
} from "@/lib/form-types";

type SaveState = "saved" | "dirty" | "saving" | "error";

const DEFAULT_TITLE_BY_TYPE: Record<FieldType, string> = {
  text: "Short answer question",
  email: "What's your email?",
  number: "Pick a number",
  choice: "Pick one option",
  checkbox: "Select all that apply",
  dropdown: "Choose from a list",
  rating: "How would you rate this?",
  textarea: "Tell us more…",
  date: "What day works for you?",
};

const DEFAULT_PROPERTIES_BY_TYPE: Partial<Record<FieldType, FormField["properties"]>> = {
  choice: {
    choices: [
      { id: "opt_1", label: "Option 1" },
      { id: "opt_2", label: "Option 2" },
    ],
  },
  dropdown: {
    choices: [
      { id: "opt_1", label: "Option 1" },
      { id: "opt_2", label: "Option 2" },
    ],
  },
  checkbox: {
    choices: [
      { id: "opt_1", label: "Option 1" },
      { id: "opt_2", label: "Option 2" },
    ],
  },
  rating: { ratingMax: 5 },
};

export interface BuilderForm {
  id: string;
  title: string;
  status: string;
  draftSchema: FormSchema;
  theme: FormTheme;
  publishedSchema: FormSchema | null;
  notifyEmail: string | null;
}

export default function Builder({ form }: { form: BuilderForm }) {
  const [title, setTitle] = useState(form.title);
  const [notifyEmail, setNotifyEmail] = useState(form.notifyEmail ?? "");
  const [welcome, setWelcome] = useState<string | null>(form.draftSchema.welcome);
  const [completion, setCompletion] = useState<string | null>(form.draftSchema.completion);
  const [fields, setFields] = useState<FormField[]>(form.draftSchema.fields);
  const [theme, setTheme] = useState<FormTheme>(form.theme);
  const [status, setStatus] = useState(form.status);
  const [published, setPublished] = useState<FormSchema | null>(form.publishedSchema);
  const [selected, setSelected] = useState<string | null>(null); // field id | null = form settings
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [copied, setCopied] = useState<"" | "link" | "embed">("");
  const [shareOpen, setShareOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  // ---- autosave (debounced) ----
  const loadedRef = useRef(false);

  useEffect(() => {
    if (!loadedRef.current) {
      loadedRef.current = true;
      return;
    }
    setSaveState("dirty");
    const t = setTimeout(async () => {
      setSaveState("saving");
      const schema: FormSchema = { version: 1, title, welcome, completion, fields };
      try {
        const res = await fetch(`/api/forms/${form.id}`, {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ title, schema, theme, notifyEmail }),
        });
        setSaveState(res.ok ? "saved" : "error");
      } catch {
        setSaveState("error");
      }
    }, 700);
    return () => clearTimeout(t);
  }, [title, welcome, completion, fields, theme, notifyEmail, form.id]);

  const updateField = useCallback((id: string, patch: Partial<FormField>) => {
    setFields((fs) => fs.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  }, []);

  const updateProperties = useCallback(
    (id: string, patch: NonNullable<FormField["properties"]>) => {
      setFields((fs) =>
        fs.map((f) => (f.id === id ? { ...f, properties: { ...f.properties, ...patch } } : f))
      );
    },
    []
  );

  const addField = (type: FieldType) => {
    const field: FormField = {
      id: "fld_" + nanoid(6),
      type,
      title: DEFAULT_TITLE_BY_TYPE[type],
      required: false,
      properties: DEFAULT_PROPERTIES_BY_TYPE[type]
        ? JSON.parse(JSON.stringify(DEFAULT_PROPERTIES_BY_TYPE[type]))
        : undefined,
    };
    setFields((fs) => [...fs, field]);
    setSelected(field.id);
    setAddOpen(false);
  };

  const move = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= fields.length) return;
    setFields((fs) => {
      const copy = [...fs];
      [copy[idx], copy[target]] = [copy[target], copy[idx]];
      return copy;
    });
    setSelected(fields[target].id);
  };

  const duplicate = (idx: number) => {
    const f = fields[idx];
    const clone: FormField = {
      ...f,
      id: "fld_" + nanoid(6),
      properties:
        f.properties && f.properties.choices
          ? { ...f.properties, choices: f.properties.choices.map((c) => ({ ...c })) }
          : f.properties,
    };
    setFields((fs) => [...fs.slice(0, idx + 1), clone, ...fs.slice(idx + 1)]);
    setSelected(clone.id);
  };

  const removeField = (idx: number) => {
    setFields((fs) => fs.filter((_, i) => i !== idx));
    if (selected === fields[idx]?.id) setSelected(null);
  };

  const dirty =
    status !== "published" ||
    JSON.stringify({ version: 1, title, welcome, completion, fields }) !==
      JSON.stringify(published);

  const publish = async () => {
    setPublishing(true);
    setSaveState("saving");
    const schema: FormSchema = { version: 1, title, welcome, completion, fields };
    try {
      // flush a save first (autosave may lag behind)
      await fetch(`/api/forms/${form.id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title, schema, theme, notifyEmail }),
      });
      const res = await fetch(`/api/forms/${form.id}/publish`, { method: "POST" });
      if (res.ok) {
        setPublished(schema);
        setStatus("published");
        setSaveState("saved");
      } else {
        setSaveState("error");
      }
    } catch {
      setSaveState("error");
    }
    setPublishing(false);
  };

  const copyShare = async () => {
    await navigator.clipboard.writeText(`${window.location.origin}/f/${form.id}`);
    setCopied("link");
    setTimeout(() => setCopied(""), 1600);
  };
  void copyShare;

  const selectedField = fields.find((f) => f.id === selected) ?? null;

  return (
    <div className="flex h-screen flex-col bg-off-white">
      {/* top bar */}
      <header className="z-20 flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-2.5 shadow-sm">
        <Link href="/" className="rounded-md px-2 py-1 text-sm font-medium text-slate-500 hover:bg-slate-100">
          ← forms
        </Link>
        <input
          className="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-2 py-1 text-sm font-semibold hover:border-slate-200 focus:border-olive focus:outline-none focus:ring-2 focus:ring-sand"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Form title"
        />
        <span className="hidden self-center rounded-full bg-sand/50 px-2.5 py-1 text-[11px] font-semibold text-everest sm:inline">
          {status === "published" ? "● published" : "● draft"}
        </span>
        <span className="hidden items-center text-xs text-slate-400 sm:flex">
          {saveState === "saved" && "✓ saved"}
          {saveState === "dirty" && "… unsaved"}
          {saveState === "saving" && "… saving"}
          {saveState === "error" && <span className="font-medium text-red-500">save failed — retry on next change</span>}
        </span>
        <Link
          href={`/forms/${form.id}/preview`}
          target="_blank"
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold hover:bg-slate-100"
        >
          Preview
        </Link>
        {status === "published" && (
          <>
            <div className="relative">
              <button
                onClick={() => setShareOpen((o) => !o)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold hover:bg-slate-100"
              >
                Share
              </button>
              {shareOpen && (
                <div className="absolute right-0 top-9 z-40 w-56 space-y-1 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                  <button
                    onClick={async () => {
                      await navigator.clipboard.writeText(`${window.location.origin}/f/${form.id}`);
                      setCopied("link");
                      setTimeout(() => {
                        setCopied("");
                        setShareOpen(false);
                      }, 1400);
                    }}
                    className="w-full rounded-lg px-3 py-2 text-left text-xs font-medium hover:bg-slate-100"
                  >
                    {copied === "link" ? "Link copied ✓" : "🔗 Copy form link"}
                  </button>
                  <button
                    onClick={async () => {
                      await navigator.clipboard.writeText(
                        `<iframe\n  src="${window.location.origin}/f/${form.id}"\n  title="${form.title.replace(/"/g, "")}"\n  style="width:100%;height:720px;border:0;border-radius:12px"\n  loading="lazy"\n></iframe>`
                      );
                      setCopied("embed");
                      setTimeout(() => {
                        setCopied("");
                        setShareOpen(false);
                      }, 1400);
                    }}
                    className="w-full rounded-lg px-3 py-2 text-left text-xs font-medium hover:bg-slate-100"
                  >
                    {copied === "embed" ? "Embed code copied ✓" : "</> Copy embed code"}
                  </button>
                </div>
              )}
            </div>
            <Link
              href={`/forms/${form.id}/responses`}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold hover:bg-slate-100"
            >
              Responses
            </Link>
          </>
        )}
        <button
          onClick={() => void publish()}
          disabled={publishing || !dirty}
          title={dirty ? "Publish to everyone with the link" : "Live version is up to date"}
          className="rounded-lg bg-everest px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-olive disabled:cursor-not-allowed disabled:opacity-40"
        >
          {publishing ? "Publishing…" : status === "published" ? (dirty ? "Publish changes" : "Published ✓") : "Publish"}
        </button>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* question list */}
        <section className="flex w-[340px] shrink-0 flex-col overflow-y-auto border-r border-slate-200 bg-white">
          <div className="border-b border-slate-100 p-4">
            <button
              onClick={() => {
                setSelected(null);
                setAddOpen(false);
              }}
              className={`w-full rounded-lg px-3 py-2 text-left text-sm font-semibold ${
                selected === null ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              ⚙️ Form settings (welcome, theme…)
            </button>
          </div>
          <ol className="flex-1 space-y-2 p-3">
            {fields.map((f, idx) => {
              const active = selected === f.id;
              return (
                <li
                  key={f.id}
                  className={`rounded-xl border p-2 transition ${
                    active
                      ? "border-olive bg-sand/60 shadow-sm"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400">{idx + 1}</span>
                    <input
                      className="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm font-medium focus:outline-none"
                      value={f.title}
                      onFocus={() => setSelected(f.id)}
                      onChange={(e) => updateField(f.id, { title: e.target.value })}
                    />
                  </div>
                  <div className="mt-1 flex items-center gap-1">
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                      {TYPE_LABELS[f.type]}
                    </span>
                    {f.required && (
                      <span className="rounded bg-rose-50 px-1.5 py-0.5 text-[10px] font-medium text-rose-500">
                        required
                      </span>
                    )}
                    <span className="flex-1" />
                    <IconBtn label="Move up" onClick={() => move(idx, -1)} disabled={idx === 0}>
                      ↑
                    </IconBtn>
                    <IconBtn
                      label="Move down"
                      onClick={() => move(idx, 1)}
                      disabled={idx === fields.length - 1}
                    >
                      ↓
                    </IconBtn>
                    <IconBtn label="Duplicate" onClick={() => duplicate(idx)}>
                      ⧉
                    </IconBtn>
                    <IconBtn label="Delete" onClick={() => removeField(idx)} danger>
                      ✕
                    </IconBtn>
                  </div>
                </li>
              );
            })}
          </ol>
          <div className="relative border-t border-slate-100 p-3">
            <button
              onClick={() => setAddOpen((o) => !o)}
              className="w-full rounded-lg border border-dashed border-slate-300 py-2 text-sm font-semibold text-slate-600 hover:border-olive hover:text-everest"
            >
              + Add question
            </button>
            {addOpen && (
              <div className="absolute bottom-16 left-3 right-3 z-30 grid grid-cols-2 gap-1 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                {FIELD_TYPES.map((t) => (
                  <button
                    key={t.type}
                    onClick={() => addField(t.type)}
                    className="rounded-lg px-2 py-2 text-left text-xs font-medium hover:bg-slate-100"
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* settings panel */}
        <section className="flex-1 overflow-y-auto p-8">
          <div className="mx-auto max-w-xl">
            {selectedField ? (
              <FieldSettings
                field={selectedField}
                fields={fields}
                onUpdate={updateField}
                onUpdateProperties={updateProperties}
              />
            ) : (
              <FormSettings theme={theme} setTheme={setTheme} welcome={welcome} setWelcome={setWelcome} completion={completion} setCompletion={setCompletion} onTitle={setTitle} title={title} notifyEmail={notifyEmail} setNotifyEmail={setNotifyEmail} />
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function IconBtn({
  children,
  onClick,
  label,
  disabled,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={`rounded p-1 text-[11px] transition disabled:opacity-25 ${
        danger ? "text-slate-400 hover:bg-red-50 hover:text-red-500" : "text-slate-400 hover:bg-slate-100 hover:text-slate-700"
      }`}
    >
      {children}
    </button>
  );
}

function FieldSettings({
  field,
  fields,
  onUpdate,
  onUpdateProperties,
}: {
  field: FormField;
  fields: FormField[];
  onUpdate: (id: string, patch: Partial<FormField>) => void;
  onUpdateProperties: (id: string, patch: NonNullable<FormField["properties"]>) => void;
}) {
  return (
    <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="rounded bg-sand/50 px-2 py-0.5 text-[11px] font-bold text-everest">
          {TYPE_LABELS[field.type]}
        </span>
        <label className="flex items-center gap-2 text-sm font-medium text-slate-600">
          <input
            type="checkbox"
            checked={field.required}
            onChange={(e) => onUpdate(field.id, { required: e.target.checked })}
            className="h-4 w-4 rounded border-slate-300 accent-everest"
          />
          Required
        </label>
      </div>

      <label className="block">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">Title</span>
        <input
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-olive focus:outline-none focus:ring-2 focus:ring-sand"
          value={field.title}
          onChange={(e) => onUpdate(field.id, { title: e.target.value })}
        />
      </label>

      {(field.type === "text" || field.type === "email" || field.type === "number" || field.type === "textarea" || field.type === "dropdown") && (
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
            Placeholder
          </span>
          <input
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-olive focus:outline-none"
            value={field.placeholder ?? ""}
            placeholder="Type here…"
            onChange={(e) => onUpdate(field.id, { placeholder: e.target.value })}
          />
        </label>
      )}

      {field.type === "number" && (
        <div className="grid grid-cols-2 gap-3">
          {(["min", "max"] as const).map((k) => (
            <label key={k} className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                {k === "min" ? "Minimum (optional)" : "Maximum (optional)"}
              </span>
              <input
                type="number"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-olive focus:outline-none"
                value={field.properties?.[k] ?? ""}
                onChange={(e) =>
                  onUpdateProperties(field.id, {
                    min: e.target.value === "" ? undefined : Number(e.target.value),
                    max: e.target.value === "" ? undefined : Number(e.target.value),
                  })
                }
              />
            </label>
          ))}
        </div>
      )}

      {field.type === "rating" && (
        <>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
              Rating scale
            </span>
            <select
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-olive focus:outline-none"
              value={field.properties?.ratingMax ?? 5}
              onChange={(e) => onUpdateProperties(field.id, { ratingMax: Number(e.target.value) })}
            >
              {[3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                <option key={n} value={n}>
                  1 – {n}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-600">
            <input
              type="checkbox"
              checked={(field.properties?.ratingStart ?? 1) === 0}
              onChange={(e) => onUpdateProperties(field.id, { ratingStart: e.target.checked ? 0 : 1 })}
              className="h-4 w-4 rounded border-slate-300 accent-everest"
            />
            Start scale at 0 (NPS-style, 0–10)
          </label>
        </>
      )}

      {CHOICE_TYPES.includes(field.type) && (
        <div>
          <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-400">
            {field.type === "checkbox" ? "Checkbox options" : "Options"}
          </span>
          <div className="space-y-2">
            {(field.properties?.choices ?? []).map((c: Choice, i: number, arr: Choice[]) => (
              <div key={c.id || i} className="flex items-center gap-2">
                <span className="w-6 text-center text-xs font-bold text-slate-400">
                  {String.fromCharCode(65 + i)}
                </span>
                <input
                  className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-olive focus:outline-none"
                  value={c.label}
                  onChange={(e) => {
                    const choices = arr.map((ch, j) => (j === i ? { ...ch, label: e.target.value } : ch));
                    onUpdateProperties(field.id, { choices });
                  }}
                />
                <button
                  type="button"
                  title="Remove option"
                  aria-label="Remove option"
                  className="rounded px-2 py-1 text-slate-400 hover:bg-red-50 hover:text-red-500"
                  onClick={() => {
                    const choices = arr.filter((_, j) => j !== i);
                    onUpdateProperties(field.id, { choices });
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => {
              const arr = field.properties?.choices ?? [];
              onUpdateProperties(field.id, {
                choices: [...arr, { id: "opt_" + nanoid(4), label: "" }],
              });
            }}
            className="mt-2 text-sm font-semibold text-everest hover:underline"
          >
            + Add option
          </button>
        </div>
      )}

      <LogicEditor field={field} fields={fields.filter((f) => f.id !== field.id)} onUpdate={onUpdate} />
    </div>
  );
}

const LOGIC_KIND_LABELS: { kind: LogicKind; label: string; needsValue: boolean }[] = [
  { kind: "equals", label: "is equal to", needsValue: true },
  { kind: "notEquals", label: "is not equal to", needsValue: true },
  { kind: "contains", label: "contains", needsValue: true },
  { kind: "gt", label: "is greater than", needsValue: true },
  { kind: "lt", label: "is less than", needsValue: true },
  { kind: "answered", label: "is answered", needsValue: false },
  { kind: "notAnswered", label: "is not answered", needsValue: false },
];

function LogicEditor({
  field,
  fields,
  onUpdate,
}: {
  field: FormField;
  fields: FormField[];
  onUpdate: (id: string, patch: Partial<FormField>) => void;
}) {
  const rules = field.logic ?? [];
  const options = (field.properties?.choices ?? []).filter((c) => c.label.trim() !== "");
  const select = (
    value: string,
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void,
    className: string,
    children: React.ReactNode
  ) => (
    <select
      value={value}
      onChange={onChange}
      className={`rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs focus:border-olive focus:outline-none ${className}`}
    >
      {children}
    </select>
  );

  if (fields.length === 0 && rules.length === 0) return null;

  return (
    <div className="border-t border-slate-100 pt-4">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-400">
        Logic rules <span className="font-normal normal-case text-slate-400">(first match wins)</span>
      </span>
      <div className="space-y-3">
        {rules.map((rule, i) => {
          const meta = LOGIC_KIND_LABELS.find((k) => k.kind === rule.kind) ?? LOGIC_KIND_LABELS[0];
          return (
            <div key={rule.id || i} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-bold text-slate-500">If answer</span>
                {select(
                  rule.kind,
                  (e) => {
                    const logic = rules.map((r, j) => (j === i ? { ...r, kind: e.target.value as LogicKind } : r));
                    onUpdate(field.id, { logic });
                  },
                  "",
                  LOGIC_KIND_LABELS.map((k) => (
                    <option key={k.kind} value={k.kind}>
                      {k.label}
                    </option>
                  ))
                )}
                {meta.needsValue &&
                  (options.length > 0 && CHOICE_TYPES.includes(field.type) ? (
                    select(
                      rule.value ?? "",
                      (e) => {
                        const logic = rules.map((r, j) => (j === i ? { ...r, value: e.target.value } : r));
                        onUpdate(field.id, { logic });
                      },
                      "max-w-36",
                      <>
                        <option value="">value…</option>
                        {options.map((c) => (
                          <option key={c.id} value={c.label}>
                            {c.label}
                          </option>
                        ))}
                      </>
                    )
                  ) : (
                    <input
                      className="w-28 rounded-lg border border-slate-200 px-2 py-1.5 text-xs focus:border-olive focus:outline-none"
                      placeholder="value"
                      value={rule.value ?? ""}
                      inputMode={field.type === "number" || field.type === "rating" ? "decimal" : undefined}
                      onChange={(e) => {
                        const logic = rules.map((r, j) => (j === i ? { ...r, value: e.target.value } : r));
                        onUpdate(field.id, { logic });
                      }}
                    />
                  ))}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-bold text-slate-500">Then</span>
                {select(
                  rule.action,
                  (e) => {
                    const logic = rules.map((r, j) =>
                      j === i ? { ...r, action: e.target.value as LogicRule["action"] } : r
                    );
                    onUpdate(field.id, { logic });
                  },
                  "",
                  <>
                    <option value="goto">jump to</option>
                    <option value="complete">complete the form</option>
                  </>
                )}
                {rule.action === "goto" &&
                  select(
                    rule.target ?? "",
                    (e) => {
                      const logic = rules.map((r, j) => (j === i ? { ...r, target: e.target.value || null } : r));
                      onUpdate(field.id, { logic });
                    },
                    "max-w-44",
                    <>
                      <option value="">next question…</option>
                      {fields.map((f, idx) => (
                        <option key={f.id} value={f.id}>
                          {idx + 1}. {f.title || TYPE_LABELS[f.type]}
                        </option>
                      ))}
                    </>
                  )}
                <span className="flex-1" />
                <button
                  type="button"
                  title="Delete rule"
                  aria-label="Delete rule"
                  className="rounded px-2 py-1 text-slate-400 hover:bg-red-50 hover:text-red-500"
                  onClick={() => onUpdate(field.id, { logic: rules.filter((_, j) => j !== i) })}
                >
                  ✕
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <button
        type="button"
        onClick={() =>
          onUpdate(field.id, {
            logic: [
              ...rules,
              {
                id: "rule_" + nanoid(4),
                kind: "equals",
                value: "",
                action: "goto",
                target: null,
              },
            ],
          })
        }
        className="mt-2 text-sm font-semibold text-everest hover:underline"
      >
        + Add logic rule
      </button>
    </div>
  );
}

function FormSettings({
  theme,
  setTheme,
  welcome,
  setWelcome,
  completion,
  setCompletion,
  title,
  onTitle,
  notifyEmail,
  setNotifyEmail,
}: {
  theme: FormTheme;
  setTheme: (t: FormTheme) => void;
  welcome: string | null;
  setWelcome: (v: string | null) => void;
  completion: string | null;
  setCompletion: (v: string | null) => void;
  title: string;
  onTitle: (v: string) => void;
  notifyEmail: string;
  setNotifyEmail: (v: string) => void;
}) {
  return (
    <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-semibold text-slate-400">Form settings</p>

      <label className="block">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
          Form title (shown on the welcome screen)
        </span>
        <input
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-olive focus:outline-none"
          value={title}
          onChange={(e) => onTitle(e.target.value)}
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
          Welcome text (optional)
        </span>
        <textarea
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-olive focus:outline-none"
          rows={3}
          value={welcome ?? ""}
          placeholder="A short intro shown before the first question"
          onChange={(e) => setWelcome(e.target.value)}
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
          Completion message (optional)
        </span>
        <textarea
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-olive focus:outline-none"
          rows={3}
          value={completion ?? ""}
          placeholder="Shown after a successful submission"
          onChange={(e) => setCompletion(e.target.value)}
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
          Email me on every submission (optional)
        </span>
        <input
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-olive focus:outline-none"
          value={notifyEmail}
          placeholder="you@prother.dev"
          onChange={(e) => setNotifyEmail(e.target.value)}
        />
        <span className="mt-1 block text-[11px] text-slate-400">
          Sent from forms@prother.dev right after someone submits this form.
        </span>
      </label>

      <div>
        <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-400">Accent color</span>
        <div className="flex flex-wrap gap-2">
          {ACCENT_PRESETS.map((p) => (
            <button
              key={p.color}
              onClick={() => setTheme({ ...theme, color: p.color })}
              title={p.name}
              className={`h-8 w-8 rounded-full border-2 transition ${
                theme.color === p.color ? "border-slate-900" : "border-transparent hover:border-slate-300"
              }`}
              style={{ backgroundColor: p.color }}
            />
          ))}
        </div>
      </div>

      <div>
        <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-400">Background</span>
        <div className="flex flex-wrap gap-2">
          {BACKGROUND_PRESETS.map((p) => (
            <button
              key={p.value}
              onClick={() => setTheme({ ...theme, background: p.value })}
              title={p.name}
              className={`h-8 w-8 rounded-full border transition ${
                theme.background === p.value ? "border-slate-900" : "border-slate-200 hover:border-slate-400"
              }`}
              style={{ backgroundColor: p.value }}
            />
          ))}
        </div>
      </div>

      <div>
        <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-400">Font</span>
        <div className="flex gap-2">
          {(["sans", "serif", "mono"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setTheme({ ...theme, font: f })}
              className={`rounded-lg border px-4 py-2 text-sm transition ${
                theme.font === f
                  ? "border-everest bg-sand/50 font-semibold text-everest"
                  : "border-slate-200 text-slate-600 hover:border-slate-400"
              }`}
              style={{
                fontFamily:
                  f === "serif"
                    ? "Georgia, serif"
                    : f === "mono"
                      ? "ui-monospace, Menlo, monospace"
                      : "ui-sans-serif, system-ui",
              }}
            >
              {f === "sans" ? "Sans" : f === "serif" ? "Serif" : "Mono"}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export { DEFAULT_THEME };
