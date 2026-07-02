import { useRef, useState } from "react";
import { toast } from "sonner";
import { FileText, Mic, Sparkles, Upload, Trash2 } from "lucide-react";
import type { MeetingWithItems } from "../../lib/types";
import { api, ApiError } from "../../lib/api";
import { Button } from "../../components/ui/Button";
import { Textarea } from "../../components/ui/Textarea";
import { Input } from "../../components/ui/Input";
import { Card } from "../../components/ui/Card";
import { useLocalDraft } from "../../lib/hooks";
import { cn } from "../../lib/cn";

interface Props {
  onCreated: (meeting: MeetingWithItems) => void;
}

type Tab = "text" | "audio";

export function SubmitView({ onCreated }: Props) {
  const [tab, setTab] = useState<Tab>("text");
  const [title, setTitle] = useState("");
  const { value: transcript, setValue: setTranscript, clear } = useLocalDraft(
    "signal-draft-transcript"
  );
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [audioName, setAudioName] = useState<string | null>(null);

  const submitText = async () => {
    if (!transcript.trim()) {
      toast.error("Paste a transcript first.");
      return;
    }
    setSubmitting(true);
    try {
      const meeting = await api.createMeeting(transcript.trim(), title.trim() || undefined);
      clear();
      setTitle("");
      onCreated(meeting);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Extraction failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const submitAudio = async (file: File) => {
    setSubmitting(true);
    setAudioName(file.name);
    try {
      const meeting = await api.transcribeAudio(file);
      onCreated(meeting);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Audio processing failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col overflow-y-auto p-6">
      <p className="text-xs font-medium uppercase tracking-wide text-primary">
        Step 1 · Submit
      </p>
      <h1 className="mt-1 text-xl font-semibold text-text">New meeting</h1>
      <p className="mt-1 text-sm text-muted">
        Paste a transcript or upload audio. Signal extracts owner-assigned,
        deadline-tracked action items for you to review.
      </p>

      {/* Tabs */}
      <div
        className="mt-6 inline-flex rounded-lg border border-border bg-surface p-1"
        role="tablist"
        aria-label="Intake method"
      >
        {(["text", "audio"] as Tab[]).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={cn(
              "inline-flex items-center gap-2 rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
              tab === t
                ? "bg-primary text-primary-fg"
                : "text-muted hover:text-text"
            )}
          >
            {t === "text" ? (
              <FileText className="h-4 w-4" aria-hidden />
            ) : (
              <Mic className="h-4 w-4" aria-hidden />
            )}
            {t === "text" ? "Paste text" : "Upload audio"}
          </button>
        ))}
      </div>

      {tab === "text" ? (
        <div className="mt-5 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-text">
              Title <span className="text-muted">(optional)</span>
            </span>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Q3 Launch Planning"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 flex items-center justify-between text-sm font-medium text-text">
              <span>Transcript</span>
              {transcript && (
                <button
                  onClick={clear}
                  className="inline-flex items-center gap-1 text-xs font-normal text-muted hover:text-danger"
                >
                  <Trash2 className="h-3 w-3" aria-hidden /> Clear draft
                </button>
              )}
            </span>
            <Textarea
              rows={12}
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Paste your meeting transcript here…"
            />
          </label>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted">
              Draft autosaves locally. Nothing leaves your machine until you extract.
            </span>
            <Button onClick={submitText} loading={submitting}>
              <Sparkles className="h-4 w-4" aria-hidden /> Extract action items
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-5">
          <Card
            className="flex flex-col items-center justify-center border-dashed p-10 text-center"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files?.[0];
              if (f) void submitAudio(f);
            }}
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Upload className="h-6 w-6" aria-hidden />
            </div>
            <p className="text-sm font-medium text-text">
              {audioName ?? "Drop an audio file or click to browse"}
            </p>
            <p className="mt-1 text-xs text-muted">
              MP3, WAV, M4A · up to 25MB
            </p>
            <input
              ref={fileRef}
              type="file"
              accept="audio/*"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void submitAudio(f);
              }}
            />
            <Button
              className="mt-5"
              variant="secondary"
              onClick={() => fileRef.current?.click()}
              loading={submitting}
            >
              <Mic className="h-4 w-4" aria-hidden /> Choose audio file
            </Button>
          </Card>
          <p className="mt-3 text-center text-xs text-muted">
            In Stub mode, audio uses a bundled sample transcript so the flow is
            demoable without a key.
          </p>
        </div>
      )}
    </div>
  );
}
