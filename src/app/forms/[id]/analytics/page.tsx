import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/db";
import { forms } from "@/db/schema";
import { normalizeSchema } from "@/lib/form-types";
import { AppHeader } from "@/components/brand";
import AnalyticsDashboard from "@/components/AnalyticsDashboard";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [form] = await db.select().from(forms).where(eq(forms.id, id));
  if (!form) notFound();

  const schema = normalizeSchema(form.publishedSchema ?? form.draftSchema);
  const visibleFields = schema.fields.filter((f) =>
    ["choice", "dropdown", "checkbox", "rating", "number", "text", "textarea"].includes(f.type)
  );

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <AppHeader
        backHref="/dashboard"
        title={form.title}
        subtitle={<span>Analytics · interactive, computed live from the responses table</span>}
        actions={
          <>
            <Link
              href={`/forms/${id}`}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold hover:bg-slate-100"
            >
              Edit form
            </Link>
            <Link
              href={`/forms/${id}/responses`}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold hover:bg-slate-100"
            >
              Responses
            </Link>
          </>
        }
      />

      {visibleFields.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 p-16 text-center">
          <p className="font-semibold text-slate-700">This form has no chartable questions yet</p>
          <p className="mt-1 text-sm text-slate-500">
            Add questions in the builder to unlock the full analytics dashboard.
          </p>
        </div>
      ) : (
        <AnalyticsDashboard formId={form.id} />
      )}
    </div>
  );
}
