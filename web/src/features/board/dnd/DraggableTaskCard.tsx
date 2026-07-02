import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { ActionItem, Status } from "../../../lib/types";
import { ActionItemCard } from "../ActionItemCard";
import { DropIndicator } from "./DropIndicator";

interface Props {
  item: ActionItem;
  selected?: boolean;
  githubEnabled?: boolean;
  duplicate?: boolean;
  showIndicator?: boolean;
  onSelect?: () => void;
  onStatus: (status: Status) => void;
  onEdit: () => void;
  onShowSource: () => void;
  onCreateIssue: () => void;
}

/**
 * A sortable task card. The WHOLE card is the drag handle (Jira-style) — grab it
 * anywhere except on an action button. Keyboard: focus the card and press Space to
 * pick up, arrows to move, Enter to drop, Escape to cancel.
 */
export function DraggableTaskCard({ item, showIndicator, ...cardProps }: Props) {
  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id, data: { type: "item", status: item.status } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    // Let vertical scroll pass through on touch until the press-delay engages a drag.
    touchAction: "manipulation" as const,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="cursor-grab rounded-lg outline-none focus-visible:outline-focus active:cursor-grabbing"
      aria-roledescription="Draggable task"
    >
      <DropIndicator visible={!!showIndicator} />
      <ActionItemCard item={item} isDragging={isDragging} {...cardProps} />
    </div>
  );
}
