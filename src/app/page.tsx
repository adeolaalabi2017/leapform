import Link from "next/link";
import { desc } from "drizzle-orm";
import { db } from "@/db/db";
import { forms } from "@/db/schema";
import { NewFormButton, DeleteFormButton } from "./DashboardActions";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const rows = await db
    .select({
      id: forms.id,
      title: forms.title,
      status: forms.status,
      updatedAt: forms.updatedAt,
    })
    .from(forms)
    .orderBy(desc(forms.updatedAt));

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-10 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Leap<span className="text-everest">form</span>
          </h1>
          <p className="mt-1 text-sm text-slate-500">Conversational forms — one question at a time.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/templates"
            className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-olive hover:text-everest"
          >
            Browse templates
          </Link>
          <NewFormButton />
        </div>
      </header>

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
                  href={`/forms/${form.id}/responses`}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold hover:bg-slate-100"
                >
                  Responses
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
