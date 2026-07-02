import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { DndContext, DragOverlay } from "@dnd-kit/core";
import {
  Search,
  ListChecks,
  Send,
  FileDown,
  Calendar,
  ClipboardCheck,
  Inbox,
  AlarmClock,
} from "lucide-react";
import type { ActionItem, Status } from "../../lib/types";
import { STATUS_ORDER } from "../../lib/types";
import { api } from "../../lib/api";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { EmptyState } from "../../components/ui/EmptyState";
import { CardSkeleton } from "../../components/ui/Skeleton";
import { TooltipIconButton } from "../../components/ui/TooltipIconButton";
import { Tooltip } from "../../components/ui/Tooltip";
import { ActionItemCard } from "./ActionItemCard";
import { EditItemModal } from "./EditItemModal";
import { SourceModal } from "./SourceModal";
import { FollowUpModal } from "./FollowUpModal";
import { DraggableTaskCard } from "./dnd/DraggableTaskCard";
import { DroppableColumn } from "./dnd/DroppableColumn";
import { useKanbanDnd } from "./dnd/useKanbanDnd";
import { isOverdue } from "../../lib/format";
import type { BoardState } from "./useBoard";

interface Props {
  board: BoardState;
  githubEnabled: boolean;
  onReview: () => void;
}

const noop = () => {};

