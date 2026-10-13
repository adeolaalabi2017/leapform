import Link from "next/link";
import { TEMPLATES } from "@/lib/templates";
import { AppHeader } from "@/components/brand";
import { UseTemplateButton } from "./TemplateGrid";

export const metadata = { title: "Templates — Leapform" };

export default function TemplatesPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <AppHeader
        backHref="/dashboard"
        title="Template gallery"
        subtitle="Start from a proven questionnaire. Every template is fully editable after you use it."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TEMPLATES.map((t) => (
          <article
            key={t.id}
            className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-olive hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-2">
              <span
                className="flex h-10 w-10 items-center justify-center rounded-xl text-xl text-white"
                style={{ backgroundColor: t.theme.color }}
              >
                {t.icon}
              </span>
              <div className="flex flex-col items-end gap-1">
                <span className="rounded-full bg-sand/50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-everest">
                  {t.category}
                </span>
                <span className="text-[10px] font-medium text-slate-400">
                  {t.schema.fields.length} questions
                </span>
              </div>
            </div>
            <h3 className="mt-3 text-sm font-bold leading-snug">{t.name}</h3>
            <p className="mt-1 flex-1 text-xs leading-relaxed text-slate-500">{t.description}</p>
            <div className="mt-4">
              <UseTemplateButton templateId={t.id} name={t.name} />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
