#input_type_name: SubmitTranscriptInput
#output_type_name: SubmitTranscriptResult
#function_name: submit_transcript

"""
submit_transcript — the core orchestration of Signal Meetings, ported from
packages/core/src/services/ExtractionService.ts to a Lemma pod function.

Pipeline:
  1. Run the `extractor` agent to get structured {tldr, decisions, actionItems}.
  2. Normalize each action item's deadline to an ISO date (natural-language parse).
  3. Auto-confirm high-confidence items (>= 0.8).
  4. Flag near-duplicate items (Jaccard similarity over titles).
  5. Persist the meeting + action items to the pod tables.

Runs as the invoking user (delegated identity); writes to shared tables.
"""

import json
import re
import time
from datetime import date, datetime, timedelta, timezone
from typing import Optional

from pydantic import BaseModel

from lemma_sdk import FunctionContext, Pod

# --------------------------------------------------------------------------- #
# Config
# --------------------------------------------------------------------------- #
AUTO_CONFIRM_CONFIDENCE = 0.8
DUPLICATE_THRESHOLD = 0.8
AGENT_TIMEOUT_SECONDS = 90
POLL_INTERVAL_SECONDS = 1.5
_TERMINAL = {"COMPLETED", "FAILED", "STOPPED"}


# --------------------------------------------------------------------------- #
# Natural-language date parsing (ported from packages/core/src/date.ts)
# --------------------------------------------------------------------------- #
_WEEKDAYS = {
    "sunday": 6,
    "monday": 0,
    "tuesday": 1,
    "wednesday": 2,
    "thursday": 3,
    "friday": 4,
    "saturday": 5,
}


def _iso(d: date) -> str:
    return d.strftime("%Y-%m-%d")


def parse_natural_date(value: Optional[str], reference: date) -> Optional[str]:
    """Resolve 'next Friday', 'tomorrow', 'in 3 days', 'end of month', ISO, …
    relative to `reference`. Returns YYYY-MM-DD or None."""
    if not value:
        return None
    raw = value.strip().lower()
    if raw == "" or raw in ("null", "none"):
        return None

    # Already ISO (with or without a time component).
    if re.match(r"^\d{4}-\d{2}-\d{2}$", raw):
        return raw
    iso_match = re.match(r"^(\d{4}-\d{2}-\d{2})[t ]", raw)
    if iso_match:
        return iso_match.group(1)

    if raw == "today":
        return _iso(reference)
    if raw == "tomorrow":
        return _iso(reference + timedelta(days=1))
    if raw == "yesterday":
        return _iso(reference - timedelta(days=1))

    # "in N day(s)/week(s)"
    in_match = re.match(r"^in\s+(\d+)\s+(day|days|week|weeks)$", raw)
    if in_match:
        n = int(in_match.group(1))
        mult = 7 if in_match.group(2).startswith("week") else 1
        return _iso(reference + timedelta(days=n * mult))

    # "end of week" / "end of month"
    if raw in ("end of week", "eow"):
        delta = (4 - reference.weekday() + 7) % 7  # upcoming Friday (Mon=0)
        return _iso(reference + timedelta(days=delta))
    if raw in ("end of month", "eom"):
        first_next = (reference.replace(day=1) + timedelta(days=32)).replace(day=1)
        return _iso(first_next - timedelta(days=1))

    # "next <weekday>" / "this <weekday>" / bare "<weekday>"
    wd_match = re.match(r"^(next|this)?\s*([a-z]+)$", raw)
    if wd_match:
        target = _WEEKDAYS.get(wd_match.group(2))
        if target is not None:
            cur = reference.weekday()
            delta = (target - cur + 7) % 7
            if delta == 0:
                delta = 7  # always future
            return _iso(reference + timedelta(days=delta))

    # Fallback: let the date parser try a few common formats.
    for fmt in ("%Y-%m-%d", "%m/%d/%Y", "%d/%m/%Y", "%B %d, %Y", "%b %d, %Y", "%d %B %Y"):
        try:
            return _iso(datetime.strptime(value.strip(), fmt).date())
        except ValueError:
            continue
    return None


# --------------------------------------------------------------------------- #
# Duplicate detection (ported from services/DuplicateDetector.ts)
# --------------------------------------------------------------------------- #
def _tokenize(s: str) -> set:
    cleaned = re.sub(r"[^a-z0-9\s]", " ", s.lower())
    return {t for t in cleaned.split() if len(t) > 2}


def _similarity(a: str, b: str) -> float:
    ta, tb = _tokenize(a), _tokenize(b)
    if not ta or not tb:
        return 0.0
    inter = len(ta & tb)
    union = len(ta) + len(tb) - inter
    return 0.0 if union == 0 else inter / union


# --------------------------------------------------------------------------- #
# Contract
# --------------------------------------------------------------------------- #
class SubmitTranscriptInput(BaseModel):
    transcript: str
    title: Optional[str] = None
    source_type: str = "text"


