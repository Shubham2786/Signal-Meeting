import { useEffect, useState } from "react";
import type { ActionItem, Status } from "../../lib/types";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Textarea } from "../../components/ui/Textarea";

interface Props {
  item: ActionItem | null;
  onClose: () => void;
  onSave: (patch: Partial<ActionItem>) => Promise<void> | void;
}

export function EditItemModal({ item, onClose, onSave }: Props) {
  const [title, setTitle] = useState("");
  const [owner, setOwner] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [status, setStatus] = useState<Status>("open");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (item) {
      setTitle(item.title);
      setOwner(item.owner);
      setDueDate(item.dueDate ?? "");
      setFollowUp(item.followUp ?? "");
      setStatus(item.status);
    }
  }, [item]);

  const save = async () => {
    setSaving(true);
    try {
      await onSave({
        title: title.trim(),
        owner: owner.trim() || "Unassigned",
        dueDate: dueDate.trim() || null,
        followUp: followUp.trim() || null,
        status,
        confirmed: true,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={!!item}
      onClose={onClose}
      title="Edit action item"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} loading={saving}>
            Save changes
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-text">Title</span>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-text">Owner</span>
            <Input value={owner} onChange={(e) => setOwner(e.target.value)} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-text">
              Due date
            </span>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </label>
        </div>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-text">Status</span>
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value as Status)}
            options={[
              { value: "open", label: "Open" },
              { value: "in_progress", label: "In Progress" },
              { value: "done", label: "Done" },
            ]}
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-text">
            Follow-up
          </span>
          <Textarea
            rows={2}
            value={followUp}
            onChange={(e) => setFollowUp(e.target.value)}
            placeholder="Suggested next step"
          />
        </label>
      </div>
    </Modal>
  );
}
