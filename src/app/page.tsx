import Link from "next/link";
import { LeapMark, LeapWordmark } from "@/components/brand";
import { NewFormButton } from "@/app/DashboardActions";
import FormRunner from "@/components/FormRunner";
import { DEFAULT_THEME, type FormSchema } from "@/lib/form-types";
import { TEMPLATES } from "@/lib/templates";

export default function LandingPage() {
  return (
    <main className="bg-off-white text-slate-800">
      {/* floating pill nav */}
      <header className="px-4 pt-5 sm:px-8">
        <nav className="mx-auto flex max-w-5xl items-center justify-between rounded-full bg-everest px-4 py-3 shadow-lg sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <LeapMark size={26} />
            <LeapWordmark tone="light" />
          </Link>
          <div className="hidden items-center gap-6 text-sm font-medium text-off-white/85 md:flex">
            <Link href="#features" className="transition hover:text-off-white">
              Features
            </Link>
            <Link href="#how" className="transition hover:text-off-white">
              How it works
            </Link>
            <Link href="#templates" className="transition hover:text-off-white">
              Templates
            </Link>
            <Link href="#faq" className="transition hover:text-off-white">
              FAQ
            </Link>
          </div>
          <NewFormButton
            variant="sand"
            label="+ Start a form"
          />
        </nav>
      </header>

      {/* hero */}
      <section className="relative overflow-hidden bg-everest pb-16 pt-14 sm:pt-20">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-52 top-10 h-[480px] w-[480px] rounded-full bg-olive opacity-50 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-40 -bottom-40 h-96 w-96 rounded-full bg-olive opacity-30 blur-3xl"
        />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-6 lg:grid-cols-2">
          <div>
            <span className="inline-block rounded-full bg-olive px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-off-white">
              The conversation-first form builder
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.06] text-off-white sm:text-5xl">
              <span className="text-sand">Ask better questions.</span> Get answers
              that feel like a conversation.
            </h1>
            <p className="mt-5 max-w-md text-base leading-relaxed text-off-white/80">
              Leapform is a friendly form builder — one question per screen,
              branching logic, ready-made templates and analytics that read
              themselves. Open source, no signup, ready in minutes.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <NewFormButton variant="sand" label="Start your first form" />
              <Link
                href="/templates"
                className="rounded-xl border border-off-white/40 px-5 py-2.5 text-sm font-semibold text-off-white transition hover:bg-off-white/10"
              >
                Browse templates
              </Link>
            </div>
            <div className="mt-8 flex items-center gap-3">
              <div className="flex -space-x-2">
                {["💬", "🌿", "📊", "⚡"].map((e, i) => (
                  <span
                    key={i}
                    className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-everest bg-sand/90 text-xs shadow"
                  >
                    {e}
                  </span>
                ))}
              </div>
              <p className="text-xs text-off-white/70">
                9 question types · 11 curated templates · 1-click CSV — right out of the box
              </p>
            </div>
          </div>

          {/* live demo */}
          <div className="relative">
            <div className="relative h-[540px] max-w-md overflow-hidden rounded-3xl bg-off-white shadow-2xl lg:ml-auto" style={{ transform: "translateZ(0)" }}>
              <FormRunner schema={DEMO_FORM} theme={DEMO_THEME} isPreview />
            </div>
            <div className="absolute -bottom-5 left-6 rounded-2xl bg-off-white px-5 py-4 shadow-2xl lg:-left-8">
              <p className="text-xl font-bold text-everest">
                Real form engine
                <span className="ml-1 text-sand">★</span>
              </p>
              <p className="text-[11px] font-medium text-slate-500">
                Go on — click it. Nothing is collected.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* stats band */}
      <section className="border-y border-slate-200 bg-sand/40">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 py-12 sm:grid-cols-3 sm:items-center">
          <h2 className="max-w-[220px] text-2xl font-extrabold tracking-tight text-everest sm:text-3xl">
            Measured in answers, not features.
          </h2>
          {STATS.map((s) => (
            <div key={s.label}>
              <p className="text-3xl font-extrabold text-everest sm:text-4xl">
                {s.value}
                <span className="text-olive">+</span>
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-700">{s.label}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* why leapform */}
      <section id="features" className="mx-auto max-w-6xl px-6 py-20">
        <div className="text-center">
          <span className="rounded-full bg-sand/60 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-everest">
            Why Leapform
          </span>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-everest sm:text-4xl">
            Built to be finished
          </h2>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <article key={f.title} className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm transition hover:border-olive hover:shadow-md">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-sand bg-off-white text-xl">
                {f.icon}
              </span>
              <h3 className="mt-4 font-bold text-everest">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{f.body}</p>
            </article>
          ))}
        </div>
      </section>

      {/* how it works — dark band */}
      <section id="how" className="relative overflow-hidden bg-everest py-20">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-40 bottom-0 h-96 w-96 rounded-full bg-olive opacity-30 blur-3xl"
        />
        <div className="relative mx-auto grid max-w-6xl items-start gap-12 px-6 lg:grid-cols-2">
          <div>
            <span className="inline-block rounded-full bg-olive px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-off-white">
              How it works
            </span>
            <h2 className="mt-5 text-3xl font-extrabold tracking-tight text-off-white sm:text-4xl">
              Three steps to your <span className="text-sand">first insight</span>
            </h2>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-off-white/75">
              Leapform keeps the boring parts invisible — drafts, autosave,
              publishing, exports — so you stay focused on the questions.
            </p>

            {/* playful builder mock */}
            <div className="mt-8 max-w-sm overflow-hidden rounded-2xl bg-off-white p-3 shadow-2xl">
              <p className="px-2 pb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                {MOCK_FORM.title}
              </p>
              {MOCK_FORM.fields.map((q, i) => (
                <div key={q.id} className="mb-1.5 flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-2">
                  <span className="text-[10px] font-bold text-slate-300">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-slate-700">{q.title}</span>
                  <span className="rounded bg-sand/70 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-everest">{q.type}</span>
                </div>
              ))}
              <div className="mt-2 flex items-center justify-between px-1">
                <span className="text-[10px] font-semibold text-slate-400">● draft · autosaved</span>
                <span className="rounded-md bg-everest px-2.5 py-1 text-[10px] font-bold text-off-white">Publish</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {STEPS.map((s, i) => (
              <article key={s.title} className="rounded-2xl bg-olive/60 p-6">
                <p className="text-2xl font-extrabold text-sand">0{i + 1}</p>
                <h3 className="mt-1 font-bold text-off-white">{s.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-off-white/75">{s.body}</p>
              </article>
            ))}
            <Link href="/dashboard" className="inline-block px-2 text-sm font-bold text-sand hover:underline">
              Start building now →
            </Link>
          </div>
        </div>
      </section>

      {/* templates */}
      <section id="templates" className="mx-auto max-w-6xl px-6 py-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="rounded-full bg-sand/60 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-everest">
              Template gallery
            </span>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-everest sm:text-4xl">
              Start from a proven template
            </h2>
            <p className="mt-2 max-w-lg text-sm text-slate-500">
              {TEMPLATES.length} ready-made questionnaires across NPS, HR, healthcare and
              more — grab one, tweak it, ship it.
            </p>
          </div>
          <Link href="/templates" className="text-sm font-bold text-everest hover:underline">
            See the full gallery →
          </Link>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TEMPLATES.filter((t) => FEATURED_TEMPLATES.includes(t.id)).map((t) => (
            <Link
              key={t.id}
              href="/templates"
              className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-olive hover:shadow-md"
            >
              <span
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-xl text-white"
                style={{ backgroundColor: t.theme.color }}
              >
                {t.icon}
              </span>
              <div className="min-w-0">
                <h3 className="truncate text-sm font-bold text-everest">{t.name}</h3>
                <p className="mt-0.5 text-[11px] font-medium text-slate-500">
                  {t.category} · {t.schema.fields.length} questions
                </p>
              </div>
              <span className="ml-auto text-everest opacity-0 transition group-hover:opacity-100">→</span>
            </Link>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="border-y border-slate-200 bg-sand/40 py-20">
        <div className="mx-auto max-w-3xl px-6">
          <div className="text-center">
            <span className="rounded-full bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-everest shadow-sm">
              FAQ
            </span>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-everest sm:text-4xl">
              Common questions, quick answers
            </h2>
          </div>
          <div className="mt-10 space-y-3">
            {FAQS.map((q) => (
              <details key={q.q} className="group rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold text-everest marker:hidden [&::-webkit-details-marker]:hidden">
                  {q.q}
                  <span className="text-olive transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{q.a}</p>
              </details>
            ))}
          </div>
          <p className="mt-6 text-center text-xs text-slate-500">
            Still curious? The{" "}
            <Link href="/dashboard" className="font-semibold text-everest hover:underline">
              dashboard
            </Link>{" "}
            answers most things faster than we can.
          </p>
        </div>
      </section>

      {/* final CTA */}
      <section className="bg-everest py-20">
        <div className="mx-auto flex max-w-3xl flex-col items-center px-6 text-center">
          <div className="flex items-center gap-4">
            <div className="hidden -space-x-2 sm:flex">
              {["💼", "🎓", "🧰"].map((e, i) => (
                <span key={i} className="flex h-9 w-9 items-center justify-center rounded-full bg-sand text-xs shadow">
                  {e}
                </span>
              ))}
            </div>
            <h2 className="text-3xl font-extrabold text-off-white">Ready to leap?</h2>
            <div className="hidden -space-x-2 sm:flex">
              {["🚀", "🌱", "📊"].map((e, i) => (
                <span key={i} className="flex h-9 w-9 items-center justify-center rounded-full bg-sand text-xs shadow">
                  {e}
                </span>
              ))}
            </div>
          </div>
          <p className="mt-3 max-w-md text-sm text-off-white/80">
            Your first conversation-form is one click away — no email address, no
            credit card, no onboarding call.
          </p>
          <div className="mt-8">
            <NewFormButton variant="sand" label="Create a form — it's instant" />
          </div>
        </div>
      </section>

      {/* footer */}
      <footer className="bg-everest">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <div className="flex flex-col items-center justify-between gap-6 border-b border-off-white/15 pb-8 sm:flex-row">
            <div className="flex items-center gap-2">
              <LeapMark size={26} />
              <LeapWordmark tone="light" />
              <span className="hidden text-xs text-off-white/60 sm:block">· one question at a time</span>
            </div>
            <nav className="flex flex-wrap items-center justify-center gap-5 text-xs font-medium text-off-white/70">
              <Link href="/dashboard" className="transition hover:text-off-white">
                Dashboard
              </Link>
              <Link href="/templates" className="transition hover:text-off-white">
                Templates
              </Link>
              <a href="https://github.com/adeolaalabi2017/leapform" target="_blank" rel="noreferrer" className="transition hover:text-off-white">
                GitHub
              </a>
            </nav>
          </div>
          <p className="pt-6 text-center text-[11px] text-off-white/50">
            © {new Date().getFullYear()} Leapform · built with Next.js, Neon Postgres and stubborn optimism
          </p>
        </div>
      </footer>
    </main>
  );
}

const DEMO_THEME = DEFAULT_THEME;

const DEMO_FORM: FormSchema = {
  version: 1,
  title: "Leapform demo",
  welcome: "This is the real form engine — go ahead!",
  completion: "That's the magic. Sign up not required. 🌲",
  fields: [
    {
      id: "demo_1",
      type: "choice",
      title: "What brings you here today?",
      required: false,
      properties: {
        choices: [
          { id: "d1", label: "I need forms for work" },
          { id: "d2", label: "Just exploring" },
          { id: "d3", label: "A friend recommended it" },
        ],
      },
    },
    { id: "demo_2", type: "rating", title: "How does this feel so far?", required: false, properties: { ratingMax: 5 } },
    { id: "demo_3", type: "textarea", title: "Anything you'd want Leapform to do?", required: false, placeholder: "Dream big…" },
  ],
};

const STATS = [
  { value: 9, label: "Question types", body: "Text, email, number, choices, rating (NPS-ready), long text and more." },
  { value: 11, label: "Curated templates", body: "From NPS and CSAT to HR, healthcare, market research and education." },
  { value: 100, label: "% of your data, exported", body: "Responses table, partial tracking and one-click CSV. No paywall in sight." },
];

const FEATURES = [
  { icon: "💬", title: "Conversational renderer", body: "One question per screen, keyboard-first, auto-advance choices — the format people actually finish." },
  { icon: "🌿", title: "Branching logic", body: "“If answer is X, jump to question Y.” First-match rules keep every survey short for every respondent." },
  { icon: "✨", title: "Draft / published split", body: "Edit freely without touching the live form. Publish when you're proud of it." },
  { icon: "🧰", title: "Templates", body: "Eleven curated questionnaires — instantiate one and make it fully yours in seconds." },
  { icon: "📊", title: "Analytics charts", body: "Funnel, NPS scoring, drop-off analysis, weekly trends and per-question breakdowns — built in." },
  { icon: "⚡", title: "Embed anywhere", body: "One script tag drops a working, auto-resizing form into any page. No build step needed." },
];

const STEPS = [
  { title: "Create your form", body: "Start from scratch or pick a template. Autosave keeps every keystroke — drafts and live versions never collide." },
  { title: "Publish & share", body: "One click gets you a share link; the embed SDK drops an auto-resizing form into any website." },
  { title: "Watch insight arrive", body: "Funnel, drop-off, NPS trends and per-question charts — plus CSV when you want raw data." },
];

const FAQS = [
  { q: "Do I need an account to start?", a: "No — creating a new form takes one click and starts immediately. The dashboard is simply where your forms live. Great for personal use and internal tools right away." },
  { q: "Where does my data live?", a: "Responses are stored in a Neon Postgres database, and you can export everything to CSV at any time from the responses page. No lock-in." },
  { q: "Can I edit a live form without breaking it?", a: "Yes — Leapform keeps a draft and a published copy. Every edit happens on the draft; the public form only changes when you press Publish." },
  { q: "How does branching logic work?", a: "Any question can carry rules like “if answer equals X, jump to question Y” or “complete the form”. Rules run in order, and the public form validates only the questions respondents actually saw." },
  { q: "Can I embed a form on my own site?", a: "One script tag does it: <script src=\"…/embed.js\"></script> plus a div with your form's id. The embedded iframe resizes itself automatically as the form progresses." },
  { q: "Is it free?", a: "Yes — Leapform is personal/open-source software. Run it yourself or use this deployment; there's no billing anywhere in the codebase." },
];

const FEATURED_TEMPLATES = ["nps", "csat", "employee-satisfaction", "event-planning", "market-research", "healthcare", "nonprofit"];

const MOCK_FORM = {
  title: "Customer feedback — draft",
  fields: [
    { id: "a", type: "choice", title: "What brings you here today?" },
    { id: "b", type: "rating", title: "How easy was it to publish?" },
    { id: "c", type: "textarea", title: "Anything else you'd want?" },
  ],
};