class SubmitTranscriptResult(BaseModel):
    meeting_id: str
    action_item_count: int
    tldr: str


# --------------------------------------------------------------------------- #
# Helpers
# --------------------------------------------------------------------------- #
def _derive_title(transcript: str, provided: Optional[str]) -> str:
    if provided and provided.strip():
        return provided.strip()
    for line in transcript.split("\n"):
        stripped = line.strip()
        if stripped:
            return stripped[:77] + "…" if len(stripped) > 80 else stripped
    return "Untitled meeting"


def _safe_json(text: str) -> dict:
    try:
        return json.loads(text)
    except Exception:
        match = re.search(r"\{[\s\S]*\}", text or "")
        if match:
            try:
                return json.loads(match.group(0))
            except Exception:
                pass
    return {}


def _run_extractor(pod: Pod, transcript: str) -> dict:
    """Run the `extractor` agent and return its structured output dict."""
    conversation = pod.agents.run("extractor", transcript)
    conv_id = str(conversation.id)

    deadline = time.monotonic() + AGENT_TIMEOUT_SECONDS
    status = None
    while time.monotonic() < deadline:
        current = pod.conversations.get(conv_id)
        raw_status = getattr(current, "last_run_status", None)
        status = getattr(raw_status, "value", raw_status)
        if status in _TERMINAL:
            break
        time.sleep(POLL_INTERVAL_SECONDS)

    if status == "FAILED":
        error = getattr(current, "last_run_error", None) or "unknown error"
        raise RuntimeError(f"Extractor agent run failed: {error}")
    if status not in _TERMINAL:
        raise TimeoutError("Extractor agent did not finish in time.")

    # Prefer the structured output_schema result on the conversation.
    output = getattr(current, "output", None)
    if isinstance(output, dict) and output:
        return output
    if isinstance(output, str) and output.strip():
        return _safe_json(output)

    # Fallback: parse the final assistant text message as JSON.
    messages = pod.conversations.messages(conv_id, limit=100).to_dict().get("items", [])
    for msg in reversed(messages):
        if msg.get("role") == "assistant" and msg.get("text"):
            parsed = _safe_json(msg["text"])
            if parsed:
                return parsed
    return {}


# --------------------------------------------------------------------------- #
# Entrypoint
# --------------------------------------------------------------------------- #
async def submit_transcript(
    ctx: FunctionContext, data: SubmitTranscriptInput
) -> SubmitTranscriptResult:
    pod = Pod.from_env()
    today = datetime.now(timezone.utc).date()

    extraction = _run_extractor(pod, data.transcript)
    tldr = str(extraction.get("tldr") or "")
    decisions = extraction.get("decisions") or []
    if not isinstance(decisions, list):
        decisions = []
    raw_items = extraction.get("actionItems") or []
    if not isinstance(raw_items, list):
        raw_items = []

    # 1. Persist the meeting.
    source_type = data.source_type if data.source_type in ("text", "audio") else "text"
    meeting = pod.table("meetings").create(
        {
            "title": _derive_title(data.transcript, data.title),
            "transcript": data.transcript,
            "source_type": source_type,
            "tldr": tldr,
            "decisions": decisions,
        }
    )
    meeting_id = str(meeting["id"])

    # 2. Normalize + persist action items, flagging duplicates as we go.
    created = []  # (id, title) of rows already written this batch
    count = 0
    for raw in raw_items:
        if not isinstance(raw, dict):
            continue
        title = str(raw.get("title") or "").strip()
        if not title:
            continue

        try:
            confidence = float(raw.get("confidence", 0.5))
        except (TypeError, ValueError):
            confidence = 0.5
        confidence = max(0.0, min(1.0, confidence))

        owner = str(raw.get("owner") or "").strip() or "Unassigned"
        due_date = parse_natural_date(raw.get("dueDate"), today)
        follow_up = str(raw.get("followUp") or "").strip() or None
        source_quote = str(raw.get("sourceQuote") or "").strip()

        row = {
            "meeting_id": meeting_id,
            "title": title,
            "owner": owner,
            "due_date": due_date,
            "follow_up": follow_up,
            "source_quote": source_quote,
            "confidence": confidence,
            "status": "open",
            # Auto-triage: high-confidence items are pre-confirmed for the reviewer.
            "confirmed": confidence >= AUTO_CONFIRM_CONFIDENCE,
            "duplicate_of": None,
        }

        # Flag against earlier items in this batch.
        for prior_id, prior_title in created:
            if _similarity(title, prior_title) >= DUPLICATE_THRESHOLD:
                row["duplicate_of"] = prior_id
                break

        record = pod.table("action_items").create(row)
        created.append((str(record["id"]), title))
        count += 1

    return SubmitTranscriptResult(
        meeting_id=meeting_id, action_item_count=count, tldr=tldr
    )
