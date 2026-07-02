import { motion } from "framer-motion";
import {
  Radio,
  ArrowRight,
  FileText,
  Mic,
  ListChecks,
  LayoutGrid,
  CalendarClock,
  Send,
  Github,
  Command,
  Quote,
  ShieldCheck,
} from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Footer } from "../../components/layout/Footer";
import { ThemeToggle } from "../../components/layout/ThemeToggle";
import { navigate } from "../../lib/router";
import { usePrefersReducedMotion } from "../../lib/theme";
import { cn } from "../../lib/cn";

const FEATURES = [
  {
    icon: FileText,
    title: "Transcript & audio intake",
    body: "Paste a transcript or drop an audio file. Both flow into the same extraction path.",
  },
  {
    icon: ListChecks,
    title: "Human-in-the-loop review",
    body: "Edit, confirm, or dismiss each item. High-confidence items are auto-triaged for you.",
  },
  {
    icon: LayoutGrid,
    title: "Live execution board",
    body: "Owner-assigned items move Open → In Progress → Done. Status persists across restarts.",
  },
  {
    icon: CalendarClock,
    title: "Real deadlines",
    body: "Natural language like ‘next Friday’ becomes real dates, with overdue emphasis.",
  },
  {
    icon: Quote,
    title: "Source traceability",
    body: "Every item reveals the exact transcript quote it was extracted from.",
  },
  {
    icon: Send,
    title: "Follow-up & export",
    body: "Draft a recap in one click; export items as Markdown or a calendar file.",
  },
];

const STEPS = [
  { n: "01", title: "Submit", body: "Paste a transcript or upload meeting audio." },
  { n: "02", title: "Review", body: "Confirm the extracted, owner-assigned action items." },
  { n: "03", title: "Track", body: "Watch them move to done on your execution board." },
];

export function LandingPage() {
  const reduced = usePrefersReducedMotion();
  const fade = (delay = 0) =>
    reduced
      ? {}
      : {
          initial: { opacity: 0, y: 12 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] as const },
        };

  return (
    <div className="min-h-screen bg-bg text-text">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-border bg-bg/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <a href="#/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-fg">
              <Radio className="h-4 w-4" aria-hidden />
            </span>
            <span className="text-sm font-semibold">Signal Meetings</span>
          </a>
          <nav className="hidden items-center gap-6 text-sm text-muted md:flex" aria-label="Primary">
            <a href="#features" className="hover:text-text">Features</a>
            <a href="#how" className="hover:text-text">How it works</a>
            <a href="#/dashboard" className="hover:text-text">Dashboard</a>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button size="sm" onClick={() => navigate("/app")}>
              Launch app <ArrowRight className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="grain relative overflow-hidden border-b border-border">
        <div className="aurora" aria-hidden />
        <div className="relative mx-auto max-w-4xl px-6 py-28 text-center">
          <motion.div {...fade(0)}>
            <Badge tone="primary" className="mb-5">
              <ShieldCheck className="h-3 w-3" aria-hidden /> Operator, not a chatbot
            </Badge>
          </motion.div>
          <motion.h1
            className="text-3xl font-bold leading-[1.05] tracking-[-0.03em] sm:text-[3.25rem]"
            {...fade(0.05)}
          >
            Turn meetings into <span className="text-primary">execution</span>.
          </motion.h1>
          <motion.p className="mx-auto mt-5 max-w-2xl text-base text-muted" {...fade(0.1)}>
            Signal reads your meeting transcript or audio and produces
            owner-assigned, deadline-tracked action items on a live board — then
            drafts the follow-up. It does the work; it doesn’t just chat.
          </motion.p>
          <motion.div className="mt-8 flex flex-wrap items-center justify-center gap-3" {...fade(0.15)}>
            <Button onClick={() => navigate("/new")}>
              Get started <ArrowRight className="h-4 w-4" aria-hidden />
            </Button>
            <Button variant="secondary" onClick={() => navigate("/dashboard")}>
              <LayoutGrid className="h-4 w-4" aria-hidden /> View dashboard
            </Button>
          </motion.div>
          <motion.p className="mt-4 text-xs text-muted" {...fade(0.2)}>
            Runs with zero setup on sample data — no API key required.
          </motion.p>
        </div>

        {/* Floating product mock — the board is the protagonist */}
        <motion.div
          className="relative mx-auto -mb-16 max-w-4xl px-6"
          initial={reduced ? false : { opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="rounded-xl border border-border bg-surface/80 p-3 shadow-lg backdrop-blur">
            <div className="mb-3 flex items-center gap-1.5 px-2 pt-1">
              <span className="h-2.5 w-2.5 rounded-full bg-danger/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-warning/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-success/70" />
              <span className="ml-3 text-xs text-muted">Execution Board</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Open", tone: "bg-muted/50", items: ["Finish billing integration", "Update pricing copy"] },
                { label: "In Progress", tone: "bg-primary", items: ["Design token system", "Funnel analytics"] },
                { label: "Done", tone: "bg-success", items: ["Welcome email rewrite"] },
              ].map((col, ci) => (
                <div key={col.label} className="rounded-lg border border-border bg-bg/60 p-3">
                  <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted">
                    <span className={cn("h-2 w-2 rounded-full", col.tone)} />
                    {col.label}
                  </div>
                  <div className="space-y-2">
                    {col.items.map((t, i) => (
                      <motion.div
                        key={t}
                        className="rounded-md border border-border bg-surface p-2.5 text-left text-xs text-text shadow-sm"
                        initial={reduced ? false : { opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 + ci * 0.1 + i * 0.08, duration: 0.4 }}
                      >
                        {t}
                        <div className="mt-2 h-1 w-10 rounded-full bg-surface-2" />
                      </motion.div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
        <div className="h-16" aria-hidden />
      </section>

      {/* How it works */}
      <section id="how" className="border-t border-border">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="text-center text-xl font-semibold">How it works</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="rounded-lg border border-border bg-surface p-6">
                <span className="tnum text-sm font-semibold text-primary">{s.n}</span>
                <h3 className="mt-2 text-base font-semibold">{s.title}</h3>
                <p className="mt-1 text-sm text-muted">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-t border-border bg-surface/40">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="text-center text-xl font-semibold">Everything to close the loop</h2>
          <p className="mx-auto mt-2 max-w-xl text-center text-sm text-muted">
            A focused toolkit for turning conversation into tracked, finished work.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-lg border border-border bg-surface p-5">
                <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <f.icon className="h-5 w-5" aria-hidden />
                </div>
                <h3 className="text-sm font-semibold">{f.title}</h3>
                <p className="mt-1 text-sm text-muted">{f.body}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-2 text-xs text-muted">
            <Badge tone="neutral"><Mic className="h-3 w-3" aria-hidden /> Audio transcription</Badge>
            <Badge tone="neutral"><Command className="h-3 w-3" aria-hidden /> Command palette (⌘K)</Badge>
            <Badge tone="neutral"><Github className="h-3 w-3" aria-hidden /> GitHub issues</Badge>
          </div>
        </div>
      </section>

      {/* CTA band */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-4xl px-6 py-16 text-center">
          <h2 className="text-2xl font-semibold">Ready to operate?</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-muted">
            Open the board and try it on the seeded sample meeting, or submit your own.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button onClick={() => navigate("/app")}>
              Open the operator <ArrowRight className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
