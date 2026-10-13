import Link from "next/link";
import { desc, sql } from "drizzle-orm";
import { db } from "@/db/db";
import { forms, formViews, responses } from "@/db/schema";
import { AppHeader } from "@/components/brand";
import { NewFormButton, DeleteFormButton } from "../DashboardActions";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const [rows, formAgg, respAgg, viewAgg] = await Promise.all([
    db
      .select({
        id: forms.id,
        title: forms.title,
        status: forms.status,
        updatedAt: forms.updatedAt,
      })
      .from(forms)
      .orderBy(desc(forms.updatedAt)),
    db.select({ c: sql<number>`count(*)::int` }).from(forms),
    db.select({ c: sql<number>`count(*)::int` }).from(responses),
    db.select({ c: sql<number>`count(*)::int` }).from(formViews),
  ]);
  const stats = {
    forms: formAgg[0]?.c ?? 0,
    responses: respAgg[0]?.c ?? 0,
    views: viewAgg[0]?.c ?? 0,
  };

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <AppHeader
        subtitle="Conversational forms — one question at a time."
        actions={
          <>
            <Link
              href="/templates"
              className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-olive hover:text-everest"
            >
              Browse templates
            </Link>
            <NewFormButton />
          </>
        }
      />

      {stats.forms > 0 && (
        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <MiniStat label="Forms" value={stats.forms} />
          <MiniStat label="Responses collected" value={stats.responses} />
          <MiniStat label="Form views" value={stats.views} />
        </div>
      )}

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 p-16 text-center">
          <p className="text-lg font-semibold text-slate-700">No forms yet</p>
          <p className="mt-1 text-sm text-slate-500">
            Create from scratch, or browse our{" "}
            <Link href="/templates" className="font-medium text-everest underline decoration-sand decoration-2 underline-offset-2">
              ready-made templates
            </Link>{" "}
            — from NPS to healthcare surveys.
          </p>
        </div>
      ) : (
        <ul className="grid gap-4">
          {rows.map((form) => (
            <li
              key={form.id}
              className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-olive hover:shadow-md"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                      form.status === "published"
                        ? "bg-emerald-50 text-emerald-600"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {form.status}
                  </span>
                  <span className="text-xs text-slate-400">
                    updated {new Date(form.updatedAt).toLocaleString()}
                  </span>
                </div>
                <p className="mt-1 truncate text-lg font-semibold">{form.title}</p>
                <p className="mt-0.5 truncate text-xs text-slate-400">share link: /f/{form.id}</p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/forms/${form.id}`}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold hover:bg-slate-100"
                >
                  Edit
                </Link>
                <Link
                  href={`/forms/${form.id}/analytics`}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold hover:bg-slate-100"
                >
                  Analytics
                </Link>
                {form.status === "published" && (
                  <Link
                    href={`/f/${form.id}`}
                    target="_blank"
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold hover:bg-slate-100"
                  >
                    Open ↗
                  </Link>
                )}
                <DeleteFormButton id={form.id} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
      <p className="mt-0.5 text-2xl font-bold text-everest">{value}</p>
    </div>
  );
}
