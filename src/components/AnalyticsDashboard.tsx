"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { DistributionChart, FunnelChart, NpsBoard, QuotesCard, RatingChart, StatCard } from "@/components/charts";

type Range = "7" | "30" | "all";

interface Totals {
  views: number;
  started: number;
  completed: number;
  partial: number;
  completionRate: number | null;
}

type PerField =
  | { id: string; type: string; title: string; kind: "distribution"; answered: number; items: { label: string; count: number }[] }
  | { id: string; type: string; title: string; kind: "nps"; answered: number; score: number; promoters: number; passives: number; detractors: number }
  | { id: string; type: string; title: string; kind: "rating"; answered: number; start: number; max: number; counts: number[] }
  | { id: string; type: string; title: string; kind: "quotes"; answered: number; quotes: string[] }
  | { id: string; type: string; title: string; kind: "number"; answered: number; avg: number | null; min: number | null; max: number | null }
  | { id: string; type: string; title: string; kind: "count"; answered: number };

interface AnalyticsData {
  range: Range;
  totals: { current: Totals; previous: Totals | null };
  daily: { date: string; label: string; completed: number; partial: number; cumulative: number }[];
  dropoff: { id: string; title: string; reached: number; dropped: number }[];
  trends: { weeks: string[]; series: { fieldId: string; title: string; isNps: boolean; points: (number | null)[] }[] };
  perField: PerField[];
  completionTimeMedianSec: number | null;
}

const RANGES: { key: Range; label: string }[] = [
  { key: "7", label: "Last 7 days" },
  { key: "30", label: "Last 30 days" },
  { key: "all", label: "All time" },
];

function Delta({ current, previous, invert = false }: { current: number; previous: number | null; invert?: boolean }) {
  if (previous === null || !previous) return null;
  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct === 0) return <span className="text-[10px] text-slate-400">· unchanged vs previous</span>;
  const good = invert ? pct < 0 : pct > 0;
  return (
    <span className={`text-[10px] font-semibold ${good ? "text-everest" : "text-red-500"}`}>
      {pct > 0 ? "▲" : "▼"} {Math.abs(pct)}% vs previous
    </span>
  );
}

function fmtDuration(sec: number | null): string {
  if (sec === null) return "–";
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return m ? `${m}m ${s}s` : `${s}s`;
}

