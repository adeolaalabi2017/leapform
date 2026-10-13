import Link from "next/link";
import { LeapMark, LeapWordmark } from "@/components/brand";
import { NewFormButton } from "@/app/DashboardActions";
import FormRunner from "@/components/FormRunner";
import { DEFAULT_THEME, type FormSchema } from "@/lib/form-types";
import { TEMPLATES } from "@/lib/templates";

export default function LandingPage() {
  return (
    <main className="bg-off-white text-slate-800">
      {/* nav */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link href="/" className="flex items-center gap-2">
          <LeapMark size={30} />
          <LeapWordmark />
        </Link>
        <nav className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/templates"
            className="hidden rounded-lg px-3 py-2 text-sm font-semibold text-everest transition hover:bg-sand/50 sm:block"
          >
            Templates
          </Link>
          <Link
            href="/dashboard"
            className="rounded-lg border border-everest/20 px-3 py-2 text-sm font-semibold text-everest transition hover:bg-sand/50 sm:px-4"
          >
            Dashboard
          </Link>
        </nav>
      </header>

      {/* hero */}
      <section className="relative overflow-hidden bg-everest">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-40 -top-40 h-96 w-96 rounded-full bg-olive opacity-40 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-48 -left-32 h-96 w-96 rounded-full bg-sand opacity-10 blur-3xl"
        />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-6 py-16 lg:grid-cols-2 lg:py-24">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-sand">
              Conversational forms
            </p>
            <h1 className="mt-4 text-4xl font-extrabold leading-[1.05] text-off-white sm:text-5xl">
              Forms that feel like a&nbsp;conversation.
            </h1>
            <p className="mt-5 max-w-md text-base leading-relaxed text-off-white/80">
              Typeform-style surveys with branching logic, ready-made templates and
              beautiful analytics — open source, no signup, ready in minutes.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <NewFormButton />
              <Link
                href="/templates"
                className="rounded-xl border border-off-white/40 px-5 py-2.5 text-sm font-semibold text-off-white transition hover:bg-off-white/10"
              >
                Browse templates
              </Link>
            </div>
            <p className="mt-4 text-xs text-off-white/60">
              “No signup” is literal — the button above creates your first form immediately.
            </p>
          </div>

          {/* live demo */}
          <div className="relative">
            <div className="absolute -inset-4 rounded-3xl bg-sand/10 blur-sm" aria-hidden="true" />
            <div className="relative h-[540px] max-w-md overflow-hidden rounded-3xl bg-off-white shadow-2xl lg:ml-auto" style={{ transform: "translateZ(0)" }}>
              <FormRunner schema={DEMO_FORM} theme={DEMO_THEME} isPreview />
            </div>
            <p className="mt-3 text-center text-xs font-medium text-off-white/70 lg:text-right">
              ↑ A real Leapform — try it (keyboard works, nothing is collected)
            </p>
          </div>
        </div>
      </section>

      {/* features */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="text-center text-3xl font-bold tracking-tight text-everest">
          Everything a form builder needs. Nothing it doesn’t.
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-sm leading-relaxed text-slate-500">
          Leapform is a full loop: design a form, publish it, watch the answers arrive,
          export the data.
        </p>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <article key={f.title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-olive hover:shadow-md">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-everest text-lg text-white">
                {f.icon}
              </span>
              <h3 className="mt-4 font-bold text-everest">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{f.body}</p>
            </article>
          ))}
        </div>
      </section>

      {/* how it works */}
      <section className="bg-sand/60 py-20">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold tracking-tight text-everest">Three steps. Zero friction.</h2>
          <div className="mt-12 grid gap-10 sm:grid-cols-3">
            {STEPS.map((s, i) => (
              <div key={s.title} className="text-center sm:text-left">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-everest text-sm font-bold text-off-white">
                  {i + 1}
                </span>
                <h3 className="mt-4 font-bold text-everest">{s.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* templates teaser */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-everest">Start from a template</h2>
            <p className="mt-2 text-sm text-slate-500">
              Proven questionnaires from {TEMPLATES.length} fields of survey work — every one fully editable.
            </p>
          </div>
          <Link href="/templates" className="text-sm font-semibold text-everest hover:underline">
            See the full gallery →
          </Link>
        </div>
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {TEMPLATES.filter((t) => FEATURED_TEMPLATES.includes(t.id)).map((t) => (
            <Link
              key={t.id}
              href="/templates"
              className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-olive hover:shadow-md"
            >
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-lg text-white"
                style={{ backgroundColor: t.theme.color }}
              >
                {t.icon}
              </span>
              <span className="text-xs font-semibold leading-snug text-slate-700">{t.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* final CTA */}
      <section className="bg-everest py-16">
        <div className="mx-auto flex max-w-3xl flex-col items-center px-6 text-center">
          <h2 className="text-3xl font-bold text-off-white">Ready to leap?</h2>
          <p className="mt-3 max-w-md text-sm text-off-white/80">
            Your first form is one click away — no email address, no credit card, no onboarding call.
          </p>
          <div className="mt-8">
            <NewFormButton />
          </div>
        </div>
      </section>

      {/* footer */}
      <footer className="border-t border-slate-200 bg-off-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row">
          <div className="flex items-center gap-2">
            <LeapMark size={22} />
            <LeapWordmark />
            <span className="text-xs text-slate-400">· one question at a time</span>
          </div>
          <nav className="flex items-center gap-4 text-xs font-medium text-slate-500">
            <Link href="/dashboard" className="hover:text-everest">
              Dashboard
            </Link>
            <Link href="/templates" className="hover:text-everest">
              Templates
            </Link>
            <a href="https://github.com/adeolaalabi2017/leapform" target="_blank" rel="noreferrer" className="hover:text-everest">
              GitHub
            </a>
          </nav>
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
  completion: "That’s the magic. Sign up not required. 🌲",
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
    { id: "demo_3", type: "textarea", title: "Anything you’d want Leapform to do?", required: false, placeholder: "Dream big…" },
  ],
};

const FEATURED_TEMPLATES = ["nps", "csat", "employee-satisfaction", "event-planning", "market-research", "healthcare", "nonprofit"];

const FEATURES = [
  { icon: "💬", title: "Conversational renderer", body: "One question per screen, keyboard-first, auto-advance choices — the format people actually finish." },
  { icon: "🌿", title: "Branching logic", body: "“If answer is X, jump to question Y.” First-match rules keep surveys short for every respondent." },
  { icon: "✨", title: "Draft / published split", body: "Edit freely without touching the live form. Publish when you’re proud of it." },
  { icon: "🧰", title: "Templates", body: "Eleven curated questionnaires — NPS, CSAT, HR, healthcare… instantiate one and make it yours." },
  { icon: "📊", title: "Analytics charts", body: "Funnel, submissions timeline, per-question breakdowns and NPS scoring — no extra tools needed." },
  { icon: "📥", title: "Data in your hands", body: "Responses table with partial-response tracking and one-click CSV export." },
];

const STEPS = [
  { title: "Create your form", body: "Start from scratch or pick a template. Autosave keeps every keystroke." },
  { title: "Publish & share", body: "One click gets you a share link — or copy the embed code for your own site." },
  { title: "Watch answers roll in", body: "Charts, NPS scores, partial responses and CSV — insight without setup." }
];