export function BoardView({ board, githubEnabled, onReview }: Props) {
  const { meeting, items, loading, patchItem } = board;
  const [search, setSearch] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [sort, setSort] = useState<"dueDate" | "confidence" | "createdAt">("createdAt");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editItem, setEditItem] = useState<ActionItem | null>(null);
  const [sourceItem, setSourceItem] = useState<ActionItem | null>(null);
  const [followUpOpen, setFollowUpOpen] = useState(false);

  useEffect(() => {
    const open = () => setFollowUpOpen(true);
    window.addEventListener("signal:followup", open);
    return () => window.removeEventListener("signal:followup", open);
  }, []);

  const confirmed = useMemo(() => items.filter((i) => i.confirmed), [items]);
  const needsReview = useMemo(() => items.filter((i) => !i.confirmed).length, [items]);
  const owners = useMemo(
    () => Array.from(new Set(confirmed.map((i) => i.owner))).sort(),
    [confirmed]
  );

  const filtered = useMemo(() => {
    let list = confirmed;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (i) => i.title.toLowerCase().includes(q) || i.owner.toLowerCase().includes(q)
      );
    }
    if (ownerFilter !== "all") list = list.filter((i) => i.owner === ownerFilter);
    if (overdueOnly) list = list.filter((i) => i.status !== "done" && isOverdue(i.dueDate));
    return [...list].sort((a, b) => {
      if (sort === "dueDate") {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return a.dueDate.localeCompare(b.dueDate);
      }
      if (sort === "confidence") return b.confidence - a.confidence;
      return a.createdAt.localeCompare(b.createdAt);
    });
  }, [confirmed, search, ownerFilter, overdueOnly, sort]);

  const progress = useMemo(() => {
    if (confirmed.length === 0) return 0;
    return Math.round(
      (confirmed.filter((i) => i.status === "done").length / confirmed.length) * 100
    );
  }, [confirmed]);

  // Persist status change from a drop (optimistic + toast + undo, filters preserved).
  const commitStatus = (id: string, status: Status) =>
    void patchItem(id, { status }, { undo: true });

  const dnd = useKanbanDnd(filtered, commitStatus);

  const createIssue = async (item: ActionItem) => {
    try {
      const issue = await api.githubIssue(item.id);
      toast.success(`Issue #${issue.number} created`, {
        action: { label: "Open", onClick: () => window.open(issue.url, "_blank") },
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "GitHub issue failed.");
    }
  };

  // Keyboard shortcuts (j/k navigate, e edit, 1/2/3 status) — complements DnD.
  const flatRef = useRef<ActionItem[]>([]);
  flatRef.current = filtered;
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const list = flatRef.current;
      if (list.length === 0) return;
      const curIdx = list.findIndex((i) => i.id === selectedId);
      if (e.key === "j") setSelectedId((list[Math.min(curIdx + 1, list.length - 1)] ?? list[0]).id);
      else if (e.key === "k") setSelectedId((list[Math.max(curIdx - 1, 0)] ?? list[0]).id);
      else if (selectedId) {
        const item = list.find((i) => i.id === selectedId);
        if (!item) return;
        if (e.key === "e") setEditItem(item);
        else if (e.key === "1") void patchItem(item.id, { status: "open" }, { undo: true });
        else if (e.key === "2") void patchItem(item.id, { status: "in_progress" }, { undo: true });
        else if (e.key === "3") void patchItem(item.id, { status: "done" }, { undo: true });
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedId, patchItem]);

  if (!meeting && !loading) {
    return (
      <div className="p-8">
        <EmptyState
          icon={Inbox}
          title="No meeting selected"
          description="Pick a meeting from history, or submit a new transcript to get started."
        />
      </div>
    );
  }

  const cardActions = (item: ActionItem) => ({
    selected: item.id === selectedId,
    githubEnabled,
    duplicate: !!item.duplicateOf,
    onSelect: () => setSelectedId(item.id),
    onStatus: (s: Status) => patchItem(item.id, { status: s }, { undo: true }),
    onEdit: () => setEditItem(item),
    onShowSource: () => setSourceItem(item),
    onCreateIssue: () => createIssue(item),
  });

  return (
    <div className="flex h-full flex-col">
      {/* Meeting header */}
      <div className="border-b border-border px-6 py-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-xl font-semibold text-text">
                {meeting?.title ?? "Loading…"}
              </h1>
              {meeting?.sourceType === "audio" && <Badge tone="primary">Audio</Badge>}
            </div>
            {meeting?.tldr && (
              <p className="mt-1.5 max-w-2xl text-sm text-muted">{meeting.tldr}</p>
            )}
            {meeting && meeting.decisions.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-2">
                {meeting.decisions.map((d, i) => (
                  <li key={i}>
                    <Badge tone="success">
                      <ClipboardCheck className="h-3 w-3" aria-hidden /> {d}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {meeting && (
              <Tooltip label="Percent of confirmed items done">
                <div className="flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5">
                  <div className="h-1.5 w-16 overflow-hidden rounded-full bg-surface-2">
                    <div
                      className="h-full rounded-full bg-success transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <span className="tnum text-xs font-medium text-muted">{progress}%</span>
                </div>
              </Tooltip>
            )}
            <Button variant="secondary" size="sm" onClick={() => setFollowUpOpen(true)}>
              <Send className="h-4 w-4" aria-hidden /> Follow-up
            </Button>
            {meeting && (
              <>
                <TooltipIconButton
                  label="Export as Markdown"
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open(api.exportMarkdownUrl(meeting.id), "_blank")}
                >
                  <FileDown className="h-4 w-4" aria-hidden />
                </TooltipIconButton>
                <TooltipIconButton
                  label="Export deadlines (.ics)"
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open(api.exportIcsUrl(meeting.id), "_blank")}
                >
                  <Calendar className="h-4 w-4" aria-hidden />
                </TooltipIconButton>
              </>
            )}
          </div>
        </div>

        {needsReview > 0 && (
          <div className="mt-4 flex items-center justify-between rounded-md border border-warning/30 bg-warning/10 px-4 py-2.5">
            <span className="text-sm text-text">
              <strong className="tnum">{needsReview}</strong> item
              {needsReview > 1 ? "s" : ""} need your review before they hit the board.
            </span>
            <Button size="sm" onClick={onReview}>
              <ListChecks className="h-4 w-4" aria-hidden /> Review now
            </Button>
          </div>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-6 py-3">
        <div className="relative min-w-48 flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
          <Input
            className="h-9 pl-8"
            placeholder="Search items or owners…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search action items"
          />
        </div>
        <Select
          className="w-40"
          aria-label="Filter by owner"
          value={ownerFilter}
          onChange={(e) => setOwnerFilter(e.target.value)}
          options={[
            { value: "all", label: "All owners" },
            ...owners.map((o) => ({ value: o, label: o })),
          ]}
        />
        <Select
          className="w-40"
          aria-label="Sort by"
          value={sort}
          onChange={(e) => setSort(e.target.value as typeof sort)}
          options={[
            { value: "createdAt", label: "Sort: Default" },
            { value: "dueDate", label: "Sort: Due date" },
            { value: "confidence", label: "Sort: Confidence" },
          ]}
        />
        <Tooltip label={overdueOnly ? "Showing overdue only" : "Filter to overdue"}>
          <Button
            variant={overdueOnly ? "primary" : "secondary"}
            size="sm"
            onClick={() => setOverdueOnly((v) => !v)}
            aria-pressed={overdueOnly}
          >
            <AlarmClock className="h-4 w-4" aria-hidden /> Overdue
          </Button>
        </Tooltip>
      </div>

      {/* Columns */}
      {loading ? (
        <div className="grid flex-1 grid-cols-1 gap-4 overflow-y-auto p-6 md:grid-cols-3">
          {STATUS_ORDER.map((s) => (
            <div key={s} className="flex flex-col gap-3">
              <CardSkeleton />
              <CardSkeleton />
            </div>
          ))}
        </div>
      ) : (
        <DndContext
          sensors={dnd.sensors}
          collisionDetection={dnd.collisionDetection}
          accessibility={{ announcements: dnd.announcements }}
          onDragStart={dnd.onDragStart}
          onDragOver={dnd.onDragOver}
          onDragEnd={dnd.onDragEnd}
          onDragCancel={dnd.onDragCancel}
        >
          <div className="grid flex-1 grid-cols-1 items-start gap-4 overflow-y-auto p-6 md:grid-cols-3">
            {dnd.columns.map((status) => {
              const ids = dnd.containers[status];
              return (
                <DroppableColumn
                  key={status}
                  status={status}
                  itemIds={ids}
                  count={ids.length}
                  isDraggingActive={!!dnd.activeId}
                  isOver={dnd.overColumn === status}
                >
                  {ids.map((id) => {
                    const item = dnd.itemsById.get(id);
                    if (!item) return null;
                    return (
                      <DraggableTaskCard
                        key={id}
                        item={item}
                        showIndicator={
                          !!dnd.activeId && dnd.overId === id && id !== dnd.activeId
                        }
                        {...cardActions(item)}
                      />
                    );
                  })}
                </DroppableColumn>
              );
            })}
          </div>

          <DragOverlay dropAnimation={{ duration: 220, easing: "cubic-bezier(0.16, 1, 0.3, 1)" }}>
            {dnd.activeItem ? (
              <div className="w-[336px] max-w-[80vw]">
                <ActionItemCard
                  item={dnd.activeItem}
                  isOverlay
                  githubEnabled={githubEnabled}
                  duplicate={!!dnd.activeItem.duplicateOf}
                  onStatus={noop}
                  onEdit={noop}
                  onShowSource={noop}
                  onCreateIssue={noop}
                />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      <EditItemModal
        item={editItem}
        onClose={() => setEditItem(null)}
        onSave={(patch) => patchItem(editItem!.id, patch)}
      />
      <SourceModal item={sourceItem} onClose={() => setSourceItem(null)} />
      <FollowUpModal
        meetingId={followUpOpen && meeting ? meeting.id : null}
        onClose={() => setFollowUpOpen(false)}
      />
    </div>
  );
}
