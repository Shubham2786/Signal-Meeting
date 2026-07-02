import type { ActionItem } from "../../lib/types";
import { Modal } from "../../components/ui/Modal";

interface Props {
  item: ActionItem | null;
  onClose: () => void;
}

/** Source traceability — reveals the verbatim transcript quote. */
export function SourceModal({ item, onClose }: Props) {
  return (
    <Modal
      open={!!item}
      onClose={onClose}
      title="Source traceability"
      description="The exact transcript snippet this item was extracted from."
    >
      {item && (
        <div className="space-y-4">
          <p className="text-sm font-medium text-text">{item.title}</p>
          <blockquote className="border-l-2 border-primary bg-surface-2 px-4 py-3 text-sm italic text-muted">
            “{item.sourceQuote || "No source quote captured."}”
          </blockquote>
        </div>
      )}
    </Modal>
  );
}
