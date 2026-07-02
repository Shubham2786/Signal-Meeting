import { useState, type PointerEvent as ReactPointerEvent } from "react";
import {
  Quote,
  Github,
  Pencil,
  ArrowRight,
  ArrowLeft,
  Check,
  CalendarClock,
  AlertTriangle,
} from "lucide-react";
import type { ActionItem, Status } from "../../lib/types";
import { STATUS_LABELS, STATUS_ORDER } from "../../lib/types";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Avatar } from "../../components/ui/Avatar";
import { ConfidenceBar } from "../../components/ui/ConfidenceBar";
import { TooltipIconButton } from "../../components/ui/TooltipIconButton";
import { formatDate, relativeDue, isOverdue } from "../../lib/format";
import { cn } from "../../lib/cn";

interface Props {
  item: ActionItem;
  selected?: boolean;
  githubEnabled?: boolean;
  duplicate?: boolean;
  onSelect?: () => void;
  onStatus: (status: Status) => void;
  onEdit: () => void;
  onShowSource: () => void;
  onCreateIssue: () => void;
  isDragging?: boolean;
  isOverlay?: boolean;
}

// Stop a pointerdown on interactive controls from starting a card drag,
// so buttons stay clickable while the whole card is draggable.
const stopDrag = { onPointerDown: (e: ReactPointerEvent) => e.stopPropagation() };

export function ActionItemCard({
  item,
  selected,
  githubEnabled,
  duplicate,
  onSelect,
  onStatus,
  onEdit,
  onShowSource,
  onCreateIssue,
  isDragging,
  isOverlay,
}: Props) {
  const [busy, setBusy] = useState(false);
  const overdue = item.status !== "done" && isOverdue(item.dueDate);
  const idx = STATUS_ORDER.indexOf(item.status);
  const prevStatus = idx > 0 ? STATUS_ORDER[idx - 1] : null;
  const nextStatus = idx < STATUS_ORDER.length - 1 ? STATUS_ORDER[idx + 1] : null;

  return (
    <Card
      role="listitem"
      onClick={onSelect}
      className={cn(
        "group p-4 outline-none transition-all duration-200 ease-out-soft",
        "hover:border-primary/40 hover:shadow-md",
        !isOverlay && "animate-fade-in",
        isDragging && "opacity-40",
        isOverlay && "rotate-1 scale-[1.03] cursor-grabbing border-primary/60 shadow-lg",
        selected && "ring-2 ring-focus"
      )}
    >
      <div className="flex items-start gap-2">
        <p className="flex-1 text-sm font-medium leading-snug text-text">{item.title}</p>
        {!item.confirmed && (
          <Badge tone="warning" className="shrink-0">
            Needs review
          </Badge>
        )}
      </div>

      {duplicate && (
        <div className="mt-2 flex items-center gap-1 text-xs text-warning">
          <AlertTriangle className="h-3 w-3" aria-hidden />
          Possible duplicate
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs text-muted">
          <Avatar name={item.owner} />
          {item.owner}
        </span>
        {item.dueDate && (
          <Badge tone={overdue ? "danger" : "neutral"}>
            <CalendarClock className="h-3 w-3" aria-hidden />
            <span className="tnum">{formatDate(item.dueDate)}</span>
            <span className="opacity-70">· {relativeDue(item.dueDate)}</span>
          </Badge>
        )}
        <ConfidenceBar value={item.confidence} />
      </div>

      {/* Actions — clicking these must not start a drag */}
      <div
        {...stopDrag}
        className="mt-4 flex items-center justify-between border-t border-border pt-3"
      >
        <div className="flex items-center gap-1">
          {prevStatus && (
            <TooltipIconButton
              label={`Move to ${STATUS_LABELS[prevStatus]}`}
              variant="ghost"
              size="sm"
              onClick={() => onStatus(prevStatus)}
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
            </TooltipIconButton>
          )}
          {nextStatus && (
            <Button variant="secondary" size="sm" onClick={() => onStatus(nextStatus)}>
              {nextStatus === "done" ? (
                <>
                  <Check className="h-4 w-4" aria-hidden /> Done
                </>
              ) : (
                <>
                  Start <ArrowRight className="h-4 w-4" aria-hidden />
                </>
              )}
            </Button>
          )}
        </div>
        <div className="flex items-center gap-0.5">
          <TooltipIconButton label="View transcript" variant="ghost" size="sm" onClick={onShowSource}>
            <Quote className="h-4 w-4" aria-hidden />
          </TooltipIconButton>
          <TooltipIconButton label="Edit" variant="ghost" size="sm" onClick={onEdit}>
            <Pencil className="h-4 w-4" aria-hidden />
          </TooltipIconButton>
          {githubEnabled && (
            <TooltipIconButton
              label="Create GitHub issue"
              variant="ghost"
              size="sm"
              loading={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await onCreateIssue();
                } finally {
                  setBusy(false);
                }
              }}
            >
              <Github className="h-4 w-4" aria-hidden />
            </TooltipIconButton>
          )}
        </div>
      </div>
    </Card>
  );
}
