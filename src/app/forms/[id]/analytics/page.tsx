import { notFound } from "next/navigation";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db/db";
import { forms, formViews, responses } from "@/db/schema";
import { normalizeSchema } from "@/lib/form-types";
import { AppHeader } from "@/components/brand";
import Link from "next/link";
import {
  DistributionChart,
  FunnelChart,
  NpsBoard,
  QuotesCard,
  RatingChart,
  StatCard,
  TimeSeriesChart,
} from "@/components/charts";

export const dynamic = "force-dynamic";

type DayBucket = Map<string, { completed: number; partial: number }>;

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function lastNDays(n: number): string[] {
  const out: string[] = [];
  const today = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

function shortDayLabel(key: string): string {
  const d = new Date(key + "T00:00:00Z");
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

interface ChoiceItem {
  label: string;
  count: number;
}

export default async function AnalyticsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [form] = await db.select().from(forms).where(eq(forms.id, id));
  if (!form) notFound();

  const schema = normalizeSchema(form.publishedSchema ?? form.draftSchema);
  const [rows, partialCount, viewsAgg] = await Promise.all([
    db
      .select()
      .from(responses)
      .where(eq(responses.formId, id))
      .orderBy(desc(responses.createdAt))
      .limit(5000),
    db
      .select({ c: sql<number>`count(*)::int` })
      .from(responses)
      .where(sql`${responses.formId} = ${id} AND ${responses.completed} = false`),
    db.select({ c: sql<number>`count(*)::int` }).from(formViews).where(eq(formViews.formId, id)),
  ]);

  const completedRows = rows.filter((r) => r.completed);
  const partialRows = rows.filter((r) => !r.completed);
  const views = viewsAgg[0]?.c ?? 0;
  const completionRate = views ? Math.round((completedRows.length / views) * 100) : null;

  // submissions per day (last 14 days)
  const buckets: DayBucket = new Map();
  for (const r of rows) {
    const key = dayKey(r.createdAt);
    const b = buckets.get(key) ?? { completed: 0, partial: 0 };
    if (r.completed) b.completed++;
    else b.partial++;
    buckets.set(key, b);
  }
  const series = lastNDays(14).map((key) => {
    const b = buckets.get(key) ?? { completed: 0, partial: 0 };
    return { label: shortDayLabel(key), completed: b.completed, partial: b.partial };
  });

  // per-question visuals over completed responses (partials excluded)
  const questionCards: React.ReactNode[] = [];
  for (const field of schema.fields) {
    const get = (r: (typeof rows)[number]) => (r.answers as Record<string, unknown>)?.[field.id];
    const answeredRows = rows.filter((r) => {
      const v = get(r);
      return v !== undefined && v !== null && !(Array.isArray(v) && v.length === 0) && !(typeof v === "string" && v.trim() === "");
    });

    if (field.type === "choice" || field.type === "dropdown") {
      const counts = new Map<string, number>();
      for (const r of answeredRows) {
        const label = String(get(r)).trim();
        counts.set(label, (counts.get(label) ?? 0) + 1);
      }
      const items: ChoiceItem[] = [...counts.entries()]
        .map(([label, count]) => ({ label, count }))
        .sort((a, b) => b.count - a.count);
      if (items.length > 7) {
        const rest = items.slice(6).reduce((s, i) => s + i.count, 0);
        const top = items.slice(0, 6);
        if (rest > 0) top.push({ label: "Other", count: rest });
        questionCards.push(<DistributionChart key={field.id} title={field.title || "Question"} items={top} answered={answeredRows.length} color="#45644a" />);
      } else if (items.length > 0) {
        questionCards.push(<DistributionChart key={field.id} title={field.title || "Question"} items={items} answered={answeredRows.length} color="#45644a" />);
      } else {
        questionCards.push(<EmptyCard key={field.id} title={field.title} />);
      }
      continue;
    }

    if (field.type === "checkbox") {
      const counts = new Map<string, number>();
      for (const r of answeredRows) {
        const raw = get(r);
        const labels = Array.isArray(raw) ? raw.map(String) : String(raw).split(/\s*,\s*/).filter(Boolean);
        for (const label of labels) counts.set(label, (counts.get(label) ?? 0) + 1);
      }
      const items: ChoiceItem[] = [...counts.entries()]
        .map(([label, count]) => ({ label, count }))
        .sort((a, b) => b.count - a.count);
      if (items.length > 0) {
        questionCards.push(<DistributionChart key={field.id} title={field.title || "Question"} items={items} answered={answeredRows.length} color="#45644a" />);
      } else {
        questionCards.push(<EmptyCard key={field.id} title={field.title} />);
      }
      continue;
    }

    if (field.type === "rating") {
      const start = field.properties?.ratingStart ?? 1;
      const max = field.properties?.ratingMax ?? 5;
      const counts: number[] = new Array(max - start + 1).fill(0);
      for (const r of answeredRows) {
        const n = Number(get(r));
        if (Number.isInteger(n) && n >= start && n <= max) counts[n - start]++;
      }
      if (start === 0 && max === 10 && answeredRows.length > 0) {
        const promoters = counts.slice(9).reduce((s, c) => s + c, 0);
        const passives = counts.slice(7, 9).reduce((s, c) => s + c, 0);
        const detractors = counts.slice(0, 7).reduce((s, c) => s + c, 0);
        const total = answeredRows.length || 1;
        questionCards.push(
          <NpsBoard
            key={field.id}
            title={field.title}
            score={Math.round(((promoters - detractors) / total) * 100)}
            promoters={Math.round((promoters / total) * 100)}
            passives={Math.round((passives / total) * 100)}
            detractors={Math.round((detractors / total) * 100)}
            total={answeredRows.length}
          />
        );
      } else {
        questionCards.push(<RatingChart key={field.id} title={field.title || "Question"} start={start} max={max} counts={counts} answered={answeredRows.length} />);
      }
      continue;
    }

    if (field.type === "text" || field.type === "textarea") {
      const values = completedRows
        .map((r) => String(get(r) ?? "").trim())
        .filter(Boolean);
      questionCards.push(<QuotesCard key={field.id} title={field.title || "Question"} quotes={values.slice(0, 3)} answered={values.length} />);
      continue;
    }

    if (field.type === "number") {
      const nums = answeredRows.map((r) => Number(get(r))).filter((n) => Number.isFinite(n));
      if (nums.length > 0) {
        const avg = nums.reduce((s, n) => s + n, 0) / nums.length;
        questionCards.push(
          <StatCard
            key={field.id}
            label={field.title || "Number"}
            value={Math.round(avg * 10) / 10}
            hint={`average · min ${Math.min(...nums)} · max ${Math.max(...nums)} · ${nums.length} answered`}
          />
        );
      } else {
        questionCards.push(<EmptyCard key={field.id} title={field.title} />);
      }
      continue;
    }

    // email / date / other typed fields → simple answered count
    questionCards.push(
      <StatCard
        key={field.id}
        label={field.title || "Question"}
        value={answeredRows.length}
        hint={`${field.type} answers collected`}
      />
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <AppHeader
        backHref="/"
        title={form.title}
        subtitle={
          <span>
            Analytics · {completedRows.length} completed · {partialRows.length} partial · {views} views
            {completionRate !== null && <> · {Math.min(100, completionRate)}% completion rate</>}
          </span>
        }
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

      <section className="mb-8 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Reach &amp; completion</p>
          <div className="mt-4">
            <FunnelChart
              steps={[
                { label: "Form views", count: views },
                { label: "Started responding", count: rows.length },
                { label: "Completed", count: completedRows.length },
              ]}
            />
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:col-span-2">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Submissions · last 14 days</p>
          <div className="mt-4">
            <TimeSeriesChart data={series} />
          </div>
        </div>
      </section>

      <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-400">Question insights</h2>
      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 p-16 text-center">
          <p className="font-semibold text-slate-700">No data to chart yet</p>
          <p className="mt-1 text-sm text-slate-500">
            {form.status === "published"
              ? "Once people respond, this page fills with charts."
              : "Publish the form to start collecting data."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{questionCards}</div>
      )}
    </div>
  );
}

function EmptyCard({ title }: { title: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm shadow-sm">
      <p className="font-semibold">{title || "Question"}</p>
      <p className="mt-2 text-xs text-slate-400">No answers yet.</p>
    </div>
  );
}
