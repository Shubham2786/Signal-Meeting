import {
  CalendarClock,
  CheckCircle2,
  ListTodo,
  AlertTriangle,
  FileText,
  Mic,
  Plus,
  ArrowRight,
  Users,
  LayoutGrid,
} from "lucide-react";
import { motion } from "framer-motion";
import type { DashboardData } from "./useDashboard";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Avatar } from "../../components/ui/Avatar";
import { EmptyState } from "../../components/ui/EmptyState";
import { Skeleton } from "../../components/ui/Skeleton";
import { AnimatedNumber } from "../../components/ui/AnimatedNumber";
import { formatDate, formatDateTime, relativeDue, isOverdue } from "../../lib/format";
import { usePrefersReducedMotion } from "../../lib/theme";
import { cn } from "../../lib/cn";

interface Props {
  data: DashboardData;
  onOpenMeeting: (id: string) => void;
  onNew: () => void;
}

interface StatProps {
  icon: typeof ListTodo;
  label: string;
  value: number | string;
  tone?: "primary" | "success" | "warning" | "danger";
  suffix?: string;
}

function Stat({ icon: Icon, label, value, tone = "primary", suffix }: StatProps) {
  const toneClass = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    danger: "bg-danger/10 text-danger",
  }[tone];
  return (
    <Card className="p-5">
      <div className={cn("mb-3 inline-flex h-9 w-9 items-center justify-center rounded-md", toneClass)}>
        <Icon className="h-5 w-5" aria-hidden />
      </div>
      <p className="tnum text-2xl font-semibold text-text">
        {typeof value === "number" ? <AnimatedNumber value={value} /> : value}
        {suffix && <span className="text-lg text-muted">{suffix}</span>}
      </p>
      <p className="mt-0.5 text-sm text-muted">{label}</p>
    </Card>
  );
}

export function DashboardView({ data, onOpenMeeting, onNew }: Props) {
  const { loading, byStatus, totalItems } = data;

  if (!loading && data.totalMeetings === 0) {
    return (
      <div className="p-8">
        <EmptyState
          icon={LayoutGrid}
          title="Nothing to track yet"
          description="Submit your first meeting transcript to populate the execution dashboard."
          action={
            <Button onClick={onNew}>
              <Plus className="h-4 w-4" aria-hidden /> New meeting
            </Button>
          }
        />
      </div>
    );
  }

  const statusPct = (n: number) => (totalItems === 0 ? 0 : (n / totalItems) * 100);

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-text">Dashboard</h1>
            <p className="mt-1 text-sm text-muted">
              Execution overview across every meeting.
            </p>
          </div>
          <Button onClick={onNew}>
            <Plus className="h-4 w-4" aria-hidden /> New meeting
          </Button>
        </div>

        {/* Stat cards */}
        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28" />
            ))
          ) : (
            <>
              <Stat icon={FileText} label="Meetings" value={data.totalMeetings} />
              <Stat icon={ListTodo} label="Action items" value={data.totalItems} />
              <Stat
                icon={CheckCircle2}
                label="Completion"
                value={data.completion}
                suffix="%"
                tone="success"
              />
              <Stat
                icon={AlertTriangle}
                label="Overdue"
                value={data.overdue}
                tone={data.overdue > 0 ? "danger" : "success"}
              />
            </>
          )}
        </div>

        {/* Status breakdown */}
        <Card className="mt-4 p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-text">Status breakdown</h2>
            <span className="tnum text-xs text-muted">{totalItems} tracked</span>
          </div>
          <div className="flex h-3 w-full overflow-hidden rounded-full bg-surface-2">
            <motion.div className="bg-muted/60" initial={{ width: 0 }} animate={{ width: `${statusPct(byStatus.open)}%` }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }} title={`Open: ${byStatus.open}`} />
            <motion.div className="bg-primary" initial={{ width: 0 }} animate={{ width: `${statusPct(byStatus.in_progress)}%` }} transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }} title={`In Progress: ${byStatus.in_progress}`} />
            <motion.div className="bg-success" initial={{ width: 0 }} animate={{ width: `${statusPct(byStatus.done)}%` }} transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }} title={`Done: ${byStatus.done}`} />
          </div>
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-muted/60" /> Open
              <span className="tnum font-medium text-text">{byStatus.open}</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-primary" /> In Progress
              <span className="tnum font-medium text-text">{byStatus.in_progress}</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-success" /> Done
              <span className="tnum font-medium text-text">{byStatus.done}</span>
            </span>
          </div>
        </Card>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {/* Upcoming deadlines */}
          <Card className="p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-text">
              <CalendarClock className="h-4 w-4 text-muted" aria-hidden /> Upcoming deadlines
            </h2>
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
              </div>
            ) : data.upcoming.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted">No open deadlines. Nice.</p>
            ) : (
              <ul className="divide-y divide-border">
                {data.upcoming.map((i) => {
                  const over = isOverdue(i.dueDate);
                  return (
                    <li key={i.id} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="flex min-w-0 items-center gap-2">
                        <Avatar name={i.owner} />
                        <span className="truncate text-sm text-text">{i.title}</span>
                      </div>
                      <Badge tone={over ? "danger" : "neutral"}>
                        <span className="tnum">{formatDate(i.dueDate)}</span>
                        <span className="opacity-70">· {relativeDue(i.dueDate)}</span>
                      </Badge>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          {/* Owner workload */}
          <Card className="p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-text">
              <Users className="h-4 w-4 text-muted" aria-hidden /> Owner workload
            </h2>
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
              </div>
            ) : data.owners.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted">No owners yet.</p>
            ) : (
              <ul className="space-y-3">
                {data.owners.map((o) => (
                  <li key={o.owner} className="flex items-center gap-3">
                    <Avatar name={o.owner} />
                    <span className="w-24 shrink-0 truncate text-sm text-text">{o.owner}</span>
                    <div className="flex h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
                      <div className="bg-muted/60" style={{ width: `${(o.open / o.total) * 100}%` }} />
                      <div className="bg-primary" style={{ width: `${(o.inProgress / o.total) * 100}%` }} />
                      <div className="bg-success" style={{ width: `${(o.done / o.total) * 100}%` }} />
                    </div>
                    <span className="tnum w-6 text-right text-xs text-muted">{o.total}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {/* Recent meetings */}
        <Card className="mt-4 p-5">
          <h2 className="mb-1 text-sm font-semibold text-text">Recent meetings</h2>
          {loading ? (
            <div className="mt-3 space-y-2">
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
            </div>
          ) : (
            <ul className="mt-2 divide-y divide-border">
              {data.recentMeetings.map((m) => (
                <li key={m.id}>
                  <button
                    onClick={() => onOpenMeeting(m.id)}
                    className="group flex w-full items-center justify-between gap-3 py-3 text-left transition-colors hover:text-primary"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="text-muted">
                        {m.sourceType === "audio" ? (
                          <Mic className="h-4 w-4" aria-hidden />
                        ) : (
                          <FileText className="h-4 w-4" aria-hidden />
                        )}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-text group-hover:text-primary">
                          {m.title}
                        </span>
                        <span className="tnum block text-xs text-muted">
                          {formatDateTime(m.createdAt)}
                        </span>
                      </span>
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
