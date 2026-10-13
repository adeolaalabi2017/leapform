import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db/db";
import { forms, formViews, responses } from "@/db/schema";
import { normalizeSchema } from "@/lib/form-types";
import { AppHeader } from "@/components/brand";
import { NpsBoard } from "@/components/charts";

export const dynamic = "force-dynamic";

export default async function ResponsesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [form] = await db.select().from(forms).where(eq(forms.id, id));
  if (!form) notFound();

  const schema = normalizeSchema(form.publishedSchema ?? form.draftSchema);
  const [rows, completedAgg, partialAgg, viewsAgg] = await Promise.all([
    db
      .select()
      .from(responses)
      .where(eq(responses.formId, id))
      .orderBy(desc(responses.createdAt))
      .limit(500),
    db
      .select({ c: sql<number>`count(*)::int` })
      .from(responses)
      .where(sql`${responses.formId} = ${id} AND ${responses.completed} = true`),
    db
      .select({ c: sql<number>`count(*)::int` })
      .from(responses)
      .where(sql`${responses.formId} = ${id} AND ${responses.completed} = false`),
    db.select({ c: sql<number>`count(*)::int` }).from(formViews).where(eq(formViews.formId, id)),
  ]);

  const completedCount = completedAgg[0]?.c ?? 0;
  const partialCount = partialAgg[0]?.c ?? 0;
  const viewCount = viewsAgg[0]?.c ?? 0;
  const startCount = completedCount + partialCount;
  const completionRate = viewCount > 0 ? Math.round((completedCount / viewCount) * 100) : null;

  // NPS scoreboard: any 0–10 rating field (started at 0) gets a breakdown.
  const npsFields = schema.fields.filter(
    (f) => f.type === "rating" && f.properties?.ratingStart === 0 && f.properties?.ratingMax === 10
  );
  const completedRows = rows.filter((r) => r.completed);
  const nps = npsFields.map((f) => {
    const scores: number[] = completedRows
      .map((r) => Number((r.answers as Record<string, unknown>)?.[f.id]))
      .filter((n) => Number.isInteger(n) && n >= 0 && n <= 10);
    const promoters = scores.filter((n) => n >= 9).length;
    const passives = scores.filter((n) => n >= 7 && n <= 8).length;
    const detractors = scores.filter((n) => n < 7).length;
    const total = scores.length || 1;
    return {
      title: f.title,
      total: scores.length,
      promoters: Math.round((promoters / total) * 100),
      passives: Math.round((passives / total) * 100),
      detractors: Math.round((detractors / total) * 100),
      score: Math.round(((promoters - detractors) / total) * 100),
    };
  });

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <AppHeader
        backHref="/"
        title={form.title}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-everest px-2.5 py-1 text-[11px] font-semibold text-white">
              {completedCount} completed
            </span>
            {partialCount > 0 && (
              <span className="rounded-full bg-sand px-2.5 py-1 text-[11px] font-medium text-everest">
                {partialCount} partial
              </span>
            )}
            <span className="rounded-full bg-white px-2.5 py-1 text-[11px] ring-1 ring-slate-200">{viewCount} views</span>
            {completionRate !== null && (
              <span className="rounded-full bg-white px-2.5 py-1 text-[11px] ring-1 ring-slate-200">
                {completionRate}% completion rate
              </span>
            )}
          </span>
        }
        actions={
          <>
            <Link
              href={`/forms/${id}/analytics`}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold hover:bg-slate-100"
            >
              📊 Analytics
            </Link>
            <a
              href={`/api/forms/${id}/responses?format=csv`}
              className="rounded-lg bg-everest px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-olive"
            >
              Download CSV
            </a>
          </>
        }
      />

      {nps.length > 0 && (
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {nps.map((n) => (
            <NpsBoard key={n.title} title={n.title} score={n.score} promoters={n.promoters} passives={n.passives} detractors={n.detractors} total={n.total} />
          ))}
        </div>
      )}

      {startCount === 0 ? (
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
              <tr className="border-b border-slate-200 bg-sand/40 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3 font-semibold">Submitted</th>
                <th className="px-4 py-3 font-semibold">Status</th>
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
                  <tr key={r.id} className="border-b border-slate-100 last:border-0 hover:bg-sand/30">
                    <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                      {new Date(r.createdAt).toLocaleString()}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {r.completed ? (
                        <span className="rounded-full bg-everest/10 px-2 py-0.5 text-[10px] font-bold uppercase text-everest">
                          complete
                        </span>
                      ) : (
                        <span className="rounded-full bg-sand px-2 py-0.5 text-[10px] font-bold uppercase text-everest">
                          partial
                        </span>
                      )}
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
