/**
 * Hand-rolled reporting charts (no chart library): pure HTML/CSS blocks that
 * render on the server, styled with the Deep Forest palette.
 */

export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-widest text-slate-400">{label}</p>
      <p className="mt-1 text-3xl font-bold text-everest">{value}</p>
      {hint && <p className="mt-1 truncate text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

/* ---------- submissions per day (grouped bars) ---------- */

export function TimeSeriesChart({
  data,
}: {
  data: { label: string; completed: number; partial: number }[];
}) {
  const max = Math.max(1, ...data.flatMap((d) => [d.completed, d.partial]));
  if (!data.some((d) => d.completed + d.partial > 0)) {
    return (
      <p className="py-6 text-sm text-slate-400">
        No activity in the last two weeks — share the form link to see this chart fill up.
      </p>
    );
  }
  return (
    <div>
      <div className="flex items-end gap-1.5" style={{ height: 128 }}>
        {data.map((d) => (
          <div key={d.label} className="flex h-full flex-1 flex-col justify-end">
            <div className="flex h-full w-full items-end justify-center gap-[3px]">
              <div
                className="w-[38%] rounded-t bg-everest"
                style={{ height: d.completed ? `${(d.completed / max) * 100}%` : 3, minHeight: d.completed ? 4 : 3 }}
                title={`completed: ${d.completed}`}
              />
              <div
                className="w-[38%] rounded-t bg-sand"
                style={{ height: d.partial ? `${(d.partial / max) * 100}%` : 3, minHeight: d.partial ? 4 : 3 }}
                title={`partial: ${d.partial}`}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-1.5">
        {data.map((d) => (
          <div key={d.label} className="flex-1 text-center text-[10px] text-slate-400">
            {d.label}
          </div>
        ))}
      </div>
      <div className="mt-3 flex gap-4 text-[11px] font-medium text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-everest" /> completed
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-sand" /> partial
        </span>
      </div>
    </div>
  );
}

/* ---------- views → started → completed funnel ---------- */

export function FunnelChart({
  steps,
}: {
  steps: { label: string; count: number }[];
}) {
  const top = Math.max(1, ...steps.map((s) => s.count));
  const fills = ["bg-slate-300", "bg-sand", "bg-everest"];
  return (
    <div className="space-y-4 overflow-hidden">
      {steps.map((s, i) => {
        const pct = Math.min(100, Math.round((s.count / top) * 100));
        return (
          <div key={s.label}>
            <div className="flex justify-between text-xs font-semibold text-slate-600">
              <span>{s.label}</span>
              <span className="text-slate-500">{s.count}</span>
            </div>
            <div className="mt-1 h-6 rounded-lg bg-slate-100">
              <div
                className={`h-6 rounded-lg transition-all ${fills[i] ?? "bg-slate-300"}`}
                style={{ width: `${Math.max(2, pct)}%` }}
              />
            </div>
            {i > 0 && steps[0] && (
              <p className="mt-0.5 text-[10px] text-slate-400">
                {steps[0].count ? Math.min(100, Math.round((s.count / steps[0].count) * 100)) : 0}% of people who saw the form
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ---------- answer distribution for choice-style questions ---------- */

export function DistributionChart({
  title,
  items,
  color = "#18442a",
  answered,
}: {
  title: string;
  items: { label: string; count: number }[];
  color?: string;
  answered: number;
}) {
  const max = Math.max(1, ...items.map((i) => i.count));
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-semibold leading-snug">{title}</p>
        <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{answered} answered</span>
      </div>
      <div className="mt-3 space-y-2.5">
        {items.map((item) => (
          <div key={item.label} className="text-xs">
            <div className="flex justify-between gap-2 text-slate-600">
              <span className="truncate">{item.label}</span>
              <span className="shrink-0 text-slate-400">
                {item.count} · {answered ? Math.round((item.count / answered) * 100) : 0}%
              </span>
            </div>
            <div className="mt-1 h-4 rounded-md bg-slate-100">
              <div
                className="h-4 rounded-md"
                style={{ width: `${(item.count / max) * 100}%`, backgroundColor: color }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- rating distribution + average ---------- */

export function RatingChart({
  title,
  start,
  max,
  counts,
  answered,
}: {
  title: string;
  start: number;
  max: number;
  counts: number[];
  answered: number;
}) {
  const values: number[] = [];
  for (let v = start; v <= max; v++) values.push(v);
  const maxCount = Math.max(1, ...counts);
  const sum = counts.reduce((s, c, idx) => s + c * (start + idx), 0);
  const avg = answered ? (Math.round((sum / answered) * 10) / 10).toFixed(1) : "–";
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-semibold leading-snug">{title}</p>
        <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{answered} answered</span>
      </div>
      <p className="mt-2 text-3xl font-bold text-everest">
        {avg}
        <span className="ml-1 text-xs font-medium text-slate-400">average{start === 0 ? "" : ` of ${max}`}</span>
      </p>
      <div className="mt-3 flex items-end gap-1" style={{ height: 72 }}>
        {values.map((v, idx) => (
          <div key={v} className="flex flex-1 flex-col items-center justify-end" title={`${v}: ${counts[idx]}`}>
            {counts[idx] > 0 && (
              <span className="mb-0.5 text-[9px] font-semibold text-slate-500">{counts[idx]}</span>
            )}
            <div
              className={`w-full max-w-[36px] rounded-t ${counts[idx] > 0 ? "bg-everest" : "bg-slate-200"}`}
              style={{ height: counts[idx] ? Math.max(3, (counts[idx] / maxCount) * 56) : 3 }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-1">
        {values.map((v) => (
          <div key={v} className="flex-1 text-center text-[10px] text-slate-400">
            {v}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- NPS scoreboard ---------- */

export function NpsBoard({
  title,
  score,
  promoters,
  passives,
  detractors,
  total,
}: {
  title: string;
  score: number;
  promoters: number;
  passives: number;
  detractors: number;
  total: number;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-widest text-slate-400">NPS score</p>
      <p className="mt-1 text-3xl font-bold text-everest">{score}</p>
      <p className="mt-1 truncate text-xs text-slate-500">{title}</p>
      <div className="mt-3 flex h-2 overflow-hidden rounded-full">
        <div className="bg-red-400" style={{ width: `${detractors}%` }} title="detractors" />
        <div className="bg-amber-300" style={{ width: `${passives}%` }} title="passives" />
        <div className="bg-everest" style={{ width: `${promoters}%` }} title="promoters" />
      </div>
      <div className="mt-2 flex justify-between text-[10px] font-medium text-slate-500">
        <span>detractors {detractors}%</span>
        <span>passives {passives}%</span>
        <span>promoters {promoters}%</span>
      </div>
      <p className="mt-1 text-[10px] text-slate-400">{total} scored response{total === 1 ? "" : "s"}</p>
    </div>
  );
}

/* ---------- open-text quotes ---------- */

export function QuotesCard({
  title,
  quotes,
  answered,
}: {
  title: string;
  quotes: string[];
  answered: number;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-semibold leading-snug">{title}</p>
        <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{answered} answered</span>
      </div>
      {quotes.length === 0 ? (
        <p className="mt-3 text-xs text-slate-400">No answers yet.</p>
      ) : (
        <ul className="mt-3 space-y-2.5">
          {quotes.map((q, i) => (
            <li key={i} className="rounded-lg bg-sand/40 px-3 py-2 text-xs leading-relaxed text-everest">
              “{q.length > 140 ? q.slice(0, 140) + "…" : q}”
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
