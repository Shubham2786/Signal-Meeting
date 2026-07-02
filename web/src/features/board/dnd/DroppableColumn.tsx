import type { ReactNode } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { motion, AnimatePresence } from "framer-motion";
import type { Status } from "../../../lib/types";
import { STATUS_LABELS } from "../../../lib/types";
import { Badge } from "../../../components/ui/Badge";
import { cn } from "../../../lib/cn";

interface Props {
  status: Status;
  itemIds: string[];
  count: number;
  /** True while any card is being dragged (highlights valid targets). */
  isDraggingActive: boolean;
  /** True when a card is currently hovering this column. */
  isOver: boolean;
  children: ReactNode;
}

const dotTone: Record<Status, string> = {
  open: "bg-muted/60",
  in_progress: "bg-primary",
  done: "bg-success",
};

/**
 * A droppable status column. Highlights as a valid target while dragging and
 * shows a "Drop here" affordance + darker background when hovered.
 */
export function DroppableColumn({
  status,
  itemIds,
  count,
  isDraggingActive,
  isOver,
  children,
}: Props) {
  const { setNodeRef } = useDroppable({ id: status, data: { type: "column", status } });

  return (
    <section aria-label={STATUS_LABELS[status]} className="flex min-w-0 flex-col">
      <div className="mb-3 flex items-center justify-between px-0.5">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-text">
          <span className={cn("h-2 w-2 rounded-full", dotTone[status])} aria-hidden />
          {STATUS_LABELS[status]}
        </h2>
        <Badge>{count}</Badge>
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          "relative flex flex-1 flex-col gap-3 rounded-xl border p-2 transition-colors duration-200",
          isDraggingActive
            ? "border-dashed border-primary/40 bg-surface/40"
            : "border-transparent",
          isOver && "border-solid border-primary bg-primary/5"
        )}
      >
        <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
          {children}
        </SortableContext>

        {/* Empty / drop affordance */}
        <AnimatePresence>
          {isOver && itemIds.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-primary/50 py-8 text-xs font-medium text-primary"
            >
              Drop here
            </motion.div>
          )}
        </AnimatePresence>

        {!isDraggingActive && itemIds.length === 0 && (
          <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-xs text-muted">
            Nothing here yet
          </div>
        )}
      </div>
    </section>
  );
}