export default function AnalyticsDashboard({ formId }: { formId: string }) {
  const [range, setRange] = useState<Range>("30");
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (r: Range) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/forms/${formId}/analytics?range=${r}`);
      if (res.ok) setData((await res.json()) as AnalyticsData);
    } finally {
      setLoading(false);
    }
  }, [formId]);

  useEffect(() => {
    void load(range);
  }, [range, load]);

  const trendLines = useMemo(() => data?.trends.series.filter((s) => s.points.some((p) => p !== null)) ?? [], [data]);
  const hasDropData = (data?.dropoff ?? []).some((d) => d.reached > 0);

  return (
    <div>
      {/* range toggle */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className={`rounded-lg px-4 py-1.5 text-xs font-semibold transition ${
                range === r.key ? "bg-everest text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
        {data?.completionTimeMedianSec != null && (
          <span className="text-xs text-slate-500">
            typical time to complete:{" "}
            <strong className="text-everest">{fmtDuration(data.completionTimeMedianSec)}</strong>
          </span>
        )}
      </div>

      {loading && !data ? (
        <div className="animate-pulse rounded-2xl border border-slate-200 bg-white p-16 text-center text-sm text-slate-400 shadow-sm">
          Crunching your data…
        </div>
      ) : !data ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-16 text-center text-sm text-slate-500 shadow-sm">
          Analytics unavailable — try again.
        </div>
      ) : (
        <>
          {/* headline stats */}
          <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Form views" value={data.totals.current.views} />
            <StatCard label="Started responding" value={data.totals.current.started} />
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Completed</p>
              <p className="mt-1 text-3xl font-bold text-everest">{data.totals.current.completed}</p>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-xs text-slate-500">{Math.round(data.totals.current.completionRate ?? 0)}% completion</span>
                {data.totals.previous && (
                  <Delta current={data.totals.current.completed} previous={data.totals.previous.completed} />
                )}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Partial (abandoned)</p>
              <p className="mt-1 text-3xl font-bold text-everest">{data.totals.current.partial}</p>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-xs text-slate-500">saved while in progress</span>
                {data.totals.previous && (
                  <Delta current={data.totals.current.partial} previous={data.totals.previous.partial} invert />
                )}
              </div>
            </div>
          </section>

          {/* funnel + timeline */}
          <section className="mb-8 grid gap-4 lg:grid-cols-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Reach &amp; completion</p>
              <div className="mt-4">
                <FunnelChart
                  steps={[
                    { label: "Form views", count: data.totals.current.views },
                    { label: "Started responding", count: data.totals.current.started },
                    { label: "Completed", count: data.totals.current.completed },
                  ]}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-3">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Submissions timeline</p>
              <div className="mt-4 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={data.daily} margin={{ top: 4, right: 8, bottom: 0, left: -18 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} formatter={(value) => <span style={{ color: "#64748b" }}>{value}</span>} />
                    <Bar dataKey="completed" name="completed" fill="#18442a" radius={[4, 4, 0, 0]} barSize={14} />
                    <Bar dataKey="partial" name="partial" fill="#e4dbc4" radius={[4, 4, 0, 0]} barSize={14} />
                    <Line type="monotone" dataKey="cumulative" name="cumulative" stroke="#45644a" strokeWidth={2} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          {/* dropoff + trends */}
          <section className="mb-8 grid gap-4 lg:grid-cols-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Question drop-off</p>
              <p className="mt-1 text-[11px] text-slate-400">Where partial responders stopped going forward.</p>
              {hasDropData ? (
                <div className="mt-4 space-y-3">
                  {data.dropoff.map((d, idx) => {
                    const top = Math.max(1, ...data.dropoff.map((x) => x.reached));
                    return (
                      <div key={d.id} className="text-xs">
                        <div className="flex justify-between gap-2">
                          <span className="truncate font-medium text-slate-600">
                            {idx + 1}. {d.title}
                          </span>
                          <span className={`shrink-0 font-semibold ${d.dropped > 0 ? "text-red-500" : "text-slate-400"}`}>
                            {d.dropped > 0 ? `−${d.dropped}` : `${d.reached} reached`}
                          </span>
                        </div>
                        <div className="mt-1 h-4 rounded-md bg-slate-100">
                          <div
                            className={`rounded-md ${d.dropped > 0 ? "bg-sand" : "bg-everest"}`}
                            style={{ width: `${Math.max(2, (d.reached / top) * 100)}%`, height: "100%" }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="mt-4 text-sm text-slate-400">No partial abandonments — everyone who starts, finishes. 🎉</p>
              )}
            </div>
          </section>

          {/* trends */}
          {trendLines.length > 0 && (
            <section className="mb-8">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Sentiment trends · weekly</p>
                <div className="mt-4 h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={trendLines[0].points.map((_, i) => {
                      const row: Record<string, string | number | null> = { week: data.trends.weeks[i] ?? String(i) };
                      for (const s of trendLines) row[s.fieldId] = s.points[i];
                      return row;
                    })}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="week" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
                      <Legend wrapperStyle={{ fontSize: 11 }} formatter={(value) => <span style={{ color: "#64748b" }}>{value}</span>} />
                      {trendLines.map((s, i) => (
                        <Line
                          key={s.fieldId}
                          type="monotone"
                          dataKey={s.fieldId}
                          name={`${s.isNps ? "NPS · " : ""}${s.title}`}
                          stroke={["#18442a", "#45644a", "#d97706", "#0284c7"][i % 4]}
                          strokeWidth={2}
                          dot={false}
                          connectNulls
                        />
                      ))}
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
                <p className="mt-2 text-[10px] text-slate-400">
                  {trendLines.some((s) => s.isNps)
                    ? "NPS lines show score from -100..100; rating lines show the average score."
                    : "Lines show the average score per week."}
                </p>
              </div>
            </section>
          )}

          {/* per-question insights */}
          <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-400">Question insights</h2>
          {data.perField.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-16 text-center">
              <p className="font-semibold text-slate-700">No data to chart yet</p>
              <p className="mt-1 text-sm text-slate-500">Once people respond, this page fills with charts.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {data.perField.map((f) => {
                switch (f.kind) {
                  case "distribution":
                    return f.items.length > 0 ? (
                      <DistributionChart key={f.id} title={f.title} items={f.items} answered={f.answered} color="#45644a" />
                    ) : (
                      <EmptyCard key={f.id} title={f.title} />
                    );
                  case "nps":
                    return (
                      <NpsBoard
                        key={f.id}
                        title={f.title}
                        score={f.score}
                        promoters={f.promoters}
                        passives={f.passives}
                        detractors={f.detractors}
                        total={f.answered}
                      />
                    );
                  case "rating":
                    return <RatingChart key={f.id} title={f.title} start={f.start} max={f.max} counts={f.counts} answered={f.answered} />;
                  case "quotes":
                    return <QuotesCard key={f.id} title={f.title} quotes={f.quotes} answered={f.answered} />;
                  case "number":
                    return f.avg !== null ? (
                      <StatCard
                        key={f.id}
                        label={f.title}
                        value={f.avg}
                        hint={`average · min ${f.min} · max ${f.max} · ${f.answered} answered`}
                      />
                    ) : (
                      <EmptyCard key={f.id} title={f.title} />
                    );
                  case "count":
                    return <StatCard key={f.id} label={f.title} value={f.answered} hint={`${f.type} answers collected`} />;
                }
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function EmptyCard({ title }: { title: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm shadow-sm">
      <p className="font-semibold">{title}</p>
      <p className="mt-2 text-xs text-slate-400">No answers yet.</p>
    </div>
  );
}
