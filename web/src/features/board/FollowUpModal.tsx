import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Copy, Check } from "lucide-react";
import { api } from "../../lib/api";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { Skeleton } from "../../components/ui/Skeleton";

interface Props {
  meetingId: string | null;
  onClose: () => void;
}

/** AI follow-up draft (recap) with copy-to-clipboard. */
export function FollowUpModal({ meetingId, onClose }: Props) {
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!meetingId) return;
    setLoading(true);
    setError(null);
    setDraft("");
    api.followUp(meetingId).then(
      (d) => {
        setDraft(d);
        setLoading(false);
      },
      (e) => {
        setError(e instanceof Error ? e.message : "Failed to draft follow-up.");
        setLoading(false);
      }
    );
  }, [meetingId]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(draft);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Copy failed");
    }
  };

  return (
    <Modal
      open={!!meetingId}
      onClose={onClose}
      title="Follow-up draft"
      description="A ready-to-send recap generated from the confirmed action items."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button onClick={copy} disabled={loading || !!error}>
            {copied ? (
              <>
                <Check className="h-4 w-4" aria-hidden /> Copied
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" aria-hidden /> Copy
              </>
            )}
          </Button>
        </>
      }
    >
      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      ) : error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : (
        <pre className="whitespace-pre-wrap rounded-md bg-surface-2 p-4 font-sans text-sm text-text">
          {draft}
        </pre>
      )}
    </Modal>
  );
}
