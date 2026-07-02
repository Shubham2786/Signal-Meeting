#input_type_name: ExportMarkdownInput
#output_type_name: ExportMarkdownResult
#function_name: export_markdown

"""export_markdown — ported from packages/core/src/export.ts (toMarkdown).
Renders a meeting's action items as a Markdown checklist."""

from pydantic import BaseModel

from lemma_sdk import FunctionContext, Pod


class ExportMarkdownInput(BaseModel):
    meeting_id: str


class ExportMarkdownResult(BaseModel):
    markdown: str


def _load(pod: Pod, meeting_id: str):
    meeting = pod.table("meetings").get(meeting_id)
    items = (
        pod.records.list(
            "action_items",
            limit=500,
            filter=[{"field": "meeting_id", "op": "eq", "value": meeting_id}],
            sort=[{"field": "created_at", "direction": "asc"}],
        )
        .to_dict()
        .get("items", [])
    )
    return meeting, items


async def export_markdown(
    ctx: FunctionContext, data: ExportMarkdownInput
) -> ExportMarkdownResult:
    pod = Pod.from_env()
    meeting, items = _load(pod, data.meeting_id)

    lines = [f"# {meeting.get('title', '')}", ""]
    if meeting.get("tldr"):
        lines.append(f"**TL;DR:** {meeting['tldr']}")
        lines.append("")
    decisions = meeting.get("decisions") or []
    if isinstance(decisions, list) and decisions:
        lines.append("## Decisions")
        lines.extend(f"- {d}" for d in decisions)
        lines.append("")
    lines.append("## Action items")
    if not items:
        lines.append("_No action items._")
    else:
        for i in items:
            check = "x" if i.get("status") == "done" else " "
            due = f" _(due {i['due_date']})_" if i.get("due_date") else ""
            owner_val = i.get("owner")
            owner = f" — **{owner_val}**" if owner_val and owner_val != "Unassigned" else ""
            lines.append(f"- [{check}] {i.get('title', '')}{owner}{due}")
    lines.append("")

    return ExportMarkdownResult(markdown="\n".join(lines))
