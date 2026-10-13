import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db/db";
import { forms, responses } from "@/db/schema";
import { normalizeSchema } from "@/lib/form-types";

export const dynamic = "force-dynamic";

export default async function ResponsesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [form] = await db.select().from(forms).where(eq(forms.id, id));
  if (!form) notFound();

  const schema = normalizeSchema(form.publishedSchema ?? form.draftSchema);
  const rows = await db
    .select()
    .from(responses)
    .where(eq(responses.formId, id))
    .orderBy(desc(responses.createdAt))
    .limit(500);

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link href="/" className="text-sm text-slate-500 hover:underline">
            ← forms
          </Link>
          <h1 className="mt-1 truncate text-2xl font-bold">{form.title}</h1>
          <p className="text-sm text-slate-500">
            {rows.length} response{rows.length === 1 ? "" : "s"} · status: {form.status}
          </p>
        </div>
        <a
          href={`/api/forms/${id}/responses?format=csv`}
          className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-indigo-500"
        >
          Download CSV
        </a>
      </header>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 p-16 text-center">
          <p className="font-semibold text-slate-700">No responses yet</p>
          <p className="mt-1 text-sm text-slate-500">
            {form.status === "published"
              ? "Share the form link to start collecting."
              : "Publish the form to start collecting responses."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3 font-semibold">Submitted</th>
                {schema.fields.map((f) => (
                  <th key={f.id} className="px-4 py-3 font-semibold">
                    {f.title || f.id}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const answers = r.answers as Record<string, unknown>;
                return (
                  <tr key={r.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                      {new Date(r.createdAt).toLocaleString()}
                    </td>
                    {schema.fields.map((f) => (
                      <td key={f.id} className="px-4 py-3 align-top">
                        {answers?.[f.id] === undefined || answers?.[f.id] === null ? (
                          <span className="text-slate-300">—</span>
                        ) : (
                          String(answers[f.id])
                        )}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
