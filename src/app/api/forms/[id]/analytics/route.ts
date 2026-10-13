import { and, eq, gte } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db/db";
import { forms, formViews, responses } from "@/db/schema";
import { normalizeSchema } from "@/lib/form-types";

type Ctx = { params: Promise<{ id: string }> };

const DAY_MS = 86_400_000;

function nonEmpty(v: unknown): boolean {
  return (
    v !== undefined &&
    v !== null &&
    !(Array.isArray(v) && v.length === 0) &&
    !(typeof v === "string" && v.trim() === "")
  );
}

function median(nums: number[]): number | null {
  if (nums.length === 0) return null;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round(((sorted[mid - 1] + sorted[mid]) / 2) * 10) / 10;
}

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function weekKey(d: Date): string {
  const date = new Date(d);
  const day = (date.getUTCDay() + 6) % 7; // Monday = 0
  date.setUTCDate(date.getUTCDate() - day);
  return date.toISOString().slice(0, 10);
}

function shortDay(d: Date): string {
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export async function GET(req: Request, { params }: Ctx) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const range = searchParams.get("range") === "7" ? 7 : searchParams.get("range") === "all" ? 0 : 30;

  const [form] = await db.select().from(forms).where(eq(forms.id, id));
  if (!form) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const schema = normalizeSchema(form.publishedSchema ?? form.draftSchema);

  const now = new Date();
  const periodStart = range ? new Date(now.getTime() - range * DAY_MS) : new Date(0);
  const prevStart = range ? new Date(now.getTime() - range * 2 * DAY_MS) : null;

  // responses in current + previous window (single query when possible)
  const rows = await db
    .select()
    .from(responses)
    .where(and(eq(responses.formId, id), gte(responses.createdAt, prevStart ?? periodStart)));

  const inCurrent = (r: { createdAt: Date }) => r.createdAt >= periodStart;
  const currentRows = rows.filter((r) => inCurrent(r));
  const prevRows = prevStart ? rows.filter((r) => r.createdAt < periodStart) : [];

  const viewRows = await db
    .select({ createdAt: formViews.createdAt })
    .from(formViews)
    .where(and(eq(formViews.formId, id), gte(formViews.createdAt, prevStart ?? periodStart)));
  const currentViews = viewRows.filter((v) => inCurrent(v)).length;
  const prevViews = prevStart ? viewRows.length - currentViews : 0;

  const summarize = (rs: typeof rows, views: number) => {
    const completed = rs.filter((r) => r.completed).length;
    const partial = rs.length - completed;
    return {
      views,
      started: rs.length,
      completed,
      partial,
      completionRate: views ? Math.min(100, Math.round((completed / views) * 100)) : null,
    };
  };

  const totals = {
    current: summarize(currentRows, currentViews),
    previous: prevStart ? summarize(prevRows, prevViews) : null,
  };

  /* daily buckets */
  let dailyLength = range ?? 90;
  if (!range) {
    const earliest = rows.length
      ? Math.min(...rows.map((r) => r.createdAt.getTime()))
      : now.getTime();
    dailyLength = Math.min(90, Math.max(1, Math.ceil((now.getTime() - earliest) / DAY_MS)));
  }
  const daily: { date: string; label: string; completed: number; partial: number; cumulative: number }[] = [];
  let cumulative = 0;
  for (let i = dailyLength - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * DAY_MS);
    const key = dayKey(d);
    const dayRows = currentRows.filter((r) => dayKey(r.createdAt) === key);
    const completed = dayRows.filter((r) => r.completed).length;
    const partial = dayRows.length - completed;
    cumulative += dayRows.length;
    daily.push({ date: key, label: shortDay(d), completed, partial, cumulative });
  }

  /* drop-off: for every schema position count how many respondents reached it */
  const lastSeenIdx = (r: (typeof rows)[number], completed: boolean) => {
    if (completed) return schema.fields.length;
    let max = -1;
    const answers = r.answers as Record<string, unknown>;
    schema.fields.forEach((f, idx) => {
      if (nonEmpty(answers[f.id])) max = idx;
    });
    return max;
  };
  const completedSet = new Set(currentRows.filter((r) => r.completed).map((r) => r.id));
  const seen = schema.fields.map(() => 0);
  for (const r of currentRows) {
    const last = lastSeenIdx(r, completedSet.has(r.id));
    for (let i = 0; i <= Math.min(last, schema.fields.length - 1); i++) seen[i]++;
  }
  const startedCount = currentRows.length;
  const dropoff = schema.fields.map((f, idx) => {
    const reached = seen[idx];
    const before = idx === 0 ? startedCount : seen[idx - 1];
    return {
      id: f.id,
      title: f.title || `Question ${idx + 1}`,
      reached,
      dropped: Math.max(0, before - reached),
    };
  });

  /* weekly trends per rating field */
  const ratingFields = schema.fields.filter((f) => f.type === "rating");
  const weeks: string[] = [];
  if (currentRows.length > 0) {
    const earliest = Math.min(...currentRows.map((r) => r.createdAt.getTime()));
    const w = new Date(weekKey(new Date(earliest)) + "T00:00:00Z");
    while (w.getTime() <= now.getTime()) {
      weeks.push(weekKey(w));
      w.setUTCDate(w.getUTCDate() + 7);
    }
  }
  const trends = {
    weeks: weeks.map((w) => {
      const d = new Date(w + "T00:00:00Z");
      return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
    }),
    series: ratingFields.map((f) => {
      const start = f.properties?.ratingStart ?? 1;
      const max = f.properties?.ratingMax ?? 5;
      const isNps = start === 0 && max === 10;
      const points = weeks.map((w) => {
        const scores = currentRows
          .filter((r) => r.completed && weekKey(r.createdAt) === w)
          .map((r) => Number((r.answers as Record<string, unknown>)?.[f.id]))
          .filter((n) => Number.isInteger(n) && n >= start && n <= max);
        if (scores.length === 0) return null;
        if (isNps) {
          const promoters = scores.filter((n) => n >= 9).length;
          const detractors = scores.filter((n) => n < 7).length;
          return Math.round(((promoters - detractors) / scores.length) * 100);
        }
        return Math.round((scores.reduce((s, n) => s + n, 0) / scores.length) * 10) / 10;
      });
      return { fieldId: f.id, title: f.title || "Rating", isNps, points };
    }),
  };

  /* per-question payload (computed over current period, as before) */
  const answeredRows = (field: typeof schema.fields[number]) =>
    currentRows.filter((r) => nonEmpty((r.answers as Record<string, unknown>)?.[field.id]));
  const completedRows = currentRows.filter((r) => r.completed);

  const perField = schema.fields.map((field) => {
    const base = { id: field.id, type: field.type, title: field.title || `Question ${field.id}` };
    if (field.type === "choice" || field.type === "dropdown") {
      const counts = new Map<string, number>();
      for (const r of answeredRows(field)) {
        const label = String((r.answers as Record<string, unknown>)?.[field.id]).trim();
        counts.set(label, (counts.get(label) ?? 0) + 1);
      }
      const items = [...counts.entries()]
        .map(([label, count]) => ({ label, count }))
        .sort((a, b) => b.count - a.count);
      return { ...base, kind: "distribution" as const, answered: answeredRows(field).length, items };
    }
    if (field.type === "checkbox") {
      const counts = new Map<string, number>();
      for (const r of answeredRows(field)) {
        const raw = (r.answers as Record<string, unknown>)?.[field.id];
        const labels = Array.isArray(raw) ? raw.map(String) : String(raw).split(/\s*,\s*/).filter(Boolean);
        for (const label of labels) counts.set(label, (counts.get(label) ?? 0) + 1);
      }
      const items = [...counts.entries()]
        .map(([label, count]) => ({ label, count }))
        .sort((a, b) => b.count - a.count);
      return { ...base, kind: "distribution" as const, answered: answeredRows(field).length, items };
    }
    if (field.type === "rating") {
      const start = field.properties?.ratingStart ?? 1;
      const max = field.properties?.ratingMax ?? 5;
      const counts: number[] = new Array(max - start + 1).fill(0);
      for (const r of answeredRows(field)) {
        const n = Number((r.answers as Record<string, unknown>)?.[field.id]);
        if (Number.isInteger(n) && n >= start && n <= max) counts[n - start]++;
      }
      const answered = currentRows.filter((r) => nonEmpty((r.answers as Record<string, unknown>)?.[field.id])).length;
      if (start === 0 && max === 10) {
        const promoters = counts.slice(9).reduce((s, c) => s + c, 0);
        const passives = counts.slice(7, 9).reduce((s, c) => s + c, 0);
        const detractors = counts.slice(0, 7).reduce((s, c) => s + c, 0);
        const total = answered || 1;
        return {
          ...base,
          kind: "nps" as const,
          answered,
          score: Math.round(((promoters - detractors) / total) * 100),
          promoters: Math.round((promoters / total) * 100),
          passives: Math.round((passives / total) * 100),
          detractors: Math.round((detractors / total) * 100),
        };
      }
      return { ...base, kind: "rating" as const, answered, start, max, counts };
    }
    if (field.type === "text" || field.type === "textarea") {
      const values = completedRows
        .map((r) => String((r.answers as Record<string, unknown>)?.[field.id] ?? "").trim())
        .filter(Boolean);
      return { ...base, kind: "quotes" as const, answered: values.length, quotes: values.slice(0, 3) };
    }
    if (field.type === "number") {
      const nums = answeredRows(field)
        .map((r) => Number((r.answers as Record<string, unknown>)?.[field.id]))
        .filter((n) => Number.isFinite(n));
      const avg = nums.length ? Math.round((nums.reduce((s, n) => s + n, 0) / nums.length) * 10) / 10 : null;
      return {
        ...base,
        kind: "number" as const,
        answered: nums.length,
        avg,
        min: nums.length ? Math.min(...nums) : null,
        max: nums.length ? Math.max(...nums) : null,
      };
    }
    return { ...base, kind: "count" as const, answered: answeredRows(field).length };
  });

  /* median completion time (session-tracked only) */
  const durations = completedRows
    .filter((r) => r.updatedAt && r.updatedAt.getTime() > r.createdAt.getTime())
    .map((r) => (r.updatedAt.getTime() - r.createdAt.getTime()) / 1000)
    .filter((s) => s >= 2);

  return NextResponse.json({
    range,
    generatedAt: now.toISOString(),
    totals,
    daily,
    dropoff,
    trends,
    perField,
    completionTimeMedianSec: median(durations),
  });
}
