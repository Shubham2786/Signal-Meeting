#input_type_name: DraftFollowUpInput
#output_type_name: DraftFollowUpResult
#function_name: draft_follow_up

"""
draft_follow_up — ported from packages/core/src/services/FollowUpService.ts.

Reads a meeting and its action items, prefers confirmed / in-progress / done items,
assembles a brief, and runs the `follow_up_writer` agent to produce a recap draft.
"""

import time
from typing import Optional

from pydantic import BaseModel

from lemma_sdk import FunctionContext, Pod

AGENT_TIMEOUT_SECONDS = 90
POLL_INTERVAL_SECONDS = 1.5
_TERMINAL = {"COMPLETED", "FAILED", "STOPPED"}


class DraftFollowUpInput(BaseModel):
    meeting_id: str


class DraftFollowUpResult(BaseModel):
    draft: str


def _run_agent_text(pod: Pod, agent_name: str, message: str) -> str:
    """Run an agent on a single message and return its final text reply."""
    conversation = pod.agents.run(agent_name, message)
    conv_id = str(conversation.id)

    deadline = time.monotonic() + AGENT_TIMEOUT_SECONDS
    current = None
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
        raise RuntimeError(f"{agent_name} run failed: {error}")
    if status not in _TERMINAL:
        raise TimeoutError(f"{agent_name} did not finish in time.")

    output = getattr(current, "output", None)
    if isinstance(output, str) and output.strip():
        return output.strip()

    messages = pod.conversations.messages(conv_id, limit=100).to_dict().get("items", [])
    for msg in reversed(messages):
        if msg.get("role") == "assistant" and msg.get("text"):
            return str(msg["text"]).strip()
    return ""


def _build_brief(meeting: dict, items: list) -> str:
    lines = [
        f'Meeting: "{meeting.get("title", "")}"',
        f'TL;DR: {meeting.get("tldr") or ""}',
    ]
    decisions = meeting.get("decisions") or []
    if isinstance(decisions, list) and decisions:
        lines.append("Decisions:")
        lines.extend(f"- {d}" for d in decisions)
    lines.append("Action items:")
    if items:
        for i in items:
            owner = i.get("owner") or "Unassigned"
            due = i.get("due_date")
            due_str = f", due {due}" if due else ""
            lines.append(f"- {i.get('title', '')} (owner: {owner}{due_str})")
    else:
        lines.append("- (none)")
    return "\n".join(lines)


async def draft_follow_up(
    ctx: FunctionContext, data: DraftFollowUpInput
) -> DraftFollowUpResult:
    pod = Pod.from_env()

    meeting = pod.table("meetings").get(data.meeting_id)

    all_items = (
        pod.records.list(
            "action_items",
            limit=200,
            filter=[{"field": "meeting_id", "op": "eq", "value": data.meeting_id}],
        )
        .to_dict()
        .get("items", [])
    )

    # Prefer confirmed or already-progressing items; fall back to everything.
    relevant = [
        i for i in all_items if i.get("confirmed") or i.get("status") != "open"
    ]
    items = relevant if relevant else all_items

    brief = _build_brief(meeting, items)
    draft = _run_agent_text(pod, "follow_up_writer", brief)
    return DraftFollowUpResult(draft=draft)
