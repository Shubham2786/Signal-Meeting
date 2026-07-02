import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Check, X, Pencil, Quote, CheckCheck, ArrowRight } from "lucide-react";
import type { ActionItem } from "../../lib/types";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Avatar } from "../../components/ui/Avatar";
import { ConfidenceBar } from "../../components/ui/ConfidenceBar";
import { EditItemModal } from "../board/EditItemModal";
import { SourceModal } from "../board/SourceModal";
import { formatDate } from "../../lib/format";
import { cn } from "../../lib/cn";
import type { BoardState } from "../board/useBoard";

interface Props {
  board: BoardState;
  onDone: () => void;
}

export function ReviewView({ board, onDone }: Props) {
  const { meeting, items, patchItem } = board;
  const [editItem, setEditItem] = useState<ActionItem | null>(null);
  const [sourceItem, setSourceItem] = useState<ActionItem | null>(null);
  const [committing, setCommitting] = useState(false);

  const pending = useMemo(() => items.filter((i) => !i.confirmed), [items]);

  const confirmAll = async () => {
    setCommitting(true);
    try {
      await Promise.all(
        pending.map((i) => patchItem(i.id, { confirmed: true }, { silent: true }))
      );
      toast.success(`${pending.length} item${pending.length === 1 ? "" : "s"} committed to the board`);
      onDone();
    } finally {
      setCommitting(false);
    }
  };

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col">
      <div className="border-b border-border px-6 py-5">
        <p className="text-xs font-medium uppercase tracking-wide text-primary">
          Step 2 · Review
        </p>
        <h1 className="mt-1 text-xl font-semibold text-text">
          {meeting?.title ?? "Review action items"}
        </h1>
        <p className="mt-1 text-sm text-muted">
          Confirm, edit, or dismiss each item. High-confidence items are
          pre-confirmed. Only confirmed items land on the board.
        </p>
        {meeting?.tldr && (
          <div className="mt-4 rounded-md border border-border bg-surface-2 p-3 text-sm text-muted">
            {meeting.tldr}
          </div>
        )}
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-6">
        {items.map((item) => (
          <Card
            key={item.id}
            className={cn(
              "p-4 transition-opacity",
              item.confirmed && "border-success/40"
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-text">{item.title}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
                  <span className="inline-flex items-center gap-1.5">
                    <Avatar name={item.owner} /> {item.owner}
                  </span>
                  {item.dueDate && (
                    <Badge>
                      <span className="tnum">{formatDate(item.dueDate)}</span>
                    </Badge>
                  )}
                  <ConfidenceBar value={item.confidence} />
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button variant="ghost" size="sm" aria-label="View source" onClick={() => setSourceItem(item)}>
                  <Quote className="h-4 w-4" aria-hidden />
                </Button>
                <Button variant="ghost" size="sm" aria-label="Edit" onClick={() => setEditItem(item)}>
                  <Pencil className="h-4 w-4" aria-hidden />
                </Button>
                {item.confirmed ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label="Dismiss from board"
                    onClick={() => patchItem(item.id, { confirmed: false }, { silent: true })}
                  >
                    <X className="h-4 w-4" aria-hidden />
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => patchItem(item.id, { confirmed: true }, { silent: true })}
                  >
                    <Check className="h-4 w-4" aria-hidden /> Confirm
                  </Button>
                )}
              </div>
            </div>
            {item.confirmed && (
              <div className="mt-2 flex items-center gap-1 text-xs text-success">
                <Check className="h-3 w-3" aria-hidden /> On the board
              </div>
            )}
          </Card>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-border px-6 py-4">
        <span className="text-sm text-muted">
          <strong className="tnum text-text">
            {items.filter((i) => i.confirmed).length}
          </strong>{" "}
          of <span className="tnum">{items.length}</span> confirmed
        </span>
        <div className="flex gap-2">
          {pending.length > 0 && (
            <Button variant="secondary" onClick={confirmAll} loading={committing}>
              <CheckCheck className="h-4 w-4" aria-hidden /> Confirm all
            </Button>
          )}
          <Button onClick={onDone}>
            Go to board <ArrowRight className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      </div>

      <EditItemModal
        item={editItem}
        onClose={() => setEditItem(null)}
        onSave={(patch) => patchItem(editItem!.id, patch)}
      />
      <SourceModal item={sourceItem} onClose={() => setSourceItem(null)} />
    </div>
  );
}
