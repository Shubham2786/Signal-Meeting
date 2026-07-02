import {
  Plus,
  FileText,
  Mic,
  Radio,
  LayoutDashboard,
  LayoutGrid,
} from "lucide-react";
import { motion } from "framer-motion";
import type { Meeting } from "../../lib/types";
import { Button } from "../../components/ui/Button";
import { formatDateTime } from "../../lib/format";
import { cn } from "../../lib/cn";

interface Props {
  meetings: Meeting[];
  loading: boolean;
  selectedId: string | null;
  activeSection: "board" | "dashboard";
  onSelect: (id: string) => void;
  onNew: () => void;
  onDashboard: () => void;
  onBoard: () => void;
  onHome: () => void;
}

export function HistorySidebar({
  meetings,
  loading,
  selectedId,
  activeSection,
  onSelect,
  onNew,
  onDashboard,
  onBoard,
  onHome,
}: Props) {
  const navItem = (
    active: boolean,
    onClick: () => void,
    Icon: typeof LayoutGrid,
    label: string
  ) => (
    <button
      onClick={onClick}
      aria-current={active}
      className={cn(
        "relative flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm font-medium transition-colors",
        active ? "text-primary" : "text-muted hover:bg-surface-2 hover:text-text"
      )}
    >
      {active && (
        <motion.span
          layoutId="nav-active"
          className="absolute inset-0 rounded-md bg-primary/10"
          transition={{ type: "spring", stiffness: 500, damping: 40 }}
          aria-hidden
        />
      )}
      <Icon className="relative h-4 w-4" aria-hidden />
      <span className="relative">{label}</span>
    </button>
  );

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col border-r border-border bg-surface">
      <button
        onClick={onHome}
        className="flex items-center gap-2 px-4 py-4 text-left"
        aria-label="Signal Meetings home"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-fg">
          <Radio className="h-4 w-4" aria-hidden />
        </span>
        <span className="leading-tight">
          <span className="block text-sm font-semibold text-text">Signal</span>
          <span className="block text-xs text-muted">Meeting Operator</span>
        </span>
      </button>

      <div className="space-y-1 px-3">
        {navItem(activeSection === "dashboard", onDashboard, LayoutDashboard, "Dashboard")}
        {navItem(activeSection === "board", onBoard, LayoutGrid, "Execution Board")}
      </div>

      <div className="mt-3 px-3">
        <Button className="w-full" onClick={onNew}>
          <Plus className="h-4 w-4" aria-hidden /> New meeting
        </Button>
      </div>

      <div className="px-4 pb-2 pt-5">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
          History
        </h2>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 pb-4" aria-label="Meeting history">
        {loading ? (
          <p className="px-2 text-sm text-muted">Loading…</p>
        ) : meetings.length === 0 ? (
          <p className="px-2 text-sm text-muted">No meetings yet.</p>
        ) : (
          <ul className="space-y-1">
            {meetings.map((m) => (
              <li key={m.id}>
                <button
                  onClick={() => onSelect(m.id)}
                  aria-current={selectedId === m.id && activeSection === "board"}
                  className={cn(
                    "flex w-full items-start gap-2 rounded-md px-2 py-2 text-left transition-colors",
                    selectedId === m.id && activeSection === "board"
                      ? "bg-primary/10 text-text"
                      : "text-muted hover:bg-surface-2 hover:text-text"
                  )}
                >
                  <span className="mt-0.5 text-muted">
                    {m.sourceType === "audio" ? (
                      <Mic className="h-4 w-4" aria-hidden />
                    ) : (
                      <FileText className="h-4 w-4" aria-hidden />
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">
                      {m.title}
                    </span>
                    <span className="tnum block text-xs text-muted">
                      {formatDateTime(m.createdAt)}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </nav>
    </aside>
  );
}
