import { Radio, Github } from "lucide-react";

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-wrap items-start justify-between gap-8">
          <div className="max-w-xs">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-fg">
                <Radio className="h-4 w-4" aria-hidden />
              </span>
              <span className="text-sm font-semibold text-text">Signal Meetings</span>
            </div>
            <p className="mt-3 text-sm text-muted">
              An AI meeting-to-execution operator. It does the work — extract,
              organize, track — so decisions turn into done.
            </p>
          </div>

          <nav className="grid grid-cols-2 gap-x-12 gap-y-2 text-sm" aria-label="Footer">
            <span className="col-span-2 text-xs font-semibold uppercase tracking-wide text-muted">
              Product
            </span>
            <a href="#/app" className="text-muted hover:text-text">Execution Board</a>
            <a href="#/dashboard" className="text-muted hover:text-text">Dashboard</a>
            <a href="#/new" className="text-muted hover:text-text">New meeting</a>
            <a href="#features" className="text-muted hover:text-text">Features</a>
          </nav>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-6">
          <p className="text-xs text-muted">© {year} Signal Meetings. Prototype.</p>
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-text"
          >
            <Github className="h-4 w-4" aria-hidden /> Source
          </a>
        </div>
      </div>
    </footer>
  );
}
